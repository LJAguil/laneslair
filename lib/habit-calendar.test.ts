import { afterEach, describe, expect, it, vi } from "vitest";
import type { Habit } from "./types";
import { calendarDays, calendarHabits, calendarKeyDate, historyFor, monthStart, recordedWeek, shiftCalendarMonth, summarizeDay, validCalendarDate } from "./habit-calendar";
const habit:Habit={id:"water",name:"Water",description:"",frequency:"daily",targetPerWeek:7,trackingType:"quantity",dailyTarget:10,unit:"glasses",streakEnabled:true,isActive:true,color:"blue",createdAt:"2026-11-01T12:00:00Z",days:{},checkIns:[]};
const TODAY="2026-11-08";
afterEach(()=>vi.unstubAllEnvs());
describe("read-only habit calendar dates and history",()=>{
  it("builds a six-week Monday-first month including leap day and adjacent months",()=>{
    const days=calendarDays("2024-02-20");expect(days).toHaveLength(42);expect(new Set(days).size).toBe(42);expect(days[0]).toBe("2024-01-29");expect(days[41]).toBe("2024-03-10");expect(days).toContain("2024-02-29");
    expect(calendarDays("2025-02-01")).not.toContain("2025-02-29");expect(monthStart("2026-12-31")).toBe("2026-12-01");
  });
  it("clamps month navigation and crosses year boundaries without rollover to the wrong month",()=>{
    expect(shiftCalendarMonth("2024-01-31",1)).toBe("2024-02-29");expect(shiftCalendarMonth("2025-01-31",1)).toBe("2025-02-28");
    expect(shiftCalendarMonth("2026-12-31",1)).toBe("2027-01-31");expect(shiftCalendarMonth("2026-01-31",-1)).toBe("2025-12-31");expect(shiftCalendarMonth("2024-02-29",12)).toBe("2025-02-28");
  });
  it("keeps date-only month cells and log keys stable in different local time zones",()=>{
    for(const zone of ["America/Chicago","America/Los_Angeles","Asia/Tokyo"]){
      vi.stubEnv("TZ",zone);const logged={...habit,days:{"2026-11-01":{amount:8,target:8}}};
      expect(calendarDays("2026-11-08")[0]).toBe("2026-10-26");expect(historyFor(logged,"2026-11-01",TODAY).log).toEqual({amount:8,target:8});
      expect(shiftCalendarMonth("2026-03-31",-1)).toBe("2026-02-28");
    }
  });
  it("uses each saved target instead of today's target and distinguishes partial, zero and absent logs",()=>{
    const logged={...habit,days:{"2026-11-05":{amount:8,target:8},"2026-11-06":{amount:3,target:8},"2026-11-07":{amount:0,target:8}}};
    expect(historyFor(logged,"2026-11-05",TODAY)).toMatchObject({state:"complete",log:{amount:8,target:8}});
    expect(historyFor(logged,"2026-11-06",TODAY).state).toBe("partial");expect(historyFor(logged,"2026-11-07",TODAY).state).toBe("zero");
    expect(historyFor(logged,TODAY,TODAY)).toMatchObject({state:"no-log",log:undefined});
  });
  it("identifies future and pre-creation dates while retaining explicit legacy or future records",()=>{
    expect(historyFor(habit,"2026-11-09",TODAY).state).toBe("future");expect(historyFor(habit,"2026-10-25",TODAY).state).toBe("before-creation");
    const logged={...habit,days:{"2026-10-25":{amount:1,target:1},"2026-11-09":{amount:1,target:8}}};
    expect(historyFor(logged,"2026-10-25",TODAY)).toMatchObject({state:"complete",beforeCreation:true});expect(historyFor(logged,"2026-11-09",TODAY)).toMatchObject({state:"partial",future:true});
  });
  it("does not infer missing historical targets or active/archive periods",()=>{
    const archived={...habit,isActive:false};expect(historyFor(archived,"2026-11-04",TODAY)).toMatchObject({state:"no-log",log:undefined});
    expect(calendarHabits([habit,archived],false,"all")).toEqual([habit]);expect(calendarHabits([habit,{...archived,id:"old"}],true,"old")).toEqual([{...archived,id:"old"}]);
  });
  it("summarizes recorded targets without claiming that unlogged habits were missed or completed",()=>{
    const logged={...habit,days:{[TODAY]:{amount:8,target:8}}},other={...habit,id:"other"};
    expect(summarizeDay([logged,other],TODAY,TODAY)).toMatchObject({state:"complete",complete:1,recorded:1});
    expect(summarizeDay([logged,{...other,days:{[TODAY]:{amount:2,target:8}}}],TODAY,TODAY)).toMatchObject({state:"partial",complete:1,recorded:2});
    expect(summarizeDay([habit],"2026-10-20",TODAY).state).toBe("before-creation");expect(summarizeDay([habit],"2026-11-10",TODAY).state).toBe("future");
  });
  it("reports full Monday–Sunday weekly counts using saved daily targets, without changing streaks",()=>{
    const weekly={...habit,frequency:"weekly" as const,targetPerWeek:3,days:{"2026-11-01":{amount:1,target:1},"2026-11-02":{amount:8,target:8},"2026-11-08":{amount:9,target:8},"2026-11-09":{amount:1,target:1}},checkIns:["2026-11-01","2026-11-02","2026-11-08","2026-11-09"]};
    expect(recordedWeek(weekly,"2026-11-04")).toBe(2);expect(historyFor(weekly,"2026-11-04",TODAY).state).toBe("no-log");expect(weekly.targetPerWeek).toBe(3);
    expect(recordedWeek({...weekly,frequency:"custom"},"2026-11-08")).toBe(2);
  });
  it("supports keyboard day/week/month/year navigation",()=>{
    expect(calendarKeyDate("2026-11-08","ArrowRight")).toBe("2026-11-09");expect(calendarKeyDate("2026-11-08","ArrowUp")).toBe("2026-11-01");
    expect(calendarKeyDate("2026-11-08","Home")).toBe("2026-11-02");expect(calendarKeyDate("2026-11-04","End")).toBe("2026-11-08");
    expect(calendarKeyDate("2024-01-31","PageDown")).toBe("2024-02-29");expect(calendarKeyDate("2024-02-29","PageUp",true)).toBe("2023-02-28");expect(calendarKeyDate(TODAY,"Enter")).toBeNull();
  });
  it("validates native date input and leaves all habit data unchanged",()=>{
    expect(validCalendarDate("2024-02-29")).toBe(true);expect(validCalendarDate("2025-02-29")).toBe(false);expect(validCalendarDate("2026-11-08T00:00:00Z")).toBe(false);
    const logged={...habit,days:{[TODAY]:{amount:8,target:8}}};const before=JSON.stringify(logged);calendarDays(TODAY).forEach(date=>summarizeDay([logged],date,TODAY));expect(JSON.stringify(logged)).toBe(before);
  });
});
