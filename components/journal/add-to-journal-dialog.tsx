"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import { appendJournalBody, MAX_JOURNAL_LENGTH, validJournalDate } from "@/lib/journal";
import { TaskDataError } from "@/lib/data/tasks";
import type { InboxNote } from "@/lib/types";

export function AddToJournalDialog({note,onClose}:{note:InboxNote|undefined;onClose:()=>void}){
  const {pendingJournalNotes}=useAppState();
  return <Dialog open={!!note} onClose={onClose} dismissible={!note||!pendingJournalNotes.includes(note.id)} title="Add to journal" description="Bring this thought into a daily entry. Your original stays in Inbox.">
    {note&&<AppendForm key={note.id} note={note} onClose={onClose} />}
  </Dialog>;
}
function AppendForm({note,onClose}:{note:InboxNote;onClose:()=>void}){
  const {today,journalEntries,journalDayStatus,journalDayErrors,journalSources,pendingJournalNotes}=useAppState();
  const {loadJournalDate,addCaptureToJournal,loadInbox}=useAppActions();
  const [date,setDate]=useState(today),[error,setError]=useState<string|null>(null);
  const source=journalSources.find(source=>source.noteId===note.id),busy=pendingJournalNotes.includes(note.id);
  const status=journalDayStatus[date],entry=journalEntries[date];
  useEffect(()=>{if(validJournalDate(date)&&!source)void loadJournalDate(date);},[date,loadJournalDate,source]);
  async function submit(event:FormEvent){
    event.preventDefault();if(busy)return;setError(null);
    try{await addCaptureToJournal(note,date);onClose();}
    catch(error){setError(error instanceof TaskDataError?error.message:"Couldn’t add the note. Your original and selected date have been kept.");}
  }
  const combined=appendJournalBody(entry?.body??"",note.body),tooLong=combined.length>MAX_JOURNAL_LENGTH;
  return source?<div className="space-y-4"><p className="text-sm text-muted">This capture was already added on {source.date}. It won’t be appended again.</p><Link className="text-sm text-accent-strong hover:underline" href={`/journal?date=${source.date}`} onClick={onClose}>View journal entry</Link></div>:<form onSubmit={submit} className="space-y-4" aria-busy={busy}>
    <fieldset disabled={busy} className="space-y-3">
      <Field label="Journal date" htmlFor="append-journal-date"><Input id="append-journal-date" type="date" value={date} onChange={event=>{setDate(event.target.value);setError(null);}} required /></Field>
      {status==="loading"&&<p role="status" className="text-sm text-muted">Loading the saved entry for your preview…</p>}
      {status==="error"&&<div role="alert" className="space-y-2"><p className="text-sm text-danger">{journalDayErrors[date]}</p><Button onClick={()=>void loadJournalDate(date)}>Retry preview</Button></div>}
      {status==="ready"&&<>
        <p className="text-sm text-muted">{entry?"This note will be added after the saved writing, separated by a blank line.":"This note will start the entry for this date."}</p>
        <details><summary className="cursor-pointer py-2 text-sm text-muted">Preview resulting saved entry</summary><pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-line bg-raised p-3 font-sans text-sm text-muted">{combined}</pre></details>
        {tooLong&&<p role="alert" className="text-sm text-danger">The combined entry exceeds 100,000 characters. Choose another date or edit the entry first.</p>}
      </>}
      <p className="text-xs text-subtle">Any writing saved by another device before you confirm will be kept too. Unsaved journal drafts are not included in this preview. Editing the source later won’t change the journal copy.</p>
    </fieldset>
    {error&&<div role="alert" className="space-y-2"><p className="text-sm text-danger">{error}</p><Button disabled={busy} onClick={()=>void loadInbox()}>Reload Inbox · keep this date</Button></div>}
    <div className="flex flex-wrap justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" disabled={busy||status!=="ready"||tooLong||!validJournalDate(date)}>{busy?"Adding…":"Add to journal"}</Button></div>
  </form>;
}
