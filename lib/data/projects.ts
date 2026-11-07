// Matches the inspected public.projects schema; RLS remains authoritative.
import { createClient } from "@/lib/supabase/client";
import { describeTaskError, TaskDataError } from "./tasks";
import type { AccentColor, Project, ProjectStatus } from "@/lib/types";

export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectInput {
  name: string;
  description?: string;
  status: ProjectStatus;
  dueDate?: string;
}

export const PROJECT_STATUSES: readonly ProjectStatus[] = ["active", "paused", "completed", "archived"];
export const PROJECT_LABELS: Record<ProjectStatus, string> = {
  active: "Active", paused: "Paused", completed: "Completed", archived: "Archived",
};
const COLUMNS = "id,user_id,name,description,status,due_date,created_at,updated_at";
const COLORS: AccentColor[] = ["violet", "blue", "emerald", "amber", "rose", "cyan"];

export function rowToProject(row: ProjectRow): Project {
  // Color is presentation only: stable across reloads, with no new database column.
  const hash = Array.from(row.id).reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
  return {
    id: row.id, name: row.name, description: row.description,
    status: row.status, dueDate: row.due_date ?? undefined,
    color: COLORS[hash % COLORS.length],
  };
}

export function buildProjectFields(input: ProjectInput) {
  const name = input.name.trim();
  if (!name) throw new TaskDataError("Give the project a name.");
  if (!PROJECT_STATUSES.includes(input.status)) throw new TaskDataError("Choose a valid project status.");
  if (input.dueDate) {
    const d = new Date(`${input.dueDate}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate) || !Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== input.dueDate) {
      throw new TaskDataError("Choose a valid due date.");
    }
  }
  return { name, description: (input.description ?? "").trim(), status: input.status, due_date: input.dueDate || null };
}

function fail(action: string, error: Parameters<typeof describeTaskError>[1]): never {
  const message = error && "code" in error && error.code === "PGRST116"
    ? "The project is no longer available. Refresh your projects and try again."
    : describeTaskError(action, error);
  throw new TaskDataError(message, error);
}

export async function fetchProjects(userId: string): Promise<Project[]> {
  const { data, error } = await createClient().from("projects").select(COLUMNS)
    .eq("user_id", userId).order("created_at", { ascending: false });
  if (error) fail("load your projects", error);
  return (data as ProjectRow[]).map(rowToProject);
}

export async function createProject(userId: string, input: ProjectInput): Promise<Project> {
  const { data, error } = await createClient().from("projects")
    .insert({ ...buildProjectFields(input), user_id: userId }).select(COLUMNS).single();
  if (error) fail("create the project", error);
  return rowToProject(data as ProjectRow);
}

export async function updateProject(userId: string, id: string, input: ProjectInput): Promise<Project> {
  const { data, error } = await createClient().from("projects")
    .update({ ...buildProjectFields(input), updated_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", userId).select(COLUMNS).single();
  if (error) fail("save the project", error);
  return rowToProject(data as ProjectRow);
}
