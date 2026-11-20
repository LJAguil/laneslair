import type { EventWindow } from "./types";

export type EventDateFilter = "all" | "today" | "week";
function localDay(instant: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const part = (type: string) => parts.find(value => value.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function addDays(day: string, count: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

/** Calendar-day overlap in the event's zone. Freshness/expiry is assessed separately. */
export function matchesEventDate(window: EventWindow, now: number, filter: EventDateFilter): boolean {
  if (filter === "all") return true;
  const first = localDay(now, window.timeZone);
  const limit = addDays(first, filter === "today" ? 1 : 7);
  if (window.kind === "dates") return window.startDate < limit && window.endDateExclusive > first;
  const start = localDay(Date.parse(window.startsAt), window.timeZone);
  // An exact midnight end does not imply attendance on the following day.
  const last = window.kind === "timed" ? localDay(Date.parse(window.endsAt) - 1, window.timeZone) : start;
  return start < limit && last >= first;
}
