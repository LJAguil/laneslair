"use client";

import { Archive, ArrowUpRight, CheckSquare, Pencil, RotateCcw } from "lucide-react";
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

type Filter = "inbox" | "converted" | "archived";
export function InboxView() {
  const { inboxNotes, inboxStatus, inboxError } = useAppState();
  const { loadInbox } = useAppActions();
  const [filter, setFilter] = useState<Filter>("inbox");
  const [editing, setEditing] = useState<InboxNote>();
  const [converting, setConverting] = useState<InboxNote>();
  const matches = (n: InboxNote, f: Filter) => f === "archived" ? !!n.archivedAt : f === "converted" ? !!n.convertedAt && !n.archivedAt : !n.archivedAt && !n.convertedAt;
  const visible = inboxNotes.filter((n) => matches(n, filter));
  const options = (["inbox", "converted", "archived"] as const).map((value) => ({
    value, label: { inbox: "Inbox", converted: "Made into tasks", archived: "Archived" }[value],
    count: inboxNotes.filter((n) => matches(n, value)).length,
  }));
  return (
    <>
      <PageHeader title="Inbox" description="A place for thoughts before they become plans." />
      <Card className="mb-6"><CaptureForm /></Card>
      {inboxStatus === "loading" && <p role="status" className="py-6 text-sm text-muted">Loading your captures…</p>}
      {inboxStatus === "error" && <div role="alert" className="space-y-3 rounded-xl border border-danger/30 p-4"><p className="text-sm text-danger">{inboxError}</p><Button onClick={() => void loadInbox()}>Retry Inbox</Button></div>}
      {inboxStatus === "ready" && <>
        <div className="mb-4"><FilterChips<Filter> label="Filter captures" options={options} value={filter} onChange={setFilter} /></div>
        {visible.length === 0 ? <EmptyState title={filter === "inbox" ? "Room for your next idea" : "Nothing here yet"} description={filter === "inbox" ? "Capture something above. It can stay a note, or become a task later." : undefined} /> :
          <ul className="space-y-3">{visible.map((note) => <CaptureRow key={note.id} note={note} onEdit={() => setEditing(note)} onConvert={() => setConverting(note)} />)}</ul>}
      </>}
      <CaptureDialog open={!!editing} note={editing} onClose={() => setEditing(undefined)} />
      <TaskFormDialog open={!!converting} capture={converting} onClose={() => setConverting(undefined)} />
    </>
  );
}

function CaptureRow({ note, onEdit, onConvert }: { note: InboxNote; onEdit: () => void; onConvert: () => void }) {
  const { pendingNoteIds, tasks, tasksStatus } = useAppState();
  const { archiveCapture } = useAppActions();
  const pending = pendingNoteIds.includes(note.id);
  const [error, setError] = useState<string | null>(null);
  const linked = tasks.find((t) => t.id === note.convertedTaskId);
  return (
    <li className="rounded-2xl border border-line bg-panel p-4 sm:p-5" aria-busy={pending}>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-fg">{note.body}</p>
      <p className="mt-3 text-xs text-subtle"><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time></p>
      {note.convertedAt && <div className="mt-3 text-sm text-muted">{linked ? <Link href="/tasks" className="inline-flex items-center gap-1 text-accent-strong hover:underline">Task: {linked.title}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link> : tasksStatus === "ready" ? "Converted task is no longer available. Your original capture is kept here." : "Made into a task. Your original capture is kept here."}</div>}
      <div className="mt-3 flex flex-wrap gap-2">
        {!note.convertedAt && !note.archivedAt && <Button size="sm" className="min-h-11" disabled={pending} onClick={onConvert}><CheckSquare className="h-4 w-4" aria-hidden="true" />Make this a task</Button>}
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
