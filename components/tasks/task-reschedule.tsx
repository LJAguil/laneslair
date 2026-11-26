"use client";
import { CalendarClock, Loader2 } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { TaskDataError } from "@/lib/data/tasks";
import { addDays, formatTime } from "@/lib/dates";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import type { Task } from "@/lib/types";
export function TaskReschedule({ task, disabled }: { task: Task; disabled?: boolean }) {
  const [open, setOpen] = useState(false), [saving, setSaving] = useState(false);
  return <>
    <Button size="sm" variant="ghost" className="min-h-11" disabled={disabled} aria-label={`Move due date for “${task.title}”`} onClick={() => setOpen(true)}><CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />Move</Button>
    <Dialog open={open} onClose={() => setOpen(false)} dismissible={!saving} title="Move due date" description={task.title} className="max-w-sm">
      <TaskRescheduleForm task={task} onSaving={setSaving} onSaved={() => setOpen(false)} />
    </Dialog>
  </>;
}
export function TaskRescheduleForm({ task, onSaving, onSaved }: { task: Task; onSaving: (value: boolean) => void; onSaved: () => void }) {
  const { today, pendingTaskIds } = useAppState(), { rescheduleTask } = useAppActions();
  const id = useId(), inFlight = useRef(false);
  const [date, setDate] = useState(task.dueDate ?? today), [saving, setSaving] = useState(false), [error, setError] = useState<string | null>(null);
  const busy = saving || pendingTaskIds.includes(task.id);
  async function move(value?: string) {
    if (inFlight.current || busy) return;
    if (value) setDate(value);
    inFlight.current = true; setSaving(true); onSaving(true); setError(null);
    try { await rescheduleTask(task, value); onSaved(); }
    catch (error) { setError(error instanceof TaskDataError ? error.message : "Couldn't move this task. Your selected date is kept. Try again."); }
    finally { inFlight.current = false; setSaving(false); onSaving(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); if (date) void move(date); }
  return <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
    <div className="flex flex-wrap gap-2">{[{ label: "Today", value: today }, { label: "Tomorrow", value: addDays(today, 1) }, { label: "Next week", value: addDays(today, 7) }].map(option => <Button key={option.label} className="min-h-11" disabled={busy || option.value === task.dueDate} onClick={() => void move(option.value)}>{option.label}</Button>)}</div>
    <Field label="Choose a date" htmlFor={id}><Input id={id} type="date" value={date} onChange={event => { setDate(event.target.value); setError(null); }} disabled={busy} required /></Field>
    <p className="text-xs text-muted">{task.dueTime ? `Keeps the due time at ${formatTime(`dateT${task.dueTime}`)} in this device’s time zone. Removing the date also removes its due time.` : "No due time is added. The task remains due through the selected day."} Push reminders are separate and are not moved.</p>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <div className="flex flex-wrap justify-end gap-2"><Button disabled={busy || !task.dueDate} onClick={() => void move()}>No due date</Button><Button type="submit" variant="primary" disabled={busy || !date || date === task.dueDate}>{saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{saving ? "Saving…" : "Move task"}</Button></div>
  </form>;
}
