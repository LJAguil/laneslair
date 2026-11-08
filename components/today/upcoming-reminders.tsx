"use client";

import { Bell, Pause } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/store/app-store";
import { upcomingReminders } from "@/lib/push/upcoming";
import { useReminders } from "@/components/reminders/reminder-provider";
import { ReminderButton } from "@/components/reminders/reminder-button";

// Only refreshes a visual preview; actual delivery is performed by the server scheduler.
function subscribe(callback:()=>void){const timer=setInterval(callback,30000);window.addEventListener("focus",callback);return()=>{clearInterval(timer);window.removeEventListener("focus",callback);};}
const clock=()=>Math.floor(Date.now()/30000)*30000;
const serverClock=()=>0;
export function UpcomingReminders() {
  const {rules,preferences,status,error,reload}=useReminders();
  const {tasks,habits,projects,tasksStatus,habitsStatus,projectsStatus}=useAppState();
  const now=useSyncExternalStore(subscribe,clock,serverClock);
  const dataReady=tasksStatus==="ready"&&habitsStatus==="ready"&&projectsStatus==="ready";
  const dataFailed=[tasksStatus,habitsStatus,projectsStatus].includes("error");
  const list=dataReady&&preferences&&now?upcomingReminders({rules,preferences,tasks,habits,projects,now}):[];
  return <Card>
    <CardHeader title="Next reminders" description="Your next 24 hours." icon={<Bell className="h-[18px] w-[18px]" aria-hidden="true" />} />
    {status==="loading"&&<p role="status" className="text-sm text-muted">Loading reminders…</p>}
    {status==="error"&&<div role="alert" className="space-y-2"><p className="text-sm text-danger">{error}</p><Button onClick={()=>void reload()}>Retry reminders</Button></div>}
    {status==="ready"&&(!preferences?<p className="text-sm text-muted">Save your preferences in <Link className="text-accent-strong hover:underline" href="/settings#notifications">notification settings</Link> to start reminders.</p>:preferences.paused?<p className="flex items-center gap-2 text-sm text-warning"><Pause className="h-4 w-4" aria-hidden="true" />All reminders are paused. <Link className="underline" href="/settings#notifications">Manage</Link></p>:dataFailed?<p role="alert" className="text-sm text-danger">Some items couldn’t load. Their reminders can’t be previewed yet; retry the affected list.</p>:!dataReady||!now?<p role="status" className="text-sm text-muted">Checking your tasks and habits…</p>:<>
      {!list.length?<p className="text-sm text-muted">Nothing scheduled in the next 24 hours. Use an item’s bell to add a reminder.</p>:<ul className="divide-y divide-line">{list.map(item=><li key={item.rule.id} className="flex items-center gap-3 py-3 first:pt-0">
        <div className="min-w-0 flex-1"><Link className="block truncate text-sm font-medium hover:text-accent-strong" href={item.kind==="task"?"/tasks":"/habits"}>{item.title}</Link><p className="mt-1 text-xs text-subtle"><time dateTime={new Date(item.instant).toISOString()}>{new Intl.DateTimeFormat("en-US",{timeZone:item.rule.time_zone,weekday:"short",hour:"numeric",minute:"2-digit"}).format(item.instant)}</time> · {item.rule.time_zone}</p></div>
        <ReminderButton kind={item.kind} id={(item.rule.task_id??item.rule.habit_id)!} name={item.title} />
      </li>)}</ul>}
      <p className="mt-3 text-xs text-subtle">A schedule preview, not a delivery log. Quiet hours and completed targets are excluded; device permissions still apply.</p>
    </>)}
  </Card>;
}
