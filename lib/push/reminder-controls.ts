import type { ReminderRule } from "./types";
import { reminderInstant } from "./upcoming";
export type ReminderControl = "mute" | "resume" | "snooze15" | "snooze60";
export function reminderControlPatch(rule: ReminderRule, action: ReminderControl, now: number) {
  if (!["mute", "resume", "snooze15", "snooze60"].includes(action)) throw new Error("Choose a valid reminder action.");
  if (action === "mute" || action === "resume") return { enabled: action === "resume" };
  if (!rule.task_id || !rule.enabled) throw new Error("Only an enabled task reminder can be snoozed. Edit a habit's daily reminder time instead.");
  const instant = Math.ceil((now + (action === "snooze15" ? 15 : 60) * 60000) / 60000) * 60000;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: rule.time_zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(instant);
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  const local_date = `${get("year")}-${get("month")}-${get("day")}`, local_time = `${get("hour")}:${get("minute")}`;
  if (reminderInstant(local_date, local_time, rule.time_zone) !== instant) throw new Error("This snooze crosses a repeated daylight-saving time. Choose a reminder time in the editor instead.");
  return { local_date, local_time, enabled: true };
}
