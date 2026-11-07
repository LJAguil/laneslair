import { createClient } from "@/lib/supabase/client";
import { TaskDataError, describeTaskError } from "./tasks";
import type { AccentColor, Habit, HabitFrequency, HabitTracking, ISODate } from "@/lib/types";

export interface HabitRow {
  id: string; user_id: string; name: string; description: string;
  frequency: HabitFrequency; target_per_week: number; is_active: boolean;
  tracking_type: HabitTracking; daily_target: number; unit: string;
  streak_enabled: boolean; color: AccentColor; created_at: string;
}
export interface HabitLogRow {
  habit_id: string; completed_on: ISODate; amount: number; target: number;
}
export interface HabitInput {
  name: string; description: string; frequency: HabitFrequency; targetPerWeek: number;
  trackingType: HabitTracking; dailyTarget: number; unit: string; streakEnabled: boolean; color: AccentColor;
}
export interface HabitProgressRequest {
  id: string; habitId: string; date: ISODate; mode: "add" | "set"; value: number;
}
const COLUMNS = "id,user_id,name,description,frequency,target_per_week,is_active,tracking_type,daily_target,unit,streak_enabled,color,created_at";
const COLORS = ["violet", "blue", "emerald", "amber", "rose", "cyan"];
const PAGE_SIZE = 1000;

/** Database validation/permission errors roll back; transport failures may have committed. */
export function progressWasRejected(error: unknown): boolean {
  const cause = error instanceof TaskDataError ? error.cause : undefined;
  const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "";
  return ["22023","23503","23514","23502","22P02","42501","P0002","PGRST116","42703","42P01","42883","PGRST202","PGRST204","PGRST205"].includes(code);
}

export function habitFromRows(row: HabitRow, logs: HabitLogRow[]): Habit {
  const days = Object.fromEntries(logs.filter((l) => l.habit_id === row.id).map((l) => [l.completed_on, { amount: Number(l.amount), target: Number(l.target) }]));
  return {
    id: row.id, name: row.name, description: row.description, frequency: row.frequency,
    targetPerWeek: row.target_per_week, isActive: row.is_active, trackingType: row.tracking_type,
    dailyTarget: Number(row.daily_target), unit: row.unit, streakEnabled: row.streak_enabled,
    color: row.color, createdAt: row.created_at, days,
    checkIns: Object.keys(days).filter((d) => days[d].amount >= days[d].target).sort(),
  };
}

export function buildHabitFields(input: HabitInput) {
  const name = input.name.trim();
  const unit = input.trackingType === "check" ? "check-in" : input.unit.trim();
  const target = input.trackingType === "check" ? 1 : input.dailyTarget;
  if (!name) throw new TaskDataError("Give the habit a name.");
  if (!["daily", "weekly", "custom"].includes(input.frequency) || !["check", "quantity"].includes(input.trackingType) || !COLORS.includes(input.color)) throw new TaskDataError("Choose a valid habit schedule, type, and color.");
  if (!unit || unit.length > 30 || !Number.isFinite(target) || target <= 0 || target > 1000000 || Math.abs(target * 1000 - Math.round(target * 1000)) > 0.000001) throw new TaskDataError("Choose a unit and a positive daily target with up to 3 decimal places.");
  const weekly = input.frequency === "daily" ? 7 : input.targetPerWeek;
  if (!Number.isInteger(weekly) || weekly < 1 || weekly > 7) throw new TaskDataError("Choose between 1 and 7 days per week.");
  return {
    name, description: input.description.trim(), frequency: input.frequency, target_per_week: weekly,
    tracking_type: input.trackingType, daily_target: target, unit, streak_enabled: input.streakEnabled, color: input.color,
  };
}

function fail(action: string, error: Parameters<typeof describeTaskError>[1]): never {
  const code = error && "code" in error ? error.code : undefined;
  if (["42703", "42P01", "42883", "PGRST202", "PGRST204", "PGRST205"].includes(String(code))) throw new TaskDataError("Habit tracking setup is needed. Apply the reviewed habits migration, then retry.", error);
  if (code === "P0002" || code === "PGRST116") throw new TaskDataError("This habit is no longer available. Reload habits and try again.", error);
  if (code === "22023") throw new TaskDataError("Check the amount and date. Habits with history keep their tracking type, units, and schedule; restore archived habits before logging.", error);
  throw new TaskDataError(describeTaskError(action, error), error);
}

/** Page through all logs so long streaks are not silently cut at the API's row limit. */
export async function fetchHabits(userId: string): Promise<Habit[]> {
  const { data, error } = await createClient().from("habits").select(COLUMNS).eq("user_id", userId).order("created_at", { ascending: false });
  if (error) fail("load habits", error);
  const logs: HabitLogRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const result = await createClient().from("habit_logs").select("habit_id,completed_on,amount,target").eq("user_id", userId).order("id").range(offset, offset + PAGE_SIZE - 1);
    if (result.error) fail("load habit history", result.error);
    logs.push(...result.data as HabitLogRow[]);
    if (result.data.length < PAGE_SIZE) break;
  }
  return (data as HabitRow[]).map((row) => habitFromRows(row, logs));
}
export async function createHabit(userId: string, id: string, input: HabitInput): Promise<Habit> {
  const fields = buildHabitFields(input);
  const { data, error } = await createClient().from("habits").insert({ id, user_id: userId, ...fields }).select(COLUMNS).single();
  if (error?.code === "23505") {
    const saved = await createClient().from("habits").select(COLUMNS).eq("id", id).eq("user_id", userId).single();
    if (saved.error) fail("recover the habit", saved.error);
    const row = saved.data as HabitRow;
    if (Object.entries(fields).some(([key, value]) => row[key as keyof HabitRow] !== value)) throw new TaskDataError("An earlier version was already saved. Close this form and edit that habit to keep these changes.");
    return habitFromRows(row, []);
  }
  if (error) fail("create the habit", error);
  return habitFromRows(data as HabitRow, []);
}
export async function updateHabit(userId: string, habit: Habit, input: HabitInput): Promise<Habit> {
  const fields = buildHabitFields(input);
  if (habit.frequency === "daily" && input.frequency === "daily") fields.target_per_week = habit.targetPerWeek;
  if (Object.keys(habit.days).length && (fields.unit !== habit.unit || fields.tracking_type !== habit.trackingType || fields.frequency !== habit.frequency || fields.target_per_week !== habit.targetPerWeek)) throw new TaskDataError("This habit has history. Keep its type, units, and schedule, or archive it and create a new habit.");
  const { data, error } = await createClient().from("habits").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", habit.id).eq("user_id", userId).select(COLUMNS).single();
  if (error) fail("save the habit", error);
  const saved = habitFromRows(data as HabitRow, []);
  return { ...saved, days: habit.days, checkIns: habit.checkIns };
}
export async function setHabitActive(userId: string, id: string, active: boolean): Promise<void> {
  const { error } = await createClient().from("habits").update({ is_active: active, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId).select("id").single();
  if (error) fail(active ? "restore the habit" : "archive the habit", error);
}
export async function recordHabitProgress(request: HabitProgressRequest): Promise<HabitLogRow> {
  const { data, error } = await createClient().rpc("record_habit_progress", {
    p_operation_id: request.id, p_habit_id: request.habitId, p_date: request.date, p_mode: request.mode, p_value: request.value,
  });
  if (error) fail("save habit progress", error);
  return (data as { log: HabitLogRow }).log;
}
