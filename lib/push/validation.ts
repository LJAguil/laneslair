import type { DeviceSubscription, NotificationPreferences, ReminderRule } from "./types";

export function uuid(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error("Invalid item or device ID.");
}

/** Deliberately restrict outbound requests: a subscription is untrusted input. */
export function safePushEndpoint(value: string) {
  const url = new URL(value);
  const host = url.hostname;
  const allowed = host === "fcm.googleapis.com" || host === "updates.push.services.mozilla.com" ||
    host === "push.services.mozilla.com" || host.endsWith(".push.apple.com") || host.endsWith(".notify.windows.com");
  if (!allowed || url.protocol !== "https:" || url.port || url.username || url.password || url.hash || value.length > 2048) {
    throw new Error("This push provider is not supported. Try Safari, Chrome, Edge or Firefox.");
  }
  return value;
}

export function validateSubscription(value: DeviceSubscription) {
  safePushEndpoint(value.endpoint);
  for (const [key, length] of [[value.keys?.p256dh, 87], [value.keys?.auth, 22]] as const) {
    if (typeof key !== "string" || key.length !== length || !/^[A-Za-z0-9_-]+$/.test(key)) throw new Error("Invalid push subscription. Disable notifications, then enable them again.");
  }
  if (value.expirationTime != null && (!Number.isFinite(value.expirationTime) || value.expirationTime <= Date.now())) throw new Error("This subscription has expired. Enable notifications again.");
}

export function timeZone(value: string) {
  if (typeof value !== "string" || value.length > 100) throw new Error("Choose a valid time zone.");
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); } catch { throw new Error("Choose a valid time zone."); }
}
export function clock(value: string) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(value)) throw new Error("Choose a reminder time.");
}
export function validatePreferences(value: NotificationPreferences) {
  timeZone(value.time_zone);
  if (typeof value.paused !== "boolean") throw new Error("Invalid pause setting.");
  if ((value.quiet_start === null) !== (value.quiet_end === null)) throw new Error("Choose both quiet-hours times.");
  if (value.quiet_start !== null && value.quiet_end !== null) {
    clock(value.quiet_start); clock(value.quiet_end);
    if (value.quiet_start.slice(0,5) === value.quiet_end.slice(0,5)) throw new Error("Quiet hours must have different start and end times.");
  }
}
export function validateReminder(value: Omit<ReminderRule, "id">) {
  if (Boolean(value.task_id) === Boolean(value.habit_id)) throw new Error("Choose one task or habit.");
  uuid(value.task_id ?? value.habit_id);
  if (typeof value.enabled !== "boolean") throw new Error("Invalid reminder setting.");
  timeZone(value.time_zone); clock(value.local_time);
  if (value.task_id) {
    const date = value.local_date;
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw new Error("Choose a valid reminder date, separate from the task due date.");
  } else if (value.local_date !== null) throw new Error("Habit reminders repeat daily; leave the date empty.");
}
