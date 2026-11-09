"use client";
import { useCallback,useEffect,useRef,useState,useId } from "react";
import { Card,CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { AdditionsSetupError,fetchJournalAdditions,saveJournalAddition,type JournalAddition } from "@/lib/data/journal-additions";
import { useAppActions,useAppState } from "@/lib/store/app-store";
import { MAX_JOURNAL_LENGTH } from "@/lib/journal";
export const additionTime=(time:string)=>new Date(time).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
type State={status:'loading'}|{status:'setup'|'error';message:string}|{status:'ready';rows:JournalAddition[]};
export function JournalAdditions({date}:{date:string}){
 const {journalEntries,journalAdditionDrafts}=useAppState(),[state,setState]=useState<State>({status:'loading'}),sequence=useRef({value:0}),revision=journalEntries[date]?.revision;
 const load=useCallback(async()=>{const request=++sequence.current.value;setState({status:'loading'});try{const rows=await fetchJournalAdditions(date);if(request===sequence.current.value)setState({status:'ready',rows});}catch(error){if(request===sequence.current.value)setState({status:error instanceof AdditionsSetupError?'setup':'error',message:error instanceof Error?error.message:'Couldn’t load your additions.'});}},[date]);
 useEffect(()=>{const pending=sequence.current;let active=true;void Promise.resolve().then(()=>{if(active)void load();});return()=>{active=false;pending.value++;};},[load,revision]);
 if(state.status==='loading')return <Card><p role="status" className="text-sm text-muted">Loading timestamped additions…</p></Card>;
 if(state.status!=='ready')return <Card><p role="alert" className="text-sm text-warning">{state.message}</p><Button className="mt-3" onClick={()=>void load()}>Retry timestamped writing</Button></Card>;
 return <section className="min-w-0 space-y-4" aria-label="Timestamped journal additions">
 <Card><CardHeader title="Add to this day" description="Each saved addition keeps its own added time. You can edit it later." action={<Button size="sm" onClick={()=>void load()}>Refresh additions</Button>} /><AdditionForm date={date} draftKey={`${date}/new`} addition={state.rows.find(row=>row.id===journalAdditionDrafts[`${date}/new`]?.id)} onSaved={load} /></Card>
 {state.rows.length?<ol className="space-y-4" aria-label="Writing added to this day">{state.rows.map(addition=><li key={addition.id}><AdditionCard addition={addition} reload={load} /></li>)}</ol>:<p className="text-sm text-muted">No timestamped additions yet. Earlier daily-page writing, if any, is kept below.</p>}
 <p className="text-xs text-subtle">Added times come from the server and display in this device’s time zone. Choosing an older entry date doesn’t backdate when you wrote it.</p>
 </section>;
}
export function AdditionCard({addition,reload}:{addition:JournalAddition;reload:()=>Promise<void>}){
 const [editing,setEditing]=useState(false),{journalAdditionDrafts}=useAppState(),key=`${addition.date}/${addition.id}`,draft=journalAdditionDrafts[key];
 return <Card className="space-y-3"><h3 className="text-sm font-medium">{addition.legacy?'Earlier daily page · first saved':'Added'} <time dateTime={addition.createdAt}>{additionTime(addition.createdAt)}</time></h3>
 {addition.legacy&&<p className="text-xs text-muted">This is your original combined writing. Its paragraphs may have been added at different times; those individual times weren’t recorded.</p>}
 {addition.updatedAt!==addition.createdAt&&<p className="text-xs text-subtle">Last edited <time dateTime={addition.updatedAt}>{additionTime(addition.updatedAt)}</time></p>}
 {addition.sourceNoteId&&<p className="text-xs text-muted">Added from Inbox · original capture is preserved.</p>}
 {editing||draft?<AdditionForm date={addition.date} addition={addition} onSaved={async()=>{setEditing(false);await reload();}} onCancel={()=>setEditing(false)} />:<><p className="whitespace-pre-wrap break-words text-base leading-relaxed">{addition.body}</p><Button onClick={()=>setEditing(true)}>Edit this addition</Button></>}
 </Card>;
}
function AdditionForm({date,addition,onSaved,onCancel,draftKey}:{date:string;addition?:JournalAddition;draftKey?:string;onSaved:()=>Promise<void>;onCancel?:()=>void}){
 const {journalAdditionDrafts}=useAppState(),{setJournalAdditionDraft,clearJournalAdditionDraft,rebaseJournalAdditionDraft,loadJournalDate,loadJournalIndex}=useAppActions();
 const inputId=useId(),key=draftKey??`${date}/${addition?.id??'new'}`,draft=journalAdditionDrafts[key],body=draft?.body??addition?.body??'',changed=Boolean(draft&&addition&&draft.revision!==addition.revision);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),saving=useRef(false);
 async function save(event:React.FormEvent){event.preventDefault();if(!draft||saving.current)return;saving.current=true;setBusy(true);setError('');setMessage('');try{const result=await saveJournalAddition(date,draft);if(!result.addition||result.addition.body!==draft.body)throw new Error('The earlier save was confirmed, but newer writing exists. Your draft is kept; refresh to review.');clearJournalAdditionDraft(key,draft.body);setMessage('Saved with its added time.');await loadJournalDate(date);await loadJournalIndex({showLoading:false});await onSaved();}catch(error){setError(error instanceof Error?error.message:'Couldn’t save. Your draft is kept.');}finally{saving.current=false;setBusy(false);}}
 return <form onSubmit={save} className="space-y-3" aria-busy={busy}>
 <label htmlFor={inputId} className="sr-only">{addition?'Edit this addition':'New journal addition'}</label>
 <Textarea id={inputId} rows={addition?6:4} className="journal-writing min-h-32 text-base leading-relaxed" autoCapitalize="sentences" spellCheck enterKeyHint="enter" maxLength={MAX_JOURNAL_LENGTH} disabled={busy} value={body} placeholder="What’s on your mind now?" onChange={event=>{setJournalAdditionDraft(key,event.target.value,addition);setError('');setMessage('');}} />
 {changed&&<div role="alert" className="space-y-2 text-sm text-warning"><p>A newer edit exists. Your draft is kept. Review the current saved text before replacing your draft.</p><details><summary>Current saved text</summary><p className="whitespace-pre-wrap text-muted">{addition?.body}</p></details><Button disabled={busy} onClick={()=>{if(addition)rebaseJournalAdditionDraft(key,addition);setError('');}}>Reviewed saved text · keep my draft for the next save</Button><p className="text-xs text-muted">This changes the edit base only. Nothing is overwritten until you save changes.</p></div>}
 {error&&<p role="alert" className="text-sm text-danger">{error}</p>}{message&&<p role="status" className="text-sm text-success">{message}</p>}
 <div className="flex flex-wrap gap-2"><Button type="submit" variant="primary" disabled={busy||!draft||body===draft.baseBody||!body.trim()||changed}>{busy?'Saving…':addition?'Save changes':'Save addition'}</Button>{(addition||draft)&&<Button disabled={busy} onClick={()=>{clearJournalAdditionDraft(key);setError('');onCancel?.();}}>{addition?'Cancel edit':'Discard new draft'}</Button>}</div>
 <p className="text-xs text-subtle">Save before closing or refreshing. Unsaved writing stays in app memory only.</p>
 </form>;
}
