import { describe,expect,it } from "vitest";
import { addDays } from "./dates";
import { habitDay,habitStreakValue,habitWeekCount,withHabitDay } from "./habits";
import type { Habit } from "./types";

export const habit: Habit = { id:"habit",name:"Water",description:"",frequency:"daily",targetPerWeek:7,trackingType:"quantity",dailyTarget:8,unit:"glasses",streakEnabled:true,isActive:true,color:"cyan",createdAt:"2026-01-01T12:00:00Z",days:{},checkIns:[] };
describe("habit streaks and targets", () => {
  it("keeps yesterday's streak while today is unfinished, then breaks after a missed day", () => {
    const h = { ...habit,checkIns:["2026-11-04","2026-11-05","2026-11-06"] };
    expect(habitStreakValue(h,"2026-11-07")).toBe(3);
    expect(habitStreakValue(h,"2026-11-08")).toBe(0);
    expect(habitStreakValue({ ...h,checkIns:[...h.checkIns,"2026-11-07"] },"2026-11-07")).toBe(4);
  });
  it("ignores duplicate and future entries, and supports streaks longer than a year", () => {
    const days = Array.from({length:500},(_,i) => addDays("2026-01-01",i));
    expect(habitStreakValue({ ...habit,checkIns:[...days,days[499],"2099-01-01"] },days[499])).toBe(500);
  });
  it("turning streaks off hides the count without changing completion history", () => {
    const h = { ...habit,streakEnabled:false,checkIns:["2026-11-07"] };
    expect(habitStreakValue(h,"2026-11-07")).toBe(0);
    expect(h.checkIns).toEqual(["2026-11-07"]);
  });
  it("counts successful weeks for weekly/custom goals rather than consecutive days", () => {
    const h = { ...habit,frequency:"weekly" as const,targetPerWeek:2,checkIns:["2026-10-19","2026-10-21","2026-10-26","2026-10-28","2026-11-02"] };
    expect(habitStreakValue(h,"2026-11-05")).toBe(2);
    expect(habitStreakValue({ ...h,checkIns:[...h.checkIns,"2026-11-05"] },"2026-11-05")).toBe(3);
    expect(habitStreakValue(h,"2026-11-09")).toBe(0);
    expect(habitStreakValue({ ...h,frequency:"custom" },"2026-11-05")).toBe(2);
    expect(habitWeekCount(h,"2026-11-05")).toBe(1);
  });
  it("uses saved per-day targets even when the current goal changes", () => {
    const logged = withHabitDay(habit,"2026-11-07",{amount:8,target:8});
    const changed = { ...logged,dailyTarget:10 };
    expect(habitDay(changed,"2026-11-07")).toEqual({amount:8,target:8});
    expect(habitDay(changed,"2026-11-08")).toEqual({amount:0,target:10});
    expect(changed.checkIns).toEqual(["2026-11-07"]);
    expect(withHabitDay(changed,"2026-11-07",{amount:7,target:8}).checkIns).toEqual([]);
  });
});
