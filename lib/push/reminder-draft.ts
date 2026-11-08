import type { ReminderRule } from "./types";
import { validateReminder } from "./validation";

export type ReminderKind = "task" | "habit";
export interface ReminderDraft { enabled: boolean; date: string; time: string; zone: string }
export function reminderDraft(rule: ReminderRule | undefined, zone: string): ReminderDraft {
  return { enabled: rule?.enabled ?? false, date: rule?.local_date ?? "", time: rule?.local_time.slice(0,5) ?? "", zone: rule?.time_zone ?? zone };
}
export function reminderInput(kind: ReminderKind, id: string, draft: ReminderDraft): Omit<ReminderRule,"id"> {
  const input = { task_id: kind === "task" ? id : null, habit_id: kind === "habit" ? id : null,
    enabled: draft.enabled, local_date: kind === "task" ? draft.date : null, local_time: draft.time, time_zone: draft.zone.trim() };
  validateReminder(input);
  return input;
}
