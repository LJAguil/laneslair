import { addDays, PROTOTYPE_TODAY as T } from "@/lib/dates";
import type { Goal, Habit } from "@/lib/types";

/** Builds check-in dates from day offsets relative to today (0 = today, -1 = yesterday…). */
const days = (...offsets: number[]) => offsets.map((o) => addDays(T, o));

export const sampleHabits: Habit[] = [
  {
    id: "h1",
    name: "Morning workout",
    frequency: "daily",
    checkIns: days(-1, -2, -3, -4, -5, -6, -8, -9, -10, -11),
    color: "emerald",
  },
  {
    id: "h2",
    name: "Read 20 pages",
    frequency: "daily",
    checkIns: days(0, -1, -2, -3, -5, -6, -7),
    color: "blue",
  },
  {
    id: "h3",
    name: "Drink 8 glasses of water",
    frequency: "daily",
    checkIns: days(-1, -2, -4, -5),
    color: "cyan",
  },
  {
    id: "h4",
    name: "Practice LeetCode",
    frequency: "weekdays",
    checkIns: days(-1, -2, -5, -6, -7, -8, -9),
    color: "violet",
  },
  {
    id: "h5",
    name: "Journal before bed",
    frequency: "daily",
    checkIns: days(-1, -3, -4),
    color: "amber",
  },
];

export const sampleGoals: Goal[] = [
  { id: "g1", title: "Read 24 books this year", unit: "books", current: 17, target: 24, targetDate: "2026-12-31", color: "blue" },
  { id: "g2", title: "Run 300 miles", unit: "miles", current: 212, target: 300, targetDate: "2026-12-31", color: "emerald" },
  { id: "g3", title: "Save for a new laptop", unit: "$", current: 1150, target: 2000, targetDate: addDays(T, 75), color: "amber" },
  { id: "g4", title: "Apply to 30 internships", unit: "applications", current: 19, target: 30, targetDate: addDays(T, 21), color: "rose" },
];
