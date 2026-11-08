import { addDays, parseISODate } from "./dates";
import { validCalendarDate } from "./habit-calendar";

export type PeriodDays=7|30|90;
export interface StatisticsRange {from:string;through:string;length:PeriodDays;utcFrom:string;utcUntil:string;dates:string[]}
export function statisticsRange(today:string,length:PeriodDays):StatisticsRange {
  if(!validCalendarDate(today)||![7,30,90].includes(length))throw new Error("Choose a valid statistics period.");
  const from=addDays(today,1-length),until=addDays(today,1);
  return {from,through:today,length,utcFrom:parseISODate(from).toISOString(),utcUntil:parseISODate(until).toISOString(),dates:Array.from({length},(_,index)=>addDays(from,index))};
}
export interface StatisticsHabit {id:string;name:string;unit:string;trackingType:"check"|"quantity";isActive:boolean}
export interface StatisticsLog {habitId:string;date:string;amount:number;target:number}
export interface StatisticsTask {id:string;status:string;completedAt?:string}
export interface HabitStatisticsData {habits:StatisticsHabit[];logs:StatisticsLog[]}
const inRange=(date:string,range:StatisticsRange)=>validCalendarDate(date)&&date>=range.from&&date<=range.through;
export function journalStatistics(dates:string[],range:StatisticsRange){
  const saved=new Set(dates.filter(date=>inRange(date,range)));
  return {count:saved.size,denominator:range.length,percent:saved.size/range.length*100,saved};
}
export function habitStatistics(data:HabitStatisticsData,range:StatisticsRange){
  const ids=new Set(data.habits.map(habit=>habit.id));
  const records=[...new Map(data.logs.filter(log=>ids.has(log.habitId)&&inRange(log.date,range)).map(log=>[`${log.habitId}/${log.date}`,log])).values()];
  const reached=records.filter(log=>log.amount>=log.target);
  return {recorded:records.length,reached:reached.length,percent:records.length?reached.length/records.length*100:null,days:new Set(records.map(log=>log.date)).size,records};
}
export function taskStatistics(tasks:StatisticsTask[],range:StatisticsRange){
  const completed=[...new Map(tasks.filter(task=>task.status==="done"&&task.completedAt&&inRange(task.completedAt.slice(0,10),range)).map(task=>[task.id,task])).values()];
  return {count:new Set(completed.map(task=>task.id)).size,completed};
}
export function quantityStatistics(data:HabitStatisticsData,habitId:string,range:StatisticsRange){
  const habit=data.habits.find(habit=>habit.id===habitId&&habit.trackingType==="quantity");
  if(!habit)return null;
  const byDate=new Map(data.logs.filter(log=>log.habitId===habitId&&inRange(log.date,range)).map(log=>[log.date,log]));
  const rows=range.dates.map(date=>({date,log:byDate.get(date)}));
  const records=[...byDate.values()],total=records.reduce((sum,log)=>sum+log.amount,0);
  return {habit,rows,total,recordedDays:records.length,mean:records.length?total/records.length:null,reached:records.filter(log=>log.amount>=log.target).length,max:Math.max(0,...records.map(log=>log.amount))};
}
