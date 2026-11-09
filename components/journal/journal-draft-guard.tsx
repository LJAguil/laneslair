"use client";
import { useEffect } from "react";
import { useAppState } from "@/lib/store/app-store";
import { journalDirty } from "@/lib/journal";

/** Best effort only: iPhone can terminate a Home Screen app without firing beforeunload. */
export function JournalDraftGuard(){
  const {journalDrafts,journalAdditionDrafts}=useAppState();
  const dirty=Object.values(journalDrafts).some(draft=>journalDirty(draft.body,draft.base))||Object.values(journalAdditionDrafts).some(draft=>draft.body!==draft.baseBody);
  useEffect(()=>{
    if(!dirty)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);
  },[dirty]);
  return null;
}
