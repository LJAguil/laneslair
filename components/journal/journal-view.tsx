"use client";

import { BookOpen, ChevronLeft, ChevronRight, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { addDays, formatLongDate, formatShortDate } from "@/lib/dates";
import { journalDirty, MAX_JOURNAL_LENGTH, validJournalDate } from "@/lib/journal";
import { TaskDataError } from "@/lib/data/tasks";
import { useAppActions, useAppState } from "@/lib/store/app-store";

export function JournalView(){
  const {today,journalDates,journalIndexStatus,journalIndexError}=useAppState();
  const {loadJournalDate,loadJournalIndex}=useAppActions();
  const params=useSearchParams(),router=useRouter();
  const requested=params.get("date"),date=requested&&validJournalDate(requested)?requested:today;
  useEffect(()=>{void loadJournalDate(date);},[loadJournalDate,date]);
  function choose(day:string){if(validJournalDate(day))router.push(`/journal?date=${day}`,{scroll:false});}
  return <div className="mx-auto max-w-5xl space-y-5">
    <PageHeader title="Journal" description="One page for each day. Write a little, or bring a thought over from Inbox." />
    {requested&&!validJournalDate(requested)&&<p role="alert" className="text-sm text-warning">That date wasn’t valid. Showing today instead.</p>}
    <div className="flex flex-wrap items-center gap-2" aria-label="Journal date navigation">
      <Button size="icon" onClick={()=>choose(addDays(date,-1))} aria-label="Previous journal day"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></Button>
      <label className="sr-only" htmlFor="journal-date">Entry date</label><Input id="journal-date" className="w-auto min-w-0" type="date" value={date} onChange={event=>choose(event.target.value)} />
      <Button size="icon" onClick={()=>choose(addDays(date,1))} aria-label="Next journal day"><ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
      <Button onClick={()=>choose(today)} disabled={date===today}>Today</Button>
    </div>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
      <JournalEditor key={date} date={date} />
      <Card>
        <CardHeader title="Your pages" description="Dates with a saved entry." icon={<BookOpen className="h-4 w-4" aria-hidden="true" />} />
        {journalIndexStatus==="loading"&&<p role="status" className="text-sm text-muted">Loading saved dates…</p>}
        {journalIndexStatus==="error"&&<div role="alert" className="space-y-2"><p className="text-sm text-danger">{journalIndexError}</p><Button onClick={()=>void loadJournalIndex()}>Retry journal setup</Button></div>}
        {journalIndexStatus==="ready"&&(journalDates.length?<ul className="max-h-80 space-y-1 overflow-y-auto">{journalDates.map(entry=><li key={entry.id}><Link href={`/journal?date=${entry.date}`} scroll={false} aria-current={date===entry.date?"date":undefined} className={`block rounded-lg px-3 py-2 text-sm ${date===entry.date?"bg-accent-soft text-accent-strong":"text-muted hover:bg-hover"}`}>{formatShortDate(entry.date)} · {entry.date.slice(0,4)}</Link></li>)}</ul>:<p className="text-sm text-muted">Your first saved entry will appear here.</p>)}
        <p className="mt-4 text-xs text-subtle">Entry dates follow the calendar day you choose. Notes stay private to your account.</p>
      </Card>
    </div>
  </div>;
}
function JournalEditor({date}:{date:string}){
  const {journalDrafts,journalEntries,journalDayStatus,journalDayErrors,pendingJournalDates,journalSources,inboxNotes,inboxStatus}=useAppState();
  const {setJournalDraft,resetJournalDraft,mergeJournalDraft,loadJournalDate,saveJournal}=useAppActions();
  const draft=journalDrafts[date],entry=journalEntries[date]??null,status=journalDayStatus[date]??"loading";
  const busy=pendingJournalDates.includes(date),dirty=Boolean(draft&&journalDirty(draft.body,draft.base));
  const changed=Boolean(dirty&&draft&&(draft.missingSavedEntry||draft.base?.id!==entry?.id||draft.base?.revision!==entry?.revision));
  const [error,setError]=useState<string|null>(null),[message,setMessage]=useState("");
  const saving=useRef(false);
  async function submit(event:FormEvent){
    event.preventDefault();if(!draft||saving.current)return;saving.current=true;setError(null);setMessage("");
    try{await saveJournal(date,draft);setMessage("Saved to your journal.");}
    catch(error){setError(error instanceof TaskDataError?error.message:"Couldn’t save. Your draft is still here.");}
    finally{saving.current=false;}
  }
  const sources=journalSources.filter(source=>source.date===date);
  return <Card className="min-w-0">
    <CardHeader title={formatLongDate(date)} description={entry?`Saved · revision ${entry.revision}`:"A little space to reflect."} />
    <Button size="sm" variant="ghost" className="mb-3" disabled={busy||status==="loading"} onClick={()=>void loadJournalDate(date)}>Refresh saved entry · keep my draft</Button>
    {status==="loading"&&<p role="status" className="mb-4 text-sm text-muted">Loading this entry…</p>}
    {status==="error"&&<div role="alert" className="mb-4 space-y-2"><p className="text-sm text-danger">{journalDayErrors[date]}</p><Button disabled={busy} onClick={()=>void loadJournalDate(date)}>Retry saved entry</Button></div>}
    {draft&&<form onSubmit={submit} className="space-y-4" aria-busy={busy}>
      <fieldset disabled={busy||status!=="ready"}>
        <Field label="Your entry" htmlFor="journal-body" hint="No prompts or perfect words required."><Textarea id="journal-body" className="min-h-72 resize-y text-base leading-relaxed" rows={12} maxLength={MAX_JOURNAL_LENGTH} value={draft.body} onChange={event=>{setJournalDraft(date,event.target.value);setError(null);setMessage("");}} placeholder="What’s on your mind today?" /></Field>
      </fieldset>
      {changed&&<div role="alert" className="space-y-3 rounded-xl border border-warning/40 bg-warning/5 p-3">
        <p className="text-sm text-warning">The saved entry has changed. Your draft is kept below; review both before saving.</p>
        <details><summary className="cursor-pointer py-2 text-sm text-muted">View current saved writing</summary>{entry?<Textarea aria-label="Current saved journal text" readOnly value={entry.body} rows={8} className="mt-2 text-base" />:<p className="text-sm text-muted">The earlier entry is no longer available.</p>}</details>
        <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={()=>{mergeJournalDraft(date);setError(null);setMessage("Review the combined draft and remove repeated text before saving.");}}>{entry?"Combine saved entry + my draft":"Create a replacement from my draft"}</Button>
          <Button variant="ghost" disabled={busy} onClick={()=>{resetJournalDraft(date);setError(null);setMessage("");}}>Use saved version · discard my draft</Button></div>
        <p className="text-xs text-muted">Combining changes the editor only. Nothing is written until you save.</p>
      </div>}
      {error&&<p role="alert" className="text-sm text-danger">{error}</p>}
      <p role="status" className="text-sm text-success">{message}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-subtle">{busy?"Saving…":dirty?"Unsaved draft · kept while moving around this app":"No unsaved changes"}</p>
        <div className="flex flex-wrap gap-2"><Button variant="ghost" disabled={busy||!dirty} onClick={()=>{resetJournalDraft(date);setError(null);setMessage("");}}>Discard my draft</Button><Button type="submit" variant="primary" disabled={busy||status!=="ready"||!dirty||!draft.body.trim()||changed}><Save className="h-4 w-4" aria-hidden="true" />{busy?"Saving…":"Save entry"}</Button></div>
      </div>
      <p className="text-xs text-subtle">Save before closing or refreshing. Unsaved drafts are held in memory, not browser storage; iPhone may not show a leave-page warning.</p>
    </form>}
    {sources.length>0&&<div className="mt-6 space-y-2 border-t border-line pt-4"><h3 className="text-sm font-medium">Added from Inbox</h3><ul className="space-y-2 text-sm text-muted">{sources.map(source=>{
      const original=inboxNotes.find(note=>note.id===source.noteId);
      return <li key={source.id}>{original?<Link className="block truncate text-accent-strong hover:underline" href="/inbox">{original.body.trim().split("\n")[0].slice(0,100)||"View original capture"}</Link>:inboxStatus==="loading"?"Loading original capture…":inboxStatus==="error"?"Original captures couldn’t load. Your saved journal writing is kept.":"Original capture is not currently available."}{entry?.id!==source.entryId&&<p className="text-xs text-warning">This link refers to an earlier entry that is no longer available.</p>}</li>;
    })}</ul><p className="text-xs text-subtle">Journal writing and original captures are independent copies.</p></div>}
    <Link href="/inbox" className={buttonClasses("ghost","sm","mt-5 min-h-11")}>Open Inbox to add a note</Link>
  </Card>;
}
