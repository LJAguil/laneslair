import type { ISODate, ISODateTime } from "./types";

/**
 * The prototype's "today".
 *
 * The sample data is written around a fixed date so every page stays consistent
 * and renders identically on the server and in the browser (no hydration mismatches,
 * and no Cache Components warnings about reading the clock during prerender).
 * Once real data exists, replace this with the user's actual current date.
 */
export const PROTOTYPE_TODAY: ISODate = "2026-10-14";

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

/** Human-friendly due label relative to the prototype's today. */
export function formatDueLabel(due: ISODate, today: ISODate = PROTOTYPE_TODAY): string {
  const diff = daysBetween(today, due);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff < 7) return formatWeekday(due);
  return formatShortDate(due);
}

/** The `n` ISO dates ending on `end` (inclusive), oldest first. */
export function lastNDays(n: number, end: ISODate = PROTOTYPE_TODAY): ISODate[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}
