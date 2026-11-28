import { createClient } from "@/lib/supabase/client";
import { describeTaskError, TaskDataError } from "./tasks";
import type { AccentColor, Goal } from "@/lib/types";

export type GoalStatus = NonNullable<Goal["status"]>;
export interface GoalInput {
  title: string; description?: string; current: number; target: number;
  unit: string; targetDate?: string; status: GoalStatus;
}
export interface GoalRow {
  id: string; title: string; description: string; current_value: number | string;
  target_value: number | string | null; unit: string; due_date: string | null; status: GoalStatus;
}
const COLUMNS = "id,title,description,current_value,target_value,unit,due_date,status";
const COLORS: AccentColor[] = ["violet", "blue", "emerald", "amber", "rose", "cyan"];
export function rowToGoal(row: GoalRow): Goal {
  const hash = Array.from(row.id).reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
  return { id: row.id, title: row.title, description: row.description, current: Number(row.current_value),
    target: Number(row.target_value ?? 0), unit: row.unit, targetDate: row.due_date ?? undefined,
    status: row.status, color: COLORS[hash % COLORS.length] };
}
export function buildGoalFields(input: GoalInput) {
  const title = input.title.trim(), unit = input.unit.trim();
  if (!title || title.length > 200) throw new TaskDataError("Give the goal a title of up to 200 characters.");
  if (!unit || unit.length > 30) throw new TaskDataError("Choose a unit of up to 30 characters, such as books, miles, or $.");
  if (!Number.isFinite(input.target) || input.target <= 0 || input.target > 1000000000 || !Number.isFinite(input.current) || input.current < 0 || input.current > 1000000000)
    throw new TaskDataError("Use a positive target and progress of zero or more, up to 1 billion.");
  if (!["active", "paused", "completed", "archived"].includes(input.status)) throw new TaskDataError("Choose a valid goal status.");
  if (input.targetDate) {
    const date = new Date(`${input.targetDate}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.targetDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== input.targetDate)
      throw new TaskDataError("Choose a valid target date.");
  }
  return { title, description: (input.description ?? "").trim(), unit, current_value: input.current,
    target_value: input.target, due_date: input.targetDate || null, status: input.status };
}
function fail(action: string, error: Parameters<typeof describeTaskError>[1]): never {
  if (error && "code" in error && error.code === "PGRST116") throw new TaskDataError("This goal is no longer available. Reload goals and try again.", error);
  throw new TaskDataError(describeTaskError(action, error), error);
}
export async function fetchGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await createClient().from("goals").select(COLUMNS).eq("user_id", userId).order("created_at", { ascending: false });
  if (error) fail("load goals", error);
  return (data as GoalRow[]).map(rowToGoal);
}
export async function createGoal(userId: string, id: string, input: GoalInput): Promise<Goal> {
  const fields = buildGoalFields(input);
  const { data, error } = await createClient().from("goals").insert({ id, user_id: userId, ...fields }).select(COLUMNS).single();
  // A lost response may follow a successful insert. Reuse the form's UUID on retry.
  if (error?.code === "23505") {
    const saved = await createClient().from("goals").select(COLUMNS).eq("id", id).eq("user_id", userId).single();
    if (saved.error) fail("recover the goal", saved.error);
    const goal = rowToGoal(saved.data as GoalRow);
    const previous = buildGoalFields({ ...goal, status: goal.status ?? "active" });
    if (Object.entries(fields).every(([key, value]) => previous[key as keyof typeof previous] === value)) return goal;
    throw new TaskDataError("This goal was already saved. Close this form and reload goals before editing it.");
  }
  if (error) fail("create the goal", error);
  return rowToGoal(data as GoalRow);
}
export async function updateGoal(userId: string, id: string, input: GoalInput): Promise<Goal> {
  const { data, error } = await createClient().from("goals").update({ ...buildGoalFields(input), updated_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", userId).select(COLUMNS).single();
  if (error) fail("save the goal", error);
  return rowToGoal(data as GoalRow);
}
export async function deleteGoal(userId: string, id: string): Promise<void> {
  const { error } = await createClient().from("goals").delete().eq("id", id).eq("user_id", userId);
  if (error) fail("delete the goal", error);
}
