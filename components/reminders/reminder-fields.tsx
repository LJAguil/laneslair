"use client";

import Link from "next/link";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { NotificationPreferences } from "@/lib/push/types";
import type { ReminderDraft, ReminderKind } from "@/lib/push/reminder-draft";

export function ReminderFields({kind,value,onChange,status,error,onRetry,preferences}:{
  kind:ReminderKind;value:ReminderDraft;onChange:(draft:ReminderDraft)=>void;
  status:"loading"|"ready"|"error";error:string|null;onRetry:()=>void;preferences:NotificationPreferences|null;
}) {
  const id=useId();
  return <div className="space-y-3 rounded-xl border border-line p-3">
    {status==="loading"?<p role="status" className="text-sm text-muted">Loading reminder…</p>:status==="error"?<div role="alert" className="space-y-2 text-sm text-danger"><p>{error}</p><Button size="sm" onClick={onRetry}>Retry reminder</Button></div>:<>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium"><input className="h-5 w-5 accent-[var(--color-accent)]" type="checkbox" checked={value.enabled} onChange={event=>onChange({...value,enabled:event.target.checked})} />Remind me</label>
      {value.enabled&&<>
        <div className="grid gap-3 sm:grid-cols-2">
          {kind==="task"&&<Field label="Reminder date" htmlFor={`${id}-date`} hint="Separate from the task’s due date."><Input id={`${id}-date`} type="date" value={value.date} onChange={event=>onChange({...value,date:event.target.value})} required /></Field>}
          <Field label={kind==="habit"?"Daily reminder time":"Reminder time"} htmlFor={`${id}-time`}><Input id={`${id}-time`} type="time" value={value.time} onChange={event=>onChange({...value,time:event.target.value})} required /></Field>
        </div>
        <Field label="Reminder time zone" htmlFor={`${id}-zone`}><Input id={`${id}-zone`} value={value.zone} onChange={event=>onChange({...value,zone:event.target.value})} required autoCapitalize="none" spellCheck={false} /></Field>
        {kind==="habit"&&<p className="text-xs text-subtle">Repeats daily. Skipped when the relevant daily or weekly target is already complete.</p>}
        <p className="text-xs text-subtle">Push must be enabled on your device. {preferences?.paused?"All reminders are currently paused. ":!preferences?"Save your reminder preferences first. ":""}<Link className="text-accent-strong hover:underline" href="/settings#notifications">Notification settings</Link> has device permissions, quiet hours and pause.</p>
      </>}
    </>}
  </div>;
}
