// Data access for Supabase `public.tasks`.
//
// This is the only file that knows the table's column names. It converts
// database rows (snake_case, UTC timestamps) to the app's `Task` model
// (camelCase, local calendar dates) and back. Row Level Security limits every
// query to the signed-in user's own rows (auth.uid() = user_id); writes are
// additionally filtered by the verified user id.
//
// The payload builders (buildTaskInsert / buildTaskUpdate) are pure functions
// so the exact values sent to the database can be unit tested.
import type { PostgrestError } from "@supabase/supabase-js";
import { dueDateToTimestamp, timestampToLocalDate, timestampToLocalDateTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import type { ISODate, NewTaskInput, Priority, Task, TaskStatus } from "@/lib/types";

/** A row of public.tasks, limited to the columns this app reads. */
export interface TaskRow {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/** Columns the app writes on insert. */
export interface TaskInsert {
  user_id: string;
  title: string;
  /** `text not null default ''` — must never be null. */
  description: string;
  priority: Priority;
  status: TaskStatus;
  due_at: string | null;
}

/** Columns the app writes on update. Omitted keys are left unchanged in the database. */
export type TaskUpdate = Partial<Pick<TaskInsert, "title" | "description" | "priority" | "status" | "due_at">> & {
  completed_at?: string | null;
  updated_at: string;
};

/** Everything the edit form can change. */
export interface TaskChanges {
  title: string;
  notes?: string;
  priority: Priority;
  /** Calendar day, or undefined to clear the due date. */
  dueDate?: ISODate;
  status: TaskStatus;
}

const COLUMNS = "id, user_id, project_id, title, description, status, priority, due_at, completed_at, created_at";

const STATUSES: readonly TaskStatus[] = ["todo", "in_progress", "done", "cancelled"];
const PRIORITIES: readonly Priority[] = ["low", "medium", "high", "urgent"];

/** Error with a message that is safe and useful to show in the UI. */
export class TaskDataError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "TaskDataError";
  }
}

/** Turns a Supabase/Postgres error into a sentence the user can act on. */
export function describeTaskError(action: string, error: Partial<PostgrestError> | Error | null): string {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return `Couldn't ${action} — you appear to be offline.`;
  const code = error && "code" in error ? error.code : undefined;
  switch (code) {
    case "23502": // not_null_violation
      return `Couldn't ${action} — a required field was missing. Please check the form and try again.`;
    case "23514": // check_violation
    case "22P02": // invalid_text_representation (e.g. an unknown enum value)
      return `Couldn't ${action} — one of the values isn't allowed.`;
    case "22001": // string_data_right_truncation
      return `Couldn't ${action} — the title or notes are too long.`;
    case "42501": // insufficient_privilege (RLS)
      return `Couldn't ${action} — you don't have permission. Try signing in again.`;
    case "PGRST116": // .single() matched no rows
      return `Couldn't ${action} — the task no longer exists. It may have been deleted.`;
  }
  if (error && "message" in error && /fetch|network/i.test(error.message ?? "")) {
    return `Couldn't ${action} — the server couldn't be reached. Check your connection and try again.`;
  }
  return `Couldn't ${action}. Please try again.`;
}

function fail(action: string, error: PostgrestError | Error | null): never {
  // Log the technical detail for debugging; show the user a plain sentence.
  console.error(`[tasks] ${action} failed`, error);
  throw new TaskDataError(describeTaskError(action, error), error);
}

/** Optional notes are stored as '' (never null); whitespace-only counts as empty. */
export function normalizeNotes(notes: string | null | undefined): string {
  return (notes ?? "").trim();
}

export function rowToTask(row: TaskRow): Task {
  const notes = normalizeNotes(row.description);
  return {
    id: row.id,
    title: row.title,
    notes: notes || undefined,
    // Unknown values (e.g. a future enum addition) fall back instead of crashing the UI.
    status: STATUSES.includes(row.status) ? row.status : "todo",
    priority: PRIORITIES.includes(row.priority) ? row.priority : "medium",
    dueDate: row.due_at ? timestampToLocalDate(row.due_at) : undefined,
    projectId: row.project_id ?? undefined,
    createdAt: timestampToLocalDateTime(row.created_at),
    completedAt: row.completed_at ? timestampToLocalDateTime(row.completed_at) : undefined,
  };
}

export function buildTaskInsert(userId: string, input: NewTaskInput): TaskInsert {
  return {
    user_id: userId,
    title: input.title.trim(),
    description: normalizeNotes(input.notes),
    priority: input.priority,
    status: "todo",
    due_at: input.dueDate ? dueDateToTimestamp(input.dueDate) : null,
    // project_id is deliberately never sent: projects still live in local
    // sample data, so their ids don't exist in public.projects.
  };
}

/**
 * Builds the update for an edit, sending only what changed.
 * - completed_at is set when a task becomes done, cleared when it stops being
 *   done, and left alone if it was already done (keeps the original time).
 * - due_at is only sent when the calendar day changed, so a time set elsewhere
 *   (e.g. in the Supabase dashboard) isn't overwritten by an unrelated edit.
 * - updated_at is always set.
 */
export function buildTaskUpdate(previous: Task, changes: TaskChanges, now: Date = new Date()): TaskUpdate {
  const nowIso = now.toISOString();
  const update: TaskUpdate = { updated_at: nowIso };

  const title = changes.title.trim();
  if (title !== previous.title) update.title = title;

  const description = normalizeNotes(changes.notes);
  if (description !== normalizeNotes(previous.notes)) update.description = description;

  if (changes.priority !== previous.priority) update.priority = changes.priority;

  if ((changes.dueDate ?? null) !== (previous.dueDate ?? null)) {
    update.due_at = changes.dueDate ? dueDateToTimestamp(changes.dueDate) : null;
  }

  if (changes.status !== previous.status) {
    update.status = changes.status;
    const wasDone = previous.status === "done";
    const isDone = changes.status === "done";
    if (isDone && !wasDone) update.completed_at = nowIso;
    if (!isDone && wasDone) update.completed_at = null;
  }

  return update;
}

/**
 * The signed-in user's id, verified by Supabase Auth (getClaims validates the
 * JWT; it never trusts unverified cookie contents).
 */
export async function getVerifiedUserId(): Promise<string> {
  const { data, error } = await createClient().auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || typeof sub !== "string") {
    throw new TaskDataError("Your session has expired. Sign in again to see your tasks.", error);
  }
  return sub;
}

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await createClient()
    .from("tasks")
    .select(COLUMNS)
    .order("created_at", { ascending: false });
  if (error) fail("load your tasks", error);
  return (data as TaskRow[]).map(rowToTask);
}

export async function createTask(userId: string, input: NewTaskInput): Promise<Task> {
  const { data, error } = await createClient()
    .from("tasks")
    .insert(buildTaskInsert(userId, input))
    .select(COLUMNS)
    .single();
  if (error) fail("save the task", error);
  return rowToTask(data as TaskRow);
}

/** Saves an edit to an existing task (matched by UUID and owner). Never inserts. */
export async function updateTask(userId: string, previous: Task, changes: TaskChanges): Promise<Task> {
  const { data, error } = await createClient()
    .from("tasks")
    .update(buildTaskUpdate(previous, changes))
    .eq("id", previous.id)
    .eq("user_id", userId)
    .select(COLUMNS)
    .single();
  // `.single()` errors (PGRST116) when no row matched, e.g. it was deleted elsewhere.
  if (error) fail("save your changes", error);
  return rowToTask(data as TaskRow);
}

/** Sets a task's status, keeping completed_at in sync (set when done, cleared otherwise). */
export async function updateTaskStatus(userId: string, id: string, status: TaskStatus): Promise<Task> {
  const now = new Date().toISOString();
  const { data, error } = await createClient()
    .from("tasks")
    .update({ status, completed_at: status === "done" ? now : null, updated_at: now })
    .eq("id", id)
    .eq("user_id", userId)
    .select(COLUMNS)
    .single();
  if (error) fail("update the task", error);
  return rowToTask(data as TaskRow);
}

export async function deleteTask(userId: string, id: string): Promise<void> {
  const { data, error } = await createClient().from("tasks").delete().eq("id", id).eq("user_id", userId).select("id");
  if (error) fail("delete the task", error);
  if (!data || data.length === 0) fail("delete the task", { code: "PGRST116", message: "No matching task" } as PostgrestError);
}
