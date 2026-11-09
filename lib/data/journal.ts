import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { TaskDataError, describeTaskError } from "./tasks";
import { journalBody, validJournalDate } from "@/lib/journal";
import { uuid } from "@/lib/push/validation";
import type { JournalEntry, JournalEntrySummary, JournalSource } from "@/lib/types";

export interface JournalRow {uses_additions?:boolean;id:string;user_id:string;entry_date:string;body:string;revision:number;created_at:string;updated_at:string}
export interface JournalSourceRow {id:string;user_id:string;note_id:string;entry_id:string;entry_date:string;added_at:string}
export interface JournalSaveRequest {id:string;date:string;expectedRevision:number|null;body:string}
export class JournalConflictError extends TaskDataError {}
const SUMMARY="id,entry_date,revision,created_at,updated_at";
export function entryFromRow(row:JournalRow):JournalEntry {return {...(row.uses_additions!==undefined?{usesAdditions:row.uses_additions}:{}),id:row.id,date:row.entry_date,body:row.body,revision:Number(row.revision),createdAt:row.created_at,updatedAt:row.updated_at};}
export function sourceFromRow(row:JournalSourceRow):JournalSource {return {id:row.id,noteId:row.note_id,entryId:row.entry_id,date:row.entry_date,addedAt:row.added_at};}
function checkDate(date:string){if(!validJournalDate(date))throw new TaskDataError("Choose a valid journal date.");}
function fail(error:PostgrestError):never {
  if(["42P01","42883","PGRST202","PGRST205"].includes(error.code))throw new TaskDataError("Journal setup is needed. Review migration 004 in docs/JOURNAL_SETUP.md, then retry.",error);
  if(error.code==="40001")throw new JournalConflictError("Saved text changed. Review the current version before saving your draft.",error);
  if(error.code==="P0002")throw new TaskDataError("This capture is no longer available. Your journal text has been preserved.",error);
  if(error.code==="23514")throw new TaskDataError("Nothing was appended. The entry must contain text and stay under 100,000 characters.",error);
  if(error.code==="22023")throw new TaskDataError("Check the date/text and restore archived captures before adding them. If this was a retry, reload the saved entry first.",error);
  throw new TaskDataError(describeTaskError("save or load your journal",error),error);
}
export async function fetchJournalEntry(userId:string,date:string):Promise<JournalEntry|null> {
  checkDate(date);
  const {data,error}=await createClient().from("journal_entries").select("*").eq("user_id",userId).eq("entry_date",date).maybeSingle();
  if(error)fail(error);return data?entryFromRow(data as JournalRow):null;
}
async function pages<T>(read:(from:number,to:number)=>PromiseLike<{data:T[]|null;error:PostgrestError|null}>):Promise<T[]> {
  const rows:T[]=[];
  for(let start=0;;start+=1000){const result=await read(start,start+999);if(result.error)fail(result.error);rows.push(...result.data??[]);if((result.data?.length??0)<1000)return rows;}
}
export async function fetchJournalIndex(userId:string):Promise<{dates:JournalEntrySummary[];sources:JournalSource[]}> {
  const db=createClient();
  const [entries,sources]=await Promise.all([
    pages<Omit<JournalRow,"body"|"user_id">>((from,to)=>db.from("journal_entries").select(SUMMARY).eq("user_id",userId).order("entry_date",{ascending:false}).range(from,to)),
    pages<JournalSourceRow>((from,to)=>db.from("journal_sources").select("id,user_id,note_id,entry_id,entry_date,added_at").eq("user_id",userId).order("id").range(from,to)),
  ]);
  return {dates:entries.map(row=>({id:row.id,date:row.entry_date,revision:Number(row.revision),createdAt:row.created_at,updatedAt:row.updated_at})),sources:sources.map(sourceFromRow)};
}
export async function saveJournalEntry(request:JournalSaveRequest):Promise<JournalEntry|null> {
  checkDate(request.date);uuid(request.id);
  try{journalBody(request.body);}catch(error){throw new TaskDataError((error as Error).message);}
  const {data,error}=await createClient().rpc("save_journal_entry",{p_operation_id:request.id,p_date:request.date,p_expected_revision:request.expectedRevision,p_body:request.body});
  if(error)fail(error);return data.entry?entryFromRow(data.entry as JournalRow):null;
}
export async function appendCaptureToJournal(noteId:string,date:string,expectedBody:string):Promise<{entry:JournalEntry|null;source:JournalSource;replayed:boolean}> {
  checkDate(date);uuid(noteId);
  const {data,error}=await createClient().rpc("append_capture_to_journal",{p_note_id:noteId,p_date:date,p_expected_body:expectedBody});
  if(error?.code==="40001")throw new JournalConflictError("This capture changed after you opened it. Reload Inbox and review the original before adding it.",error);
  if(error)fail(error);return {entry:data.entry?entryFromRow(data.entry as JournalRow):null,source:sourceFromRow(data.source as JournalSourceRow),replayed:data.replayed};
}
