import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getVerifiedUserId, TaskDataError, describeTaskError } from "./tasks";
import { timestampToLocalDateTime } from "@/lib/dates";
import type { HabitStatisticsData, StatisticsHabit, StatisticsRange, StatisticsTask } from "@/lib/statistics";

export type StatisticsSource<T>={status:"loading"}|{status:"error";error:string}|{status:"ready";data:T};
export interface StatisticsSnapshot {journal:StatisticsSource<string[]>;habits:StatisticsSource<HabitStatisticsData>;tasks:StatisticsSource<StatisticsTask[]>}
export const loadingStatistics=():StatisticsSnapshot=>({journal:{status:"loading"},habits:{status:"loading"},tasks:{status:"loading"}});
function fail(error:PostgrestError):never {
  if(["42P01","42703","PGRST205","PGRST204"].includes(error.code))throw new TaskDataError("This statistics source needs its database setup checked. Existing saved data has not been changed.");
  throw new TaskDataError(describeTaskError("load these statistics",error));
}
async function pages<T>(read:(start:number,end:number)=>PromiseLike<{data:T[]|null;error:PostgrestError|null}>):Promise<T[]>{
  const rows:T[]=[];for(let start=0;;start+=1000){const result=await read(start,start+999);if(result.error)fail(result.error);rows.push(...result.data??[]);if((result.data?.length??0)<1000)return rows;}
}
export async function fetchStatistics(range:StatisticsRange):Promise<StatisticsSnapshot>{
  const userId=await getVerifiedUserId(),db=createClient();
  // Only metadata/count inputs. Never read journal bodies, task notes, or game/browser storage.
  const journal=async()=>{
    const rows=await pages<{entry_date:string}>((start,end)=>db.from("journal_entries").select("id,entry_date").eq("user_id",userId).gte("entry_date",range.from).lte("entry_date",range.through).order("id").range(start,end));
    return rows.map(row=>row.entry_date);
  };
  const habits=async():Promise<HabitStatisticsData>=>{
    const [habitRows,logRows]=await Promise.all([
      pages<{id:string;name:string;unit:string;tracking_type:"check"|"quantity";is_active:boolean}>((start,end)=>db.from("habits").select("id,name,unit,tracking_type,is_active").eq("user_id",userId).order("id").range(start,end)),
      pages<{habit_id:string;completed_on:string;amount:number;target:number}>((start,end)=>db.from("habit_logs").select("id,habit_id,completed_on,amount,target").eq("user_id",userId).gte("completed_on",range.from).lte("completed_on",range.through).order("id").range(start,end)),
    ]);
    const mapped:StatisticsHabit[]=habitRows.map(row=>({id:row.id,name:row.name,unit:row.unit,trackingType:row.tracking_type,isActive:row.is_active}));
    const ids=new Set(mapped.map(habit=>habit.id));
    if(logRows.some(log=>!ids.has(log.habit_id)))throw new TaskDataError("Habit data changed while loading. Refresh statistics to get a consistent view.");
    return {habits:mapped,logs:logRows.map(row=>({habitId:row.habit_id,date:row.completed_on,amount:Number(row.amount),target:Number(row.target)}))};
  };
  const tasks=async()=>{
    const rows=await pages<{id:string;status:string;completed_at:string|null}>((start,end)=>db.from("tasks").select("id,status,completed_at").eq("user_id",userId).eq("status","done").gte("completed_at",range.utcFrom).lt("completed_at",range.utcUntil).order("id").range(start,end));
    return rows.map(row=>({id:row.id,status:row.status,completedAt:row.completed_at?timestampToLocalDateTime(row.completed_at):undefined}));
  };
  const [j,h,t]=await Promise.allSettled([journal(),habits(),tasks()]);
  function source<T>(result:PromiseSettledResult<T>):StatisticsSource<T>{return result.status==="fulfilled"?{status:"ready",data:result.value}:{status:"error",error:result.reason instanceof TaskDataError?result.reason.message:"Couldn’t load this source. Refresh to retry."};}
  return {journal:source(j),habits:source(h),tasks:source(t)};
}
