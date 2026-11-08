"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useAppState } from "@/lib/store/app-store";
import { deleteReminder, saveNotificationPreferences, saveReminder } from "@/lib/push/actions";
import type { NotificationPreferences, ReminderRule } from "@/lib/push/types";

interface Props { initial: NotificationPreferences | null; rules: ReminderRule[]; onSaved: () => Promise<void> }
export function ReminderSettings({ initial, rules, onSaved }: Props) {
  const { tasks, tasksStatus, tasksError, habits, habitsStatus, habitsError } = useAppState();
  const [selected, setSelected] = useState("");
  const options = [
    ...tasks.filter(t => t.status === "todo" || t.status === "in_progress").map(t => ({ key: `task:${t.id}`, label: t.title })),
    ...habits.filter(h => h.isActive).map(h => ({ key: `habit:${h.id}`, label: h.name })),
  ];
  const rule = rules.find(r => selected === (r.task_id ? `task:${r.task_id}` : `habit:${r.habit_id}`));
  const name = (r: ReminderRule) => r.task_id ? tasks.find(t => t.id === r.task_id)?.title ?? "Task unavailable" : habits.find(h => h.id === r.habit_id)?.name ?? "Habit unavailable";
  return <div className="space-y-5 border-t border-line pt-5">
    <PreferencesForm key={JSON.stringify(initial)} initial={initial} onSaved={onSaved} />
    {!initial && <p className="text-sm text-muted">Save reminder preferences first to activate scheduling for this account.</p>}
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Task &amp; habit reminders</h3>
      <p className="text-xs text-subtle">Opt in to one reminder per item. Tasks use a separate chosen date and time. Habit reminders repeat daily until today’s target is complete (or this week’s target for weekly habits).</p>
      {tasksStatus === "loading" || habitsStatus === "loading" ? <p role="status" className="text-sm text-muted">Loading tasks and habits…</p> : null}
      {tasksStatus === "error" && <p role="alert" className="text-sm text-danger">{tasksError}</p>}
      {habitsStatus === "error" && <p role="alert" className="text-sm text-danger">{habitsError}</p>}
      <Field label="Choose a task or habit" htmlFor="reminder-item">
        <Select id="reminder-item" value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">Choose an item…</option>
          <optgroup label="Tasks">{options.filter(o => o.key.startsWith("task:")).map(o => <option key={o.key} value={o.key}>{o.label}</option>)}</optgroup>
          <optgroup label="Habits">{options.filter(o => o.key.startsWith("habit:")).map(o => <option key={o.key} value={o.key}>{o.label}</option>)}</optgroup>
          {selected && !options.some(o => o.key === selected) && <option value={selected}>Existing reminder (inactive item)</option>}
        </Select>
      </Field>
      {selected && <ReminderForm key={`${selected}:${rule?.id ?? "new"}`} selected={selected} existing={rule} zone={initial?.time_zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone} onSaved={onSaved} />}
      {rules.length === 0 ? <p className="text-sm text-subtle">No reminders yet. Nothing is enabled automatically.</p> : <ul className="divide-y divide-line">
        {rules.map(r => <li key={r.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0"><p className="truncate text-sm font-medium">{name(r)}</p><p className="text-xs text-subtle">{r.enabled ? "On" : "Off"} · {r.local_date ?? "Daily"} at {r.local_time.slice(0,5)} · {r.time_zone}</p></div>
          <Button size="sm" onClick={() => setSelected(r.task_id ? `task:${r.task_id}` : `habit:${r.habit_id}`)}>Edit reminder</Button>
        </li>)}
      </ul>}
    </div>
  </div>;
}

function PreferencesForm({ initial, onSaved }: Pick<Props,"initial"|"onSaved">) {
  const [paused,setPaused] = useState(initial?.paused ?? false);
  const [zone,setZone] = useState(initial?.time_zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [quiet,setQuiet] = useState(Boolean(initial?.quiet_start));
  const [start,setStart] = useState(initial?.quiet_start?.slice(0,5) ?? "22:00");
  const [end,setEnd] = useState(initial?.quiet_end?.slice(0,5) ?? "08:00");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState(""); const [saved,setSaved] = useState(false); const pending=useRef(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); if(pending.current) return; pending.current=true; setBusy(true); setError(""); setSaved(false);
    try {
      const result=await saveNotificationPreferences({paused,time_zone:zone,quiet_start:quiet?start:null,quiet_end:quiet?end:null});
      if(!result.ok) throw new Error(result.error);
      setSaved(true); await onSaved();
    } catch(error) {setError(error instanceof Error?error.message:"Couldn’t save preferences. Try again.");}
    finally {pending.current=false;setBusy(false);}
  }
  return <form onSubmit={submit} className="space-y-3">
    <h3 className="text-sm font-semibold">Reminder preferences</h3>
    <fieldset disabled={busy} className="space-y-3">
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={paused} onChange={e=>{setPaused(e.target.checked);setSaved(false);}} />Pause all scheduled reminders on every device</label>
      <Field label="Quiet-hours time zone" htmlFor="push-zone" hint="Use an IANA name, such as America/Chicago. Reminder zones remain explicit when you travel.">
        <Input id="push-zone" value={zone} onChange={e=>{setZone(e.target.value);setSaved(false);}} required autoCapitalize="none" spellCheck={false} />
      </Field>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={quiet} onChange={e=>{setQuiet(e.target.checked);setSaved(false);}} />Use quiet hours</label>
      {quiet && <div className="grid grid-cols-2 gap-3"><Field label="Quiet from" htmlFor="quiet-start"><Input id="quiet-start" type="time" value={start} onChange={e=>{setStart(e.target.value);setSaved(false);}} required /></Field><Field label="Until" htmlFor="quiet-end"><Input id="quiet-end" type="time" value={end} onChange={e=>{setEnd(e.target.value);setSaved(false);}} required /></Field></div>}
      <p className="text-xs text-subtle">Quiet-hour reminders are skipped, not queued for later. Pause takes effect when saved. Test notifications remain available while paused.</p>
      <Button type="submit" disabled={busy}>{busy?"Saving…":"Save reminder preferences"}</Button>
    </fieldset>
    {error&&<p role="alert" className="text-sm text-danger">{error}</p>}{saved&&<p role="status" className="text-sm text-success">Preferences saved.</p>}
  </form>;
}

function ReminderForm({selected,existing,zone,onSaved}:{selected:string;existing?:ReminderRule;zone:string;onSaved:()=>Promise<void>}) {
  const [kind,id]=selected.split(":");
  const [enabled,setEnabled]=useState(existing?.enabled??true);
  const [date,setDate]=useState(existing?.local_date??"");
  const [time,setTime]=useState(existing?.local_time.slice(0,5)??"");
  const [tz,setTz]=useState(existing?.time_zone??zone);
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [message,setMessage]=useState("");const pending=useRef(false);
  async function write(remove=false) {
    if(pending.current)return;pending.current=true;setBusy(true);setError("");setMessage("");
    try {
      const result=remove&&existing?await deleteReminder(existing.id):await saveReminder(existing?.id??null,{
        task_id:kind==="task"?id:null,habit_id:kind==="habit"?id:null,enabled,local_date:kind==="task"?date:null,local_time:time,time_zone:tz,
      });
      if(!result.ok)throw new Error(result.error);
      setMessage(remove?"Reminder removed.":"Reminder saved.");await onSaved();
    }catch(error){setError(error instanceof Error?error.message:"Couldn’t save reminder. Your input has been kept.");}
    finally{pending.current=false;setBusy(false);}
  }
  return <form onSubmit={e=>{e.preventDefault();void write();}} className="space-y-3 rounded-xl border border-line bg-raised p-4">
    <fieldset disabled={busy} className="space-y-3">
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} />Enable this reminder</label>
      {kind==="task"&&<Field label="Reminder date" htmlFor="reminder-date" hint="Independent of the task’s due date."><Input id="reminder-date" type="date" value={date} onChange={e=>setDate(e.target.value)} required /></Field>}
      <Field label="Reminder time" htmlFor="reminder-time"><Input id="reminder-time" type="time" value={time} onChange={e=>setTime(e.target.value)} required /></Field>
      <Field label="Reminder time zone" htmlFor="reminder-zone"><Input id="reminder-zone" value={tz} onChange={e=>setTz(e.target.value)} required autoCapitalize="none" spellCheck={false} /></Field>
      <div className="flex flex-wrap gap-2"><Button type="submit" variant="primary">{busy?"Saving…":"Save reminder"}</Button>{existing&&<Button variant="danger" onClick={()=>void write(true)}>Remove reminder</Button>}</div>
    </fieldset>
    {error&&<p role="alert" className="text-sm text-danger">{error}</p>}{message&&<p role="status" className="text-sm text-success">{message}</p>}
  </form>;
}
