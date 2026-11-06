import type { ISODate, ISODateTime } from "./types";

/**
 * Dates in the UI are plain calendar days ("2026-10-15") in the browser's local
 * time zone. "Today" is read once on the client (see the app store) and passed
 * into every date helper, so nothing reads the clock while rendering.
 */
export function localToday(): ISODate {
  return toISODate(new Date());
}

export function parseISODate(value: ISODate): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(value: ISODate, days: number): ISODate {
  const date = parseISODate(value);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: ISODate, to: ISODate): number {
  const ms = parseISODate(to).getTime() - parseISODate(from).getTime();
  return Math.round(ms / 86_400_000);
}

export function formatLongDate(value: ISODate): string {
  return parseISODate(value).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(value: ISODate): string {
  return parseISODate(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatWeekday(value: ISODate, style: "short" | "narrow" = "short"): string {
  return parseISODate(value).toLocaleDateString("en-US", { weekday: style });
}

export function formatTime(value: ISODateTime): string {
  const [, time = "00:00"] = value.split("T");
  const [h, min] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return min === 0 ? `${hour} ${suffix}` : `${hour}:${String(min).padStart(2, "0")} ${suffix}`;
}

/** Human-friendly due label relative to `today`. */
export function formatDueLabel(due: ISODate, today: ISODate): string {
  const diff = daysBetween(today, due);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff < 7) return formatWeekday(due);
  return formatShortDate(due);
}

/** The `n` ISO dates ending on `end` (inclusive), oldest first. */
export function lastNDays(n: number, end: ISODate): ISODate[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}

// ---------------------------------------------------------------------------
// Database <-> UI conversions (timestamptz columns)
// ---------------------------------------------------------------------------

/** A database timestamp (UTC instant) as a local "YYYY-MM-DDTHH:mm:ss" string. */
export function timestampToLocalDateTime(value: string): ISODateTime {
  const d = new Date(value);
  const time = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
  return `${toISODate(d)}T${time}`;
}

/** The local calendar day a database timestamp falls on. */
export function timestampToLocalDate(value: string): ISODate {
  return toISODate(new Date(value));
}

/**
 * Stores a date-only due date as 12:00 local time. Noon keeps the same
 * calendar day when read back from any time zone within ±11 hours, so a task
 * due "Oct 20" never drifts to Oct 19 or 21. Overdue checks compare days, not
 * times, so the noon time itself never matters in the UI.
 */
export function dueDateToTimestamp(value: ISODate): string {
  const d = parseISODate(value);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}
