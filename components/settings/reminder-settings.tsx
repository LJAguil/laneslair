"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { saveNotificationPreferences } from "@/lib/push/actions";
import type { NotificationPreferences } from "@/lib/push/types";

interface Props { initial: NotificationPreferences | null; onSaved: () => Promise<void> }
export function ReminderSettings({ initial, onSaved }: Props) {
  return <div className="space-y-4 border-t border-line pt-5">
    <PreferencesForm key={JSON.stringify(initial)} initial={initial} onSaved={onSaved} />
    {!initial && <p className="text-sm text-muted">Save reminder preferences first to activate scheduling for this account.</p>}
    <p className="text-sm text-muted">Set reminders directly in task and habit forms, or tap the bell beside an item. <Link href="/tasks" className="text-accent-strong hover:underline">Tasks</Link> · <Link href="/habits" className="text-accent-strong hover:underline">Habits</Link></p>
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
