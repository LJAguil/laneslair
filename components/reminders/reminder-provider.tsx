"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { deleteReminder, loadNotificationSettings, saveReminder } from "@/lib/push/actions";
import type { NotificationPreferences, ReminderRule } from "@/lib/push/types";
import type { ReminderKind } from "@/lib/push/reminder-draft";

interface ReminderState {
  rules: ReminderRule[];
  preferences: NotificationPreferences | null;
  status: "loading" | "ready" | "error";
  error: string | null;
}
interface ReminderContext extends ReminderState {
  reload: () => Promise<void>;
  save: (input: Omit<ReminderRule,"id">) => Promise<void>;
  remove: (rule: ReminderRule) => Promise<void>;
}
const Context = createContext<ReminderContext | null>(null);
export function ReminderProvider({ children }: { children: ReactNode }) {
  const [state,setState] = useState<ReminderState>({rules:[],preferences:null,status:"loading",error:null});
  const revision=useRef(0),read=useRef(0);
  const reload = useCallback(async () => {
    const started=revision.current,sequence=++read.current;
    try {
      const result = await loadNotificationSettings(null);
      if (!result.ok) throw new Error(result.error);
      if(started!==revision.current||sequence!==read.current)return;
      setState({rules:result.data.rules,preferences:result.data.preferences,status:"ready",error:null});
    } catch(error) { if(started===revision.current&&sequence===read.current)setState(previous=>({...previous,status:"error",error:error instanceof Error?error.message:"Couldn’t load reminders."})); }
  },[]);
  useEffect(()=>{void Promise.resolve().then(reload);},[reload]);
  const save = useCallback(async (input: Omit<ReminderRule,"id">) => {
    // Resolve the owned rule on the server, including retries after an uncertain response.
    const result = await saveReminder(null,input);
    if (!result.ok) throw new Error(result.error);
    revision.current++;
    setState(previous=>({...previous,rules:[...previous.rules.filter(rule=>rule.task_id!==result.data.task_id || rule.habit_id!==result.data.habit_id),result.data]}));
  },[]);
  const remove = useCallback(async (rule:ReminderRule)=>{
    const result=await deleteReminder(rule.id);if(!result.ok)throw new Error(result.error);
    revision.current++;
    setState(previous=>({...previous,rules:previous.rules.filter(r=>r.id!==rule.id)}));
  },[]);
  const value=useMemo(()=>({...state,reload,save,remove}),[state,reload,save,remove]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useReminders() {
  const context=useContext(Context);if(!context)throw new Error("Reminders need ReminderProvider");return context;
}
export function useItemReminder(kind: ReminderKind,id?: string) {
  const context=useReminders();
  return {...context,rule:context.rules.find(rule=>kind==="task"?rule.task_id===id:rule.habit_id===id)};
}
