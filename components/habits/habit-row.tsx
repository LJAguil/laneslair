"use client";

import { Check, Flame, Loader2, Minus, Pencil, Plus } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { ProgressBar } from "@/components/ui/progress";
import { formatShortDate, lastNDays } from "@/lib/dates";
import { habitDay, habitStartDate, habitWeekCount, amountLabel, streakUnit } from "@/lib/habits";
import type { HabitProgressRequest } from "@/lib/data/habits";
import { habitStreak, isCheckedIn } from "@/lib/selectors";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import type { Habit } from "@/lib/types";
import { accentClasses, cn } from "@/lib/utils";
import { ReminderButton } from "@/components/reminders/reminder-button";

export function HabitRow({ habit, showWeek = false, onEdit }: { habit: Habit; showWeek?: boolean; onEdit?: () => void }) {
  const { recordHabit } = useAppActions();
  const { today, pendingHabitIds, failedHabitRequests } = useAppState();
  const [selectedDate,setDate] = useState<string | null>(null);
  const date = selectedDate ?? today;
  const [amount,setAmount] = useState(habit.unit === "mL" ? "250" : habit.unit === "fl oz" ? "8" : "1");
  const failed = failedHabitRequests[habit.id]?.request;
  const error = failedHabitRequests[habit.id]?.message;
  const [saving,setSaving] = useState(false);
  const inFlight = useRef(false);
  const id = useId();
  const day = habitDay(habit,date);
  const checked = isCheckedIn(habit,date);
  const streak = habitStreak(habit,today);
  const busy = saving || pendingHabitIds.includes(habit.id);
  const locked = busy || !!failed || !habit.isActive;
  const step = Number(amount);
  const validAmount = Number.isFinite(step) && step > 0 && step <= 1000000 && Math.abs(step*1000-Math.round(step*1000)) < 0.000001;

  async function log(request: HabitProgressRequest) {
    if (inFlight.current) return;
    inFlight.current = true; setSaving(true);
    try { await recordHabit(habit,request); }
    catch { /* The store retains the request and error across page navigation. */ }
    finally { inFlight.current = false; setSaving(false); }
  }
  function update(mode: "add" | "set", value: number) {
    void log({ id: crypto.randomUUID(),habitId: habit.id,date,mode,value });
  }
  return <li className="min-w-0 space-y-3 py-4 first:pt-0 last:pb-0" aria-busy={busy}>
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1"><p className="flex items-start gap-2 break-words text-sm font-medium"><span aria-hidden="true" className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full",accentClasses[habit.color].dot)} />{habit.name}</p><p className="mt-0.5 text-xs text-subtle">{habit.frequency === "daily" ? "Every day" : `${habit.targetPerWeek} successful days per week`}{habit.frequency !== "daily" && ` · ${habitWeekCount(habit,today)} this week`}</p></div>
      {habit.streakEnabled && <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs",streak > 0 ? "text-warning" : "text-subtle")} title={`${streak} ${streakUnit(habit)} streak`}><Flame className="h-4 w-4" aria-hidden="true" />{streak} {streakUnit(habit)}{streak === 1 ? "" : "s"}</span>}
      {onEdit && <Button size="icon-sm" variant="ghost" onClick={onEdit} disabled={locked} aria-label={`Edit ${habit.name}`}><Pencil className="h-4 w-4" aria-hidden="true" /></Button>}
      <ReminderButton kind="habit" id={habit.id} name={habit.name} disabled={busy||!habit.isActive} />
    </div>
    {habit.trackingType === "quantity" ? <>
      <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm"><span className="font-semibold">{amountLabel(day.amount,habit.unit)}</span><span className="text-muted"> / {amountLabel(day.target,habit.unit)}</span></p>{checked && <span className="text-xs text-success">Target reached</span>}</div>
      <ProgressBar value={day.amount/day.target*100} label={`${habit.name} daily progress`} barClassName={accentClasses[habit.color].bar} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-xs text-muted" htmlFor={`${id}-amount`}>Amount ({habit.unit})<Input id={`${id}-amount`} className="mt-1" type="number" inputMode="decimal" min="0.001" max="1000000" step="0.001" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={locked} /></label>
        <Button variant="ghost" size="icon" className="h-11 w-11" disabled={locked || !validAmount || day.amount === 0} onClick={() => update("add",-step)} aria-label={`Subtract ${amount} ${habit.unit} from ${habit.name}`}><Minus className="h-4 w-4" aria-hidden="true" /></Button>
        <Button variant="primary" className="h-11" disabled={locked || !validAmount} onClick={() => update("add",step)}>{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}Add</Button>
      </div>
    </> : <Button variant={checked ? "primary" : "secondary"} className="h-11" aria-pressed={checked} disabled={locked} onClick={() => update("set",checked ? 0 : 1)}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}{checked ? "Checked in · Undo" : "Check in"}
    </Button>}
    {showWeek && <div className="flex flex-wrap items-center gap-2"><label htmlFor={`${id}-date`} className="text-xs text-muted">Log for</label><Select id={`${id}-date`} className="min-w-0 sm:max-w-52" value={date} onChange={(e) => setDate(e.target.value === today ? null : e.target.value)} disabled={locked}>
      {lastNDays(7,today).reverse().filter((d) => d >= habitStartDate(habit) || habit.days[d]).map((d) => <option key={d} value={d}>{d === today ? "Today" : formatShortDate(d)}{isCheckedIn(habit,d) ? " · done" : ""}</option>)}
    </Select></div>}
    {date !== today && <p className="text-xs text-warning">Editing progress for {formatShortDate(date)}.</p>}
    {error && !failed && <p role="alert" className="text-sm text-danger">{error}</p>}
    {failed && <div role="alert" className="space-y-2 rounded-lg border border-danger/30 p-3"><p className="text-sm text-danger">{error}</p><p className="text-xs text-muted">Retry to confirm the update safely. It won’t count twice. {failed.date !== date && `This update is for ${formatShortDate(failed.date)}.`}</p><Button disabled={busy} onClick={() => void log(failed)}>Retry update</Button></div>}
  </li>;
}
