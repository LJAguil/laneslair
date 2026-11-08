import { addDays } from "@/lib/dates";
import { habitDay, habitWeekCount } from "@/lib/habits";
import type { Habit, Project, Task } from "@/lib/types";
import type { NotificationPreferences, ReminderRule } from "./types";

function parts(instant:number,zone:string) {
  const values=new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(instant);
  const get=(type:string)=>values.find(value=>value.type===type)!.value;
  return {day:`${get("year")}-${get("month")}-${get("day")}`,time:`${get("hour")}:${get("minute")}:${get("second")}`};
}
export function zonedDay(instant:number,zone:string) {return parts(instant,zone).day;}

/** Find both sides of a DST transition, reject gaps, choose standard/later fold like Postgres. */
export function reminderInstant(day:string,time:string,zone:string):number|null {
  const wall=Date.parse(`${day}T${time.slice(0,5)}:00Z`);
  if(!Number.isFinite(wall))return null;
  const offsets=new Set<number>();
  for(let hours=-36;hours<=36;hours+=12){
    const sample=wall+hours*3600000,local=parts(sample,zone);
    offsets.add(Date.parse(`${local.day}T${local.time}Z`)-sample);
  }
  const candidates=[...offsets].map(offset=>wall-offset).filter(instant=>{
    const local=parts(instant,zone);return local.day===day&&local.time===`${time.slice(0,5)}:00`;
  });
  return candidates.length?Math.max(...candidates):null;
}
export function duringQuietHours(instant:number,preferences:NotificationPreferences):boolean {
  if(!preferences.quiet_start||!preferences.quiet_end)return false;
  const time=parts(instant,preferences.time_zone).time;
  const start=preferences.quiet_start.slice(0,5),end=preferences.quiet_end.slice(0,5),clock=time.slice(0,5);
  return start<end?clock>=start&&clock<end:clock>=start||clock<end;
}
export interface UpcomingReminder { rule:ReminderRule; instant:number; title:string; kind:"task"|"habit" }
export function upcomingReminders({rules,preferences,tasks,habits,projects,now}:{
  rules:ReminderRule[];preferences:NotificationPreferences;tasks:Task[];habits:Habit[];projects:Project[];now:number;
}):UpcomingReminder[] {
  if(preferences.paused)return [];
  const result:UpcomingReminder[]=[];
  for(const rule of rules.filter(rule=>rule.enabled)){
    try {
      const task=tasks.find(task=>task.id===rule.task_id),habit=habits.find(habit=>habit.id===rule.habit_id);
      if(rule.task_id&&(!task||!["todo","in_progress"].includes(task.status)||projects.some(project=>project.id===task.projectId&&project.status==="archived")))continue;
      if(rule.habit_id&&(!habit||!habit.isActive))continue;
      const today=zonedDay(now,rule.time_zone);
      const days=rule.task_id?[rule.local_date!]:[today,addDays(today,1),addDays(today,2)];
      for(const day of days){
        const instant=reminderInstant(day,rule.local_time,rule.time_zone);
        if(instant===null||instant<now||instant>now+86400000||duringQuietHours(instant,preferences))continue;
        if(habit){
          const progress=habitDay(habit,day);
          if(progress.amount>=progress.target||(habit.frequency!=="daily"&&habitWeekCount(habit,day)>=habit.targetPerWeek))continue;
        }
        result.push({rule,instant,title:task?.title??habit!.name,kind:task?"task":"habit"});break;
      }
    }catch{ /* A malformed legacy zone cannot break Today. Editing the rule validates it. */ }
  }
  return result.sort((a,b)=>a.instant-b.instant||a.rule.id.localeCompare(b.rule.id)).slice(0,4);
}
