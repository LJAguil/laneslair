import { addDays, parseISODate, toISODate } from "./dates";
import { habitStartDate, weekStart } from "./habits";
import type { Habit, HabitDay } from "./types";

export type HistoryState="complete"|"partial"|"zero"|"no-log"|"future"|"before-creation";
export interface HabitHistory {habit:Habit;state:HistoryState;log:HabitDay|undefined;future:boolean;beforeCreation:boolean}
export const historyLabels:Record<HistoryState,string>={complete:"Target reached",partial:"Partial progress",zero:"Zero recorded", "no-log":"No log",future:"Future date","before-creation":"Before creation"};
export function validCalendarDate(date:string):boolean {return /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date;}
export function monthStart(date:string):string {return `${date.slice(0,7)}-01`;}
export function shiftCalendarMonth(date:string,months:number):string {
  const selected=parseISODate(date),day=selected.getDate();selected.setDate(1);selected.setMonth(selected.getMonth()+months);
  const last=new Date(selected.getFullYear(),selected.getMonth()+1,0).getDate();selected.setDate(Math.min(day,last));return toISODate(selected);
}
export function calendarDays(month:string):string[] {
  const first=monthStart(month),start=weekStart(first);
  return Array.from({length:42},(_,index)=>addDays(start,index));
}
export function historyFor(habit:Habit,date:string,today:string):HabitHistory {
  const log=habit.days[date],future=date>today,beforeCreation=date<habitStartDate(habit);
  // Explicit records take precedence: preserve legacy records near a creation/timezone boundary.
  const state:HistoryState=log?(log.amount>=log.target?"complete":log.amount>0?"partial":"zero"):future?"future":beforeCreation?"before-creation":"no-log";
  return {habit,state,log,future,beforeCreation};
}
export function calendarHabits(habits:Habit[],includeArchived:boolean,habitId:string):Habit[] {
  const visible=habits.filter(habit=>includeArchived||habit.isActive);
  return habitId==="all"?visible:visible.filter(habit=>habit.id===habitId);
}
export function summarizeDay(habits:Habit[],date:string,today:string){
  const rows=habits.map(habit=>historyFor(habit,date,today)),logged=rows.filter(row=>row.log);
  const complete=logged.filter(row=>row.state==="complete").length;
  const state:HistoryState=logged.length?(complete===logged.length?"complete":logged.some(row=>row.log!.amount>0)?"partial":"zero"):
    date>today?"future":rows.length&&rows.every(row=>row.beforeCreation)?"before-creation":"no-log";
  return {state,complete,recorded:logged.length,rows};
}
/** Calendar reports the full selected Monday–Sunday week, not a daily obligation. */
export function recordedWeek(habit:Habit,date:string):number {
  const start=weekStart(date),end=addDays(start,6);
  return Object.entries(habit.days).filter(([day,log])=>day>=start&&day<=end&&log.amount>=log.target).length;
}
export function calendarKeyDate(date:string,key:string,shift=false):string|null {
  const weekday=(parseISODate(date).getDay()+6)%7;
  switch(key){
    case "ArrowLeft":return addDays(date,-1);case "ArrowRight":return addDays(date,1);
    case "ArrowUp":return addDays(date,-7);case "ArrowDown":return addDays(date,7);
    case "Home":return addDays(date,-weekday);case "End":return addDays(date,6-weekday);
    case "PageUp":return shiftCalendarMonth(date,shift?-12:-1);case "PageDown":return shiftCalendarMonth(date,shift?12:1);
    default:return null;
  }
}
