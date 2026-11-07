"use client";

import { Loader2 } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { TaskDataError } from "@/lib/data/tasks";
import { useAppActions } from "@/lib/store/app-store";
import type { AccentColor, Habit, HabitFrequency, HabitTracking } from "@/lib/types";

export function HabitFormDialog({ open, habit, onClose }: { open: boolean; habit?: Habit; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  return <Dialog open={open} onClose={onClose} dismissible={!saving} title={habit ? "Edit habit" : "New habit"}
    description="Choose something that matters to you. Streaks are optional.">
    <HabitForm key={habit?.id ?? "new"} habit={habit} onClose={onClose} onSaving={setSaving} />
  </Dialog>;
}

function HabitForm({ habit, onClose, onSaving }: { habit?: Habit; onClose: () => void; onSaving: (saving: boolean) => void }) {
  const { addHabit, editHabit } = useAppActions();
  const id = useId();
  const requestId = useRef<string | null>(null);
  const inFlight = useRef(false);
  const [name,setName] = useState(habit?.name ?? "");
  const [description,setDescription] = useState(habit?.description ?? "");
  const [trackingType,setTrackingType] = useState<HabitTracking>(habit?.trackingType ?? "check");
  const [frequency,setFrequency] = useState<HabitFrequency>(habit?.frequency ?? "daily");
  const [targetPerWeek,setTargetPerWeek] = useState(String(habit?.targetPerWeek ?? 3));
  const [target,setTarget] = useState(habit?.trackingType === "quantity" ? String(habit.dailyTarget) : "");
  const [unit,setUnit] = useState(habit?.trackingType === "quantity" ? habit.unit : "");
  const [streak,setStreak] = useState(habit?.streakEnabled ?? true);
  const [color,setColor] = useState<AccentColor>(habit?.color ?? "violet");
  const [error,setError] = useState<string | null>(null);
  const [saving,setSaving] = useState(false);
  const hasHistory = !!habit && Object.keys(habit.days).length > 0;
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    if (!name.trim()) { setError("Give the habit a name."); return; }
    const input = { name, description, trackingType, frequency, targetPerWeek: Number(targetPerWeek), dailyTarget: trackingType === "check" ? 1 : Number(target), unit, streakEnabled: streak, color };
    inFlight.current = true; setSaving(true); onSaving(true); setError(null);
    try {
      if (habit) await editHabit(habit,input);
      else { requestId.current ??= crypto.randomUUID(); await addHabit(requestId.current,input); }
      onSaving(false); onClose();
    } catch (err) { setError(err instanceof TaskDataError ? err.message : "Couldn't save this habit. Your changes are still here."); setSaving(false); onSaving(false); }
    finally { inFlight.current = false; }
  }
  return <form onSubmit={submit} className="space-y-4" aria-busy={saving}>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <fieldset disabled={saving} className="space-y-4">
      <Field label="Name" htmlFor={`${id}-name`}><Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} required autoFocus placeholder="e.g. Read, stretch, or practice chess" /></Field>
      <Field label="Description" htmlFor={`${id}-description`} hint="Optional"><Textarea id={`${id}-description`} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <Field label="How to track it" htmlFor={`${id}-type`}><Select id={`${id}-type`} value={trackingType} disabled={hasHistory} onChange={(e) => setTrackingType(e.target.value as HabitTracking)}><option value="check">A simple check-in</option><option value="quantity">An amount toward a daily target</option></Select></Field>
      {trackingType === "quantity" && <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Daily target" htmlFor={`${id}-target`} hint="Choose your own target."><Input id={`${id}-target`} type="number" inputMode="decimal" min="0.001" max="1000000" step="0.001" required value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
        <Field label="Unit" htmlFor={`${id}-unit`} hint="e.g. glasses, mL, fl oz, pages, minutes"><Input id={`${id}-unit`} required maxLength={30} disabled={hasHistory} value={unit} onChange={(e) => setUnit(e.target.value)} /></Field>
      </div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Schedule" htmlFor={`${id}-schedule`}><Select id={`${id}-schedule`} disabled={hasHistory} value={frequency} onChange={(e) => setFrequency(e.target.value as HabitFrequency)}><option value="daily">Every day</option><option value="weekly">Days per week</option>{frequency === "custom" && <option value="custom">Custom weekly goal</option>}</Select></Field>
        {frequency !== "daily" && <Field label="Successful days per week" htmlFor={`${id}-weekly`}><Input id={`${id}-weekly`} type="number" min="1" max="7" step="1" required disabled={hasHistory} value={targetPerWeek} onChange={(e) => setTargetPerWeek(e.target.value)} /></Field>}
      </div>
      {hasHistory && <p className="text-xs leading-relaxed text-muted">Type, units, and schedule stay fixed to protect your history. Daily target changes apply to days you haven’t logged yet; existing days keep their saved target.</p>}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3"><input type="checkbox" checked={streak} onChange={(e) => setStreak(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--color-accent)]" /><span><span className="block text-sm font-medium">Show a {frequency === "daily" ? "daily" : "weekly"} streak</span><span className="text-xs text-muted">Turn it off any time. Your progress and history will still be saved.</span></span></label>
      <Field label="Color" htmlFor={`${id}-color`}><Select id={`${id}-color`} value={color} onChange={(e) => setColor(e.target.value as AccentColor)}>{["violet","blue","emerald","amber","rose","cyan"].map((c) => <option key={c} value={c}>{c[0].toUpperCase()+c.slice(1)}</option>)}</Select></Field>
    </fieldset>
    <div className="flex justify-end gap-2"><Button variant="ghost" disabled={saving} onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{saving ? "Saving…" : habit ? "Save changes" : "Create habit"}</Button></div>
  </form>;
}
