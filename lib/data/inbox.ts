import { createClient } from "@/lib/supabase/client";
import { rowToTask, buildTaskInsert, TaskDataError, describeTaskError, TIMED_TASK_SETUP, type TaskRow } from "./tasks";
import type { DailyFocus, InboxNote, NewTaskInput, Task } from "@/lib/types";

export interface NoteRow {
  id: string;
  user_id: string;
  body: string;
  archived_at: string | null;
  converted_task_id: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
}
export class CaptureConflictError extends TaskDataError {}
const COLUMNS = "id,user_id,body,archived_at,converted_task_id,converted_at,created_at,updated_at";

export function noteFromRow(row: NoteRow): InboxNote {
  return {
    id: row.id, body: row.body, archivedAt: row.archived_at ?? undefined,
    convertedTaskId: row.converted_task_id ?? undefined, convertedAt: row.converted_at ?? undefined,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function captureBody(body: string): string {
  const value = body.trim();
  if (!value) throw new TaskDataError("Write something to capture.");
  if (value.length > 20000) throw new TaskDataError("Keep each capture under 20,000 characters.");
  return value;
}

export function captureTaskDefaults(note: InboxNote): Pick<NewTaskInput, "title" | "notes"> {
  return { title: note.body.split(/\r?\n/).find((line) => line.trim())?.trim().slice(0, 120) ?? "", notes: note.body };
}

function fail(action: string, error: Parameters<typeof describeTaskError>[1]): never {
  const code = error && "code" in error ? error.code : undefined;
  if (["42P01", "42883", "PGRST202", "PGRST205"].includes(String(code))) {
    throw new TaskDataError("Inbox and focus setup is needed. See the setup guide, then retry.", error);
  }
  if (code === "P0002" || code === "PGRST116") throw new TaskDataError("This capture is no longer available. Reload Inbox and try again.", error);
  if (code === "22023") throw new TaskDataError("Check the task title and priority, and restore the capture if it is archived.", error);
  throw new TaskDataError(describeTaskError(action, error), error);
}

export async function fetchNotes(userId: string): Promise<InboxNote[]> {
  const { data, error } = await createClient().from("inbox_notes").select(COLUMNS)
    .eq("user_id", userId).order("created_at", { ascending: false });
  if (error) fail("load your Inbox", error);
  return (data as NoteRow[]).map(noteFromRow);
}

/** The form keeps its UUID until confirmed, so retry after a lost response is safe. */
export async function createNote(userId: string, id: string, body: string): Promise<InboxNote> {
  const value = captureBody(body);
  const { data, error } = await createClient().from("inbox_notes")
    .insert({ id, user_id: userId, body: value }).select(COLUMNS).single();
  if (error?.code === "23505") {
    const existing = await createClient().from("inbox_notes").select(COLUMNS).eq("id", id).eq("user_id", userId).single();
    if (existing.error) fail("recover the capture", existing.error);
    const note = noteFromRow(existing.data as NoteRow);
    if (note.body !== value) throw new CaptureConflictError("An earlier version was already saved. Keep these edits as a new capture, or check Inbox.");
    return note;
  }
  if (error) fail("save the capture", error);
  return noteFromRow(data as NoteRow);
}

export async function updateNote(userId: string, id: string, changes: { body?: string; archived?: boolean }): Promise<InboxNote> {
  const fields: { body?: string; archived_at?: string | null; updated_at: string } = { updated_at: new Date().toISOString() };
  if (changes.body !== undefined) fields.body = captureBody(changes.body);
  if (changes.archived !== undefined) fields.archived_at = changes.archived ? new Date().toISOString() : null;
  const { data, error } = await createClient().from("inbox_notes").update(fields)
    .eq("id", id).eq("user_id", userId).select(COLUMNS).single();
  if (error) fail("update the capture", error);
  return noteFromRow(data as NoteRow);
}

/** All creation/linking happens atomically in the RPC, never as two client writes. */
export async function convertNote(userId: string, noteId: string, input: NewTaskInput): Promise<{ note: InboxNote; task: Task | null }> {
  const fields = buildTaskInsert(userId, input);
  if (!fields.title) throw new TaskDataError("Give the task a title.");
  const { data, error } = await createClient().rpc(input.dueTime ? "convert_inbox_note_timed" : "convert_inbox_note", {
    p_note_id: noteId, p_title: fields.title, p_description: fields.description,
    p_priority: fields.priority, p_due_at: fields.due_at, p_project_id: fields.project_id,
  });
  if (input.dueTime && error && ["42883", "PGRST202", "42703", "PGRST204"].includes(error.code)) throw new TaskDataError(TIMED_TASK_SETUP);
  if (error) fail("make this a task", error);
  const result = data as { note: NoteRow; task: TaskRow | null };
  return { note: noteFromRow(result.note), task: result.task ? rowToTask(result.task) : null };
}

export async function fetchFocus(userId: string): Promise<DailyFocus | null> {
  const { data, error } = await createClient().from("daily_focus").select("task_id,focus_date").eq("user_id", userId).maybeSingle();
  if (error) fail("load your focus", error);
  return data ? { taskId: data.task_id, date: data.focus_date } : null;
}

export async function saveFocus(userId: string, taskId: string | null, date: string): Promise<DailyFocus> {
  const { data, error } = await createClient().from("daily_focus").upsert({
    user_id: userId, task_id: taskId, focus_date: date, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" }).select("task_id,focus_date").single();
  if (error) fail("save your focus", error);
  return { taskId: data.task_id, date: data.focus_date };
}
