import { addDays, parseISODate, toISODate } from "./dates";
import type { Habit, HabitDay, ISODate } from "./types";

export function habitDay(habit: Habit, date: ISODate): HabitDay {
  return habit.days[date] ?? { amount: 0, target: habit.dailyTarget };
}
export function weekStart(date: ISODate): ISODate {
  return addDays(date, -((parseISODate(date).getDay() + 6) % 7));
}
export function habitWeekCount(habit: Habit, date: ISODate): number {
  const start = weekStart(date);
  return new Set(habit.checkIns.filter((d) => d >= start && d <= date)).size;
}
export const streakUnit = (habit: Pick<Habit, "frequency">) => habit.frequency === "daily" ? "day" : "week";

/** Today/current week remains open: an uncompleted period has not broken yesterday's streak. */
export function habitStreakValue(habit: Pick<Habit, "checkIns" | "frequency" | "targetPerWeek" | "streakEnabled">, today: ISODate): number {
  if (!habit.streakEnabled) return 0;
  const dates = [...new Set(habit.checkIns.filter((d) => d <= today))].sort();
  if (!dates.length) return 0;
  const checked = new Set(dates);
  if (habit.frequency === "daily") {
    let cursor = checked.has(today) ? today : addDays(today, -1);
    let count = 0;
    while (cursor >= dates[0] && checked.has(cursor)) { count++; cursor = addDays(cursor, -1); }
    return count;
  }
  const weeks = new Map<string, number>();
  dates.forEach((date) => { const start = weekStart(date); weeks.set(start, (weeks.get(start) ?? 0) + 1); });
  let cursor = weekStart(today);
  if ((weeks.get(cursor) ?? 0) < habit.targetPerWeek) cursor = addDays(cursor, -7);
  let count = 0;
  while (cursor >= weekStart(dates[0]) && (weeks.get(cursor) ?? 0) >= habit.targetPerWeek) { count++; cursor = addDays(cursor, -7); }
  return count;
}

/** Recompute successful days from the saved target for that date, never today's edited target. */
export function withHabitDay(habit: Habit, date: ISODate, day: HabitDay): Habit {
  const days = { ...habit.days, [date]: day };
  return { ...habit, days, checkIns: Object.keys(days).filter((d) => days[d].amount >= days[d].target).sort() };
}
export function habitStartDate(habit: Habit): ISODate { return toISODate(new Date(habit.createdAt)); }
export function amountLabel(amount: number, unit: string): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(amount)} ${amount === 1 && unit === "glasses" ? "glass" : unit}`;
}
