import * as data from "@/lib/data/journal";
import { getVerifiedUserId, TaskDataError } from "@/lib/data/tasks";
import { appendJournalBody, journalBody, journalDirty } from "@/lib/journal";
import type { InboxNote, JournalEntry, JournalEntrySummary, JournalSource } from "@/lib/types";

type Status="loading"|"ready"|"error";
export interface JournalDraft {body:string;base:JournalEntry|null;missingSavedEntry?:boolean}
export interface JournalSlice {
  journalSources:JournalSource[];journalDates:JournalEntrySummary[];
  journalIndexStatus:Status;journalIndexError:string|null;
  journalEntries:Record<string,JournalEntry|null>;
  journalDayStatus:Record<string,Status>;journalDayErrors:Record<string,string|null>;
  journalDrafts:Record<string,JournalDraft>;pendingJournalDates:string[];pendingJournalNotes:string[];
}
export const initialJournalState:JournalSlice={journalSources:[],journalDates:[],journalIndexStatus:"loading",journalIndexError:null,journalEntries:{},journalDayStatus:{},journalDayErrors:{},journalDrafts:{},pendingJournalDates:[],pendingJournalNotes:[]};
export type JournalAction=
  |{type:"journal/index-loading"}|{type:"journal/index-error";message:string}
  |{type:"journal/index";dates:JournalEntrySummary[];sources:JournalSource[]}
  |{type:"journal/day-loading";date:string}|{type:"journal/day-error";date:string;message:string}
  |{type:"journal/entry";date:string;entry:JournalEntry|null;submittedBody?:string}
  |{type:"journal/source";source:JournalSource}
  |{type:"journal/draft";date:string;body:string}|{type:"journal/reset";date:string}|{type:"journal/merge";date:string}
  |{type:"journal/pending";date:string;pending:boolean}|{type:"journal/note-pending";id:string;pending:boolean};
function summaries(dates:JournalEntrySummary[],date:string,entry:JournalEntry|null){
  const rest=dates.filter(row=>row.date!==date);
  if(entry){const {body: _body,...summary}=entry;void _body;rest.push(summary);}
  return rest.sort((a,b)=>b.date.localeCompare(a.date));
}
export function reduceJournal(state:JournalSlice,action:JournalAction):JournalSlice {
  switch(action.type){
    case "journal/index-loading":return {...state,journalIndexStatus:"loading",journalIndexError:null};
    case "journal/index-error":return {...state,journalIndexStatus:"error",journalIndexError:action.message};
    case "journal/index":return {...state,journalIndexStatus:"ready",journalIndexError:null,journalDates:action.dates,journalSources:action.sources};
    case "journal/day-loading":return {...state,journalDayStatus:{...state.journalDayStatus,[action.date]:"loading"},journalDayErrors:{...state.journalDayErrors,[action.date]:null}};
    case "journal/day-error":return {...state,journalDayStatus:{...state.journalDayStatus,[action.date]:"error"},journalDayErrors:{...state.journalDayErrors,[action.date]:action.message}};
    case "journal/entry":{
      const previous=state.journalEntries[action.date];
      if(previous&&action.entry&&previous.id===action.entry.id&&previous.revision>action.entry.revision)return state;
      const draft=state.journalDrafts[action.date];
      const confirmed=action.submittedBody!==undefined&&draft?.body===action.submittedBody&&action.entry?.body===action.submittedBody;
      const next=draft&&journalDirty(draft.body,draft.base)&&!confirmed?{...draft,...(action.entry===null&&action.submittedBody!==undefined?{missingSavedEntry:true}:{})}:{body:action.entry?.body??"",base:action.entry};
      return {...state,journalEntries:{...state.journalEntries,[action.date]:action.entry},journalDates:summaries(state.journalDates,action.date,action.entry),
        journalDayStatus:{...state.journalDayStatus,[action.date]:"ready"},journalDayErrors:{...state.journalDayErrors,[action.date]:null},journalDrafts:{...state.journalDrafts,[action.date]:next}};
    }
    case "journal/source":return {...state,journalSources:[...state.journalSources.filter(source=>source.noteId!==action.source.noteId),action.source]};
    case "journal/draft":return {...state,journalDrafts:{...state.journalDrafts,[action.date]:{...state.journalDrafts[action.date],body:action.body,base:state.journalDrafts[action.date]?state.journalDrafts[action.date].base:state.journalEntries[action.date]??null}}};
    case "journal/reset":return {...state,journalDrafts:{...state.journalDrafts,[action.date]:{body:state.journalEntries[action.date]?.body??"",base:state.journalEntries[action.date]??null}}};
    case "journal/merge":{
      const latest=state.journalEntries[action.date]??null,draft=state.journalDrafts[action.date];
      return {...state,journalDrafts:{...state.journalDrafts,[action.date]:{body:latest&&latest.body===draft?.body?draft.body:appendJournalBody(latest?.body??"",draft?.body??""),base:latest}}};
    }
    case "journal/pending":return {...state,pendingJournalDates:action.pending?[...state.pendingJournalDates,action.date]:state.pendingJournalDates.filter(date=>date!==action.date)};
    case "journal/note-pending":return {...state,pendingJournalNotes:action.pending?[...state.pendingJournalNotes,action.id]:state.pendingJournalNotes.filter(id=>id!==action.id)};
  }
}
const message=(error:unknown)=>error instanceof TaskDataError?error.message:"Couldn’t reach your journal. Your draft is still here; try again.";
export function createJournalActions(dispatch:(action:JournalAction)=>void,notify:(kind:"success"|"error",message:string)=>void){
  let revision=0,indexRead=0;
  const reads=new Map<string,number>(),writes=new Map<string,{revision:number;entry:JournalEntry|null}>(),sources=new Map<string,{revision:number;source:JournalSource}>();
  const pendingDates=new Set<string>(),pendingNotes=new Set<string>(),requests=new Map<string,data.JournalSaveRequest>();
  function publish(entry:JournalEntry|null,date:string,submittedBody?:string){writes.set(date,{revision:++revision,entry});dispatch({type:"journal/entry",date,entry,submittedBody});}
  return {
    async loadJournalIndex({showLoading=true}={}){
      const sequence=++indexRead,start=revision;if(showLoading)dispatch({type:"journal/index-loading"});
      try{
        const result=await data.fetchJournalIndex(await getVerifiedUserId());if(sequence!==indexRead)return;
        let dates=result.dates;
        writes.forEach((write,date)=>{if(write.revision>start)dates=summaries(dates,date,write.entry);});
        const merged=new Map(result.sources.map(source=>[source.noteId,source]));
        sources.forEach(write=>{if(write.revision>start)merged.set(write.source.noteId,write.source);});
        dispatch({type:"journal/index",dates,sources:[...merged.values()]});
      }catch(error){if(sequence===indexRead)dispatch({type:"journal/index-error",message:message(error)});}
    },
    async loadJournalDate(date:string){
      const sequence=(reads.get(date)??0)+1,start=revision;reads.set(date,sequence);dispatch({type:"journal/day-loading",date});
      try{
        const entry=await data.fetchJournalEntry(await getVerifiedUserId(),date);if(reads.get(date)!==sequence)return;
        const recent=writes.get(date);dispatch({type:"journal/entry",date,entry:recent&&recent.revision>start?recent.entry:entry});
      }catch(error){if(reads.get(date)===sequence)dispatch({type:"journal/day-error",date,message:message(error)});}
    },
    setJournalDraft(date:string,body:string){dispatch({type:"journal/draft",date,body});},
    resetJournalDraft(date:string){requests.delete(date);dispatch({type:"journal/reset",date});},
    mergeJournalDraft(date:string){requests.delete(date);dispatch({type:"journal/merge",date});},
    async saveJournal(date:string,draft:JournalDraft){
      if(pendingDates.has(date))throw new TaskDataError("This entry is still saving. Wait a moment.");
      try{journalBody(draft.body);}catch(error){throw new TaskDataError((error as Error).message);}
      const old=requests.get(date),base=draft.base?.revision??null;
      const request=old&&old.body===draft.body&&old.expectedRevision===base?old:{id:crypto.randomUUID(),date,expectedRevision:base,body:draft.body};
      requests.set(date,request);pendingDates.add(date);dispatch({type:"journal/pending",date,pending:true});
      try{
        await getVerifiedUserId();const entry=await data.saveJournalEntry(request);
        publish(entry,date,request.body);
        if(!entry)throw new TaskDataError("Your earlier save was confirmed, but that entry is no longer available. Your draft is kept; reload to review before creating a replacement.");
        if(entry.body!==request.body)throw new data.JournalConflictError("Your earlier save was confirmed, but the saved entry now has newer writing. Review it before changing anything.");
        requests.delete(date);notify("success","Journal entry saved");return entry;
      }catch(error){
        if(error instanceof data.JournalConflictError){
          requests.delete(date);
          try{publish(await data.fetchJournalEntry(await getVerifiedUserId(),date),date);}catch{ /* Keep the draft and original conflict if the refresh also fails. */ }
        }
        throw error;
      }finally{pendingDates.delete(date);dispatch({type:"journal/pending",date,pending:false});}
    },
    async addCaptureToJournal(note:InboxNote,date:string){
      if(pendingNotes.has(note.id))throw new TaskDataError("This capture is still being added. Wait a moment.");
      pendingNotes.add(note.id);dispatch({type:"journal/note-pending",id:note.id,pending:true});
      try{
        await getVerifiedUserId();const result=await data.appendCaptureToJournal(note.id,date,note.body);
        publish(result.entry,result.source.date);
        sources.set(result.source.noteId,{revision:++revision,source:result.source});dispatch({type:"journal/source",source:result.source});
        notify(result.entry?"success":"error",result.entry?(result.replayed?"Already added to your journal — no duplicate created":"Added to journal — original capture kept") :"This capture was already added, but that entry is no longer available. Your original capture is kept.");
        return result;
      }finally{pendingNotes.delete(note.id);dispatch({type:"journal/note-pending",id:note.id,pending:false});}
    },
  };
}
