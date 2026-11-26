"use client";

import { Bell, BellRing } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useAppActions } from "@/lib/store/app-store";
import type { ReminderKind } from "@/lib/push/reminder-draft";
import { useItemReminder } from "./reminder-provider";
import type { ReminderControl } from "@/lib/push/reminder-controls";
import { useReminderDraft } from "./use-reminder-draft";
import { ReminderFields } from "./reminder-fields";

export function ReminderButton({kind,id,name,disabled=false}:{kind:ReminderKind;id:string;name:string;disabled?:boolean}) {
  const [open,setOpen]=useState(false);
  const {rule}=useItemReminder(kind,id);
  return <>
    <Button size="icon-sm" variant="ghost" className={rule?.enabled?"text-accent-strong":"text-subtle"} disabled={disabled} onClick={()=>setOpen(true)}
      aria-label={`${rule?.enabled?"Edit":"Set"} reminder for “${name}”`} title={rule?.enabled?`Reminder at ${rule.local_time.slice(0,5)} · ${rule.time_zone}`:"Set reminder"}>
      {rule?.enabled?<BellRing className="h-4 w-4" aria-hidden="true" />:<Bell className="h-4 w-4" aria-hidden="true" />}
    </Button>
    <ReminderDialog open={open} onClose={()=>setOpen(false)} kind={kind} id={id} name={name} />
  </>;
}
function ReminderDialog({open,onClose,kind,id,name}:{open:boolean;onClose:()=>void;kind:ReminderKind;id:string;name:string}) {
  const [busy,setBusy]=useState(false);
  return <Dialog open={open} onClose={onClose} dismissible={!busy} title="Reminder" description={name}>
    <ReminderForm kind={kind} id={id} onClose={onClose} onBusy={setBusy} />
  </Dialog>;
}
function ReminderForm({kind,id,onClose,onBusy}:{kind:ReminderKind;id:string;onClose:()=>void;onBusy:(busy:boolean)=>void}) {
  const draft=useReminderDraft(kind,id);
  const { control } = useItemReminder(kind, id);
  const {notify}=useAppActions();
  const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
  const pending=useRef(false);
  async function save(remove=false) {
    if(pending.current)return;pending.current=true;setBusy(true);onBusy(true);setError(null);
    try {
      if(remove&&draft.rule)await draft.remove(draft.rule);
      else {draft.validate();await draft.saveDraft(id);}
      notify("success",remove?"Reminder removed":"Reminder saved");onClose();
    }catch(error){setError(error instanceof Error?error.message:"Couldn’t save reminder. Try again.");}
    finally{pending.current=false;setBusy(false);onBusy(false);}
  }
  async function change(action: ReminderControl) {
    if (pending.current || !draft.rule) return;
    pending.current = true; setBusy(true); onBusy(true); setError(null);
    try { await control(draft.rule, action); notify("success", action === "mute" ? "Reminder muted" : action === "resume" ? "Reminder resumed" : "Reminder rescheduled from now"); onClose(); }
    catch (error) { setError(error instanceof Error ? error.message : "Couldn't update this reminder. Reload and try again."); }
    finally { pending.current = false; setBusy(false); onBusy(false); }
  }
  return <form onSubmit={event=>{event.preventDefault();void save();}} className="space-y-4">
    <p className="text-xs text-muted">This is a push reminder you requested, separate from a task deadline. Muting never changes the deadline. Already sent or in-flight alerts can’t be recalled.</p>
    <fieldset disabled={busy}>
      <ReminderFields kind={kind} value={draft.value} onChange={draft.onChange} status={draft.status} error={draft.error} onRetry={()=>void draft.reload()} preferences={draft.preferences} />
    </fieldset>
    {draft.rule && <div className="space-y-2 rounded-lg border border-line p-3"><p className="text-xs text-muted">Quick controls apply to the saved reminder. Snooze replaces this task reminder with a new time from now, rounded up to the next minute. Quiet hours and device permissions still apply.</p><div className="flex flex-wrap gap-2">
      <Button className="min-h-11" disabled={busy || draft.status !== "ready"} onClick={() => void change(draft.rule!.enabled ? "mute" : "resume")}>{draft.rule.enabled ? "Mute this item" : "Resume this item"}</Button>
      {kind === "task" && draft.rule.enabled && <><Button className="min-h-11" disabled={busy || draft.status !== "ready"} onClick={() => void change("snooze15")}>Snooze 15 min</Button><Button className="min-h-11" disabled={busy || draft.status !== "ready"} onClick={() => void change("snooze60")}>Snooze 1 hour</Button></>}
    </div></div>}
    {error&&<p role="alert" className="text-sm text-danger">{error}</p>}
    <div className="flex flex-wrap justify-end gap-2">
      {draft.rule&&<Button variant="danger" disabled={busy||draft.status!=="ready"} onClick={()=>void save(true)}>Remove reminder</Button>}
      <Button variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button>
      <Button variant="primary" type="submit" disabled={busy||draft.status!=="ready"}>{busy?"Saving…":"Save reminder"}</Button>
    </div>
  </form>;
}
