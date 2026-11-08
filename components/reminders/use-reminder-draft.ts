"use client";

import { useState } from "react";
import { TaskDataError } from "@/lib/data/tasks";
import { reminderDraft, reminderInput, type ReminderDraft, type ReminderKind } from "@/lib/push/reminder-draft";
import { useItemReminder } from "./reminder-provider";

export function useReminderDraft(kind:ReminderKind,id?:string) {
  const context=useItemReminder(kind,id);
  const [edited,setEdited]=useState<ReminderDraft|null>(null);
  const value=edited??reminderDraft(context.rule,context.preferences?.time_zone??Intl.DateTimeFormat().resolvedOptions().timeZone);
  function validate() {
    if(!edited)return;
    if(context.status!=="ready")throw new TaskDataError("Load the reminder before changing it. Your other details are still here.");
    try {
      if(value.enabled||context.rule)reminderInput(kind,id??"00000000-0000-4000-8000-000000000000",value);
    } catch(error) { throw new TaskDataError(error instanceof Error?error.message:"Choose a valid reminder date and time."); }
  }
  async function save(itemId:string) {
    if(!edited||(!value.enabled&&!context.rule))return;
    await context.save(reminderInput(kind,itemId,value));
  }
  return {...context,value,onChange:setEdited,validate,saveDraft:save};
}
