"use client";

import { Archive, ArrowUpRight, BookOpen, CheckSquare, Pencil, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterChips } from "@/components/ui/filter-chips";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import { TaskDataError } from "@/lib/data/tasks";
import type { InboxNote } from "@/lib/types";
import { CaptureDialog, CaptureForm } from "./capture-form";
import { AddToJournalDialog } from "@/components/journal/add-to-journal-dialog";
import { captureIsUnsorted } from "@/lib/journal";

type Filter = "inbox" | "converted" | "journalled" | "archived";
export function InboxView() {
  const { inboxNotes, inboxStatus, inboxError, journalSources, journalIndexStatus, journalIndexError } = useAppState();
  const { loadInbox, loadJournalIndex } = useAppActions();
  const [filter, setFilter] = useState<Filter>("inbox");
  const [editing, setEditing] = useState<InboxNote>();
  const [converting, setConverting] = useState<InboxNote>();
  const [journalling,setJournalling]=useState<InboxNote>();
  const matches = (n: InboxNote, f: Filter) => f === "archived" ? !!n.archivedAt : f === "converted" ? !!n.convertedAt && !n.archivedAt : f === "journalled" ? !n.archivedAt&&journalSources.some(source=>source.noteId===n.id) : journalIndexStatus==="ready"?captureIsUnsorted(n,journalSources):!n.archivedAt&&!n.convertedAt;
  const visible = inboxNotes.filter((n) => matches(n, filter));
  const options = (["inbox", "converted", "journalled", "archived"] as const).map((value) => ({
    value, label: { inbox: "Inbox", converted: "Made into tasks", journalled:"In journal", archived: "Archived" }[value],
    count: (value==="inbox"||value==="journalled")&&journalIndexStatus!=="ready"?undefined:inboxNotes.filter((n) => matches(n, value)).length,
  }));
  return (
    <>
      <PageHeader title="Inbox" description="A place for thoughts before they become plans." />
      <Card className="mb-6"><CaptureForm /></Card>
      {inboxStatus === "loading" && <p role="status" className="py-6 text-sm text-muted">Loading your captures…</p>}
      {inboxStatus === "error" && <div role="alert" className="space-y-3 rounded-xl border border-danger/30 p-4"><p className="text-sm text-danger">{inboxError}</p><Button onClick={() => void loadInbox()}>Retry Inbox</Button></div>}
      {inboxStatus === "ready" && <>
        {journalIndexStatus==="loading"&&<p role="status" className="mb-3 text-sm text-muted">Checking journal links…</p>}
        {journalIndexStatus==="error"&&<div role="alert" className="mb-4 space-y-2 text-sm"><p className="text-warning">{journalIndexError} Captures remain available; the Inbox list may include notes already added to your journal.</p><Button onClick={()=>void loadJournalIndex()}>Retry journal links</Button></div>}
        <div className="mb-4"><FilterChips<Filter> label="Filter captures" options={options} value={filter} onChange={setFilter} /></div>
        {filter==="journalled"&&journalIndexStatus!=="ready"?null:visible.length === 0 ? <EmptyState title={filter === "inbox" ? "Room for your next idea" : "Nothing here yet"} description={filter === "inbox" ? "Capture something above. Keep it as a note, make it a task, or add it to your journal." : undefined} /> :
          <ul className="space-y-3">{visible.map((note) => <CaptureRow key={note.id} note={note} onEdit={() => setEditing(note)} onConvert={() => setConverting(note)} onJournal={()=>setJournalling(note)} />)}</ul>}
      </>}
      <CaptureDialog open={!!editing} note={editing} onClose={() => setEditing(undefined)} />
      <TaskFormDialog open={!!converting} capture={converting} onClose={() => setConverting(undefined)} />
      <AddToJournalDialog note={journalling?(inboxNotes.find(note=>note.id===journalling.id)??journalling):undefined} onClose={()=>setJournalling(undefined)} />
    </>
  );
}

function CaptureRow({ note, onEdit, onConvert,onJournal }: { note: InboxNote; onEdit: () => void; onConvert: () => void;onJournal:()=>void }) {
  const { pendingNoteIds, tasks, tasksStatus,journalSources,journalDates,journalIndexStatus,pendingJournalNotes } = useAppState();
  const { archiveCapture } = useAppActions();
  const pending = pendingNoteIds.includes(note.id)||pendingJournalNotes.includes(note.id);
  const [error, setError] = useState<string | null>(null);
  const linked = tasks.find((t) => t.id === note.convertedTaskId);
  const source=journalSources.find(source=>source.noteId===note.id);
  const journalAvailable=source&&journalDates.some(entry=>entry.id===source.entryId);
  return (
    <li className="rounded-2xl border border-line bg-panel p-4 sm:p-5" aria-busy={pending}>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-fg">{note.body}</p>
      <p className="mt-3 text-xs text-subtle"><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time></p>
      {note.convertedAt && <div className="mt-3 text-sm text-muted">{linked ? <Link href="/tasks" className="inline-flex items-center gap-1 text-accent-strong hover:underline">Task: {linked.title}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link> : tasksStatus === "ready" ? "Converted task is no longer available. Your original capture is kept here." : "Made into a task. Your original capture is kept here."}</div>}
      {source&&<div className="mt-3 text-sm text-muted"><Link href={`/journal?date=${source.date}`} className="text-accent-strong hover:underline">Journal · {source.date}</Link>{!journalAvailable&&journalIndexStatus==="ready"&&<p>The linked entry is no longer available. Your original capture is kept here.</p>}</div>}
      <div className="mt-3 flex flex-wrap gap-2">
        {!note.convertedAt && !note.archivedAt && <Button size="sm" className="min-h-11" disabled={pending} onClick={onConvert}><CheckSquare className="h-4 w-4" aria-hidden="true" />Make this a task</Button>}
        {!source&&!note.archivedAt&&<Button size="sm" className="min-h-11" disabled={pending||journalIndexStatus!=="ready"} onClick={onJournal}><BookOpen className="h-4 w-4" aria-hidden="true" />Add to journal</Button>}
        <Button variant="ghost" size="sm" className="min-h-11" disabled={pending} onClick={onEdit}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Button>
        <Button variant="ghost" size="sm" className="min-h-11" disabled={pending} onClick={async () => {
          setError(null);
          try { await archiveCapture(note, !note.archivedAt); }
          catch (err) { setError(err instanceof TaskDataError ? err.message : "Couldn't update this capture. Try again."); }
        }}>{note.archivedAt ? <RotateCcw className="h-4 w-4" aria-hidden="true" /> : <Archive className="h-4 w-4" aria-hidden="true" />}{note.archivedAt ? "Restore" : "Archive"}</Button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </li>
  );
}
