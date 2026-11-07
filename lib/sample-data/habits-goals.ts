import { addDays } from "@/lib/dates";
import type { Goal, ISODate } from "@/lib/types";

export function sampleGoals(T: ISODate): Goal[] {
  return [
    { id: "g1", title: "Read 24 books this year", unit: "books", current: 17, target: 24, targetDate: "2026-12-31", color: "blue" },
    { id: "g2", title: "Run 300 miles", unit: "miles", current: 212, target: 300, targetDate: "2026-12-31", color: "emerald" },
    { id: "g3", title: "Save for a new laptop", unit: "$", current: 1150, target: 2000, targetDate: addDays(T, 75), color: "amber" },
    { id: "g4", title: "Apply to 30 internships", unit: "applications", current: 19, target: 30, targetDate: addDays(T, 21), color: "rose" },
  ];
}
