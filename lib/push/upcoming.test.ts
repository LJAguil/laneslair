import { describe, expect, it } from "vitest";
import { duringQuietHours, reminderInstant, upcomingReminders } from "./upcoming";
import type { ReminderRule, NotificationPreferences } from "./types";
import type { Habit, Task } from "@/lib/types";

const now=Date.parse("2026-11-07T14:00:00Z");
const preferences:NotificationPreferences={paused:false,time_zone:"America/Chicago",quiet_start:null,quiet_end:null};
const task:Task={id:"task",title:"Read",status:"todo",priority:"medium",createdAt:"2026-11-01",dueDate:"2026-11-07"};
const habit:Habit={id:"habit",name:"Water",description:"",frequency:"daily",targetPerWeek:7,trackingType:"quantity",dailyTarget:8,unit:"glasses",streakEnabled:true,isActive:true,createdAt:"2026-11-01",days:{},checkIns:[],color:"blue"};
const rule:ReminderRule={id:"rule",task_id:task.id,habit_id:null,enabled:true,local_date:"2026-11-07",local_time:"09:00:00",time_zone:"America/Chicago"};
const preview=(extra:Partial<Parameters<typeof upcomingReminders>[0]>={})=>upcomingReminders({rules:[rule],preferences,tasks:[task],habits:[habit],projects:[],now,...extra});
describe("upcoming reminder preview",()=>{
  it("converts explicit zones with DST gaps rejected and folds using the later occurrence",()=>{
    expect(reminderInstant("2026-11-07","09:00","America/Chicago")).toBe(Date.parse("2026-11-07T15:00:00Z"));
    expect(reminderInstant("2027-03-14","02:30","America/Chicago")).toBeNull();
    expect(reminderInstant("2026-11-01","01:30","America/Chicago")).toBe(Date.parse("2026-11-01T07:30:00Z"));
    expect(reminderInstant("2026-11-07","09:00","Asia/Kathmandu")).toBe(Date.parse("2026-11-07T03:15:00Z"));
  });
  it("shows opted-in reminders, never infers noon reminders from task due dates",()=>{
    expect(preview()).toHaveLength(1);expect(preview({rules:[]})).toEqual([]);expect(preview({rules:[{...rule,enabled:false}]})).toEqual([]);
    expect(preview({now:Date.parse("2026-11-07T16:00Z")})).toEqual([]);
  });
  it("omits paused, quiet, completed, cancelled, deleted and archived-project tasks",()=>{
    expect(preview({preferences:{...preferences,paused:true}})).toEqual([]);
    expect(preview({preferences:{...preferences,quiet_start:"22:00",quiet_end:"10:00"}})).toEqual([]);
    for(const status of ["done","cancelled"] as const)expect(preview({tasks:[{...task,status}]})).toEqual([]);
    expect(preview({tasks:[]})).toEqual([]);
    expect(preview({tasks:[{...task,projectId:"project"}],projects:[{id:"project",name:"Archived",description:"",status:"archived",color:"violet"}]})).toEqual([]);
  });
  it("uses the saved habit target and previews tomorrow after today's completion",()=>{
    const habitRule={...rule,task_id:null,habit_id:habit.id,local_date:null};
    const completed={...habit,dailyTarget:10,days:{"2026-11-07":{amount:8,target:8}},checkIns:["2026-11-07"]};
    expect(preview({rules:[habitRule],habits:[completed]})).toEqual([]); // Tomorrow 09:00 is outside next 24h.
    const list=preview({rules:[habitRule],habits:[completed],now:Date.parse("2026-11-07T16:00Z")});
    expect(list[0].instant).toBe(Date.parse("2026-11-08T15:00Z"));
    expect(preview({rules:[habitRule],habits:[{...habit,isActive:false}]})).toEqual([]);
  });
  it("handles quiet hours across midnight with an exclusive end",()=>{
    const prefs={...preferences,quiet_start:"22:00",quiet_end:"08:00"};
    expect(duringQuietHours(Date.parse("2026-11-08T05:00Z"),prefs)).toBe(true);
    expect(duringQuietHours(Date.parse("2026-11-08T14:00Z"),prefs)).toBe(false);
  });
});
