"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { TaskDataError } from "@/lib/data/tasks";
import type { GoalStatus } from "@/lib/data/goals";
import { useAppActions } from "@/lib/store/app-store";
import type { Goal } from "@/lib/types";

export function GoalFormDialog({ open, goal, progressOnly = false, onClose }: { open: boolean; goal?: Goal; progressOnly?: boolean; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  return <Dialog open={open} onClose={onClose} dismissible={!saving} title={progressOnly ? "Update progress" : goal ? "Edit goal" : "New goal"}
    description={progressOnly ? "Enter your total progress so far. You can correct it any time." : "Choose a milestone and track it at your own pace."}>
    <GoalForm key={`${goal?.id ?? "new"}-${progressOnly}`} goal={goal} progressOnly={progressOnly} onClose={onClose} onSaving={setSaving} />
  </Dialog>;
}
function GoalForm({ goal, progressOnly, onClose, onSaving }: { goal?: Goal; progressOnly: boolean; onClose: () => void; onSaving: (saving: boolean) => void }) {
  const { addGoal, editGoal } = useAppActions();
  const id = useId(), requestId = useRef<string | null>(null), inFlight = useRef(false);
  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [target, setTarget] = useState(goal?.target ? String(goal.target) : "");
  const [current, setCurrent] = useState(String(goal?.current ?? 0));
  const [unit, setUnit] = useState(goal?.unit ?? "");
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
  const [status, setStatus] = useState<GoalStatus>(goal?.status ?? "active");
  const [saving, setSaving] = useState(false), [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true; setSaving(true); onSaving(true); setError(null);
    try {
      const nextStatus = (status === "active" && Number(current) >= Number(target)) ? "completed"
        : progressOnly && status === "completed" && Number(current) < Number(target) ? "active" : status;
      const input = { title, description, target: Number(target), current: Number(current), unit, targetDate, status: nextStatus };
      if (goal) await editGoal(goal.id, input);
      else { requestId.current ??= crypto.randomUUID(); await addGoal(requestId.current, input); }
      onSaving(false); onClose();
    } catch (err) { setError(err instanceof TaskDataError ? err.message : "Couldn't save this goal. Your changes are still here."); }
    finally { inFlight.current = false; setSaving(false); onSaving(false); }
  }
  return <form onSubmit={submit} className="space-y-4" aria-busy={saving}>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <fieldset disabled={saving} className="space-y-4">
      {progressOnly ? <p className="break-words text-sm font-medium">{title} · Target: {target} {unit}</p> : <>
        <Field label="Goal" htmlFor={`${id}-title`}><Input id={`${id}-title`} autoFocus required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Read 12 books" /></Field>
        <Field label="Why it matters" htmlFor={`${id}-description`} hint="Optional"><Textarea id={`${id}-description`} value={description} onChange={e => setDescription(e.target.value)} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Target" htmlFor={`${id}-target`}><Input id={`${id}-target`} type="number" required min="0.000001" max="1000000000" step="any" value={target} onChange={e => setTarget(e.target.value)} /></Field>
          <Field label="Unit" htmlFor={`${id}-unit`} hint="e.g. books, miles, hours, or $"><Input id={`${id}-unit`} required maxLength={30} value={unit} onChange={e => setUnit(e.target.value)} /></Field>
        </div>
      </>}
      <Field label="Current progress" htmlFor={`${id}-current`} hint="Your total so far, including any progress before creating this goal."><Input id={`${id}-current`} type="number" required min="0" max="1000000000" step="any" value={current} onChange={e => setCurrent(e.target.value)} /></Field>
      {!progressOnly && <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Target date" htmlFor={`${id}-date`} hint="Optional"><Input id={`${id}-date`} type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} /></Field>
        <Field label="Status" htmlFor={`${id}-status`}><Select id={`${id}-status`} value={status} onChange={e => setStatus(e.target.value as GoalStatus)}>{["active", "paused", "completed", "archived"].map(s => <option key={s} value={s}>{s[0].toUpperCase()+s.slice(1)}</option>)}</Select></Field>
      </div>}
      {progressOnly && <p className="text-sm text-muted">Reaching the target completes an active goal. Lowering a completed goal’s progress reopens it.</p>}
    </fieldset>
    <div className="flex justify-end gap-2"><Button variant="ghost" disabled={saving} onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving…" : progressOnly ? "Save progress" : goal ? "Save changes" : "Create goal"}</Button></div>
  </form>;
}
