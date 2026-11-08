"use client";

import { CalendarDays, Check, ChevronLeft, ChevronRight, Circle, CircleSlash, Clock, Minus, Sprout, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { ProgressBar } from "@/components/ui/progress";
import { formatLongDate, parseISODate } from "@/lib/dates";
import { amountLabel } from "@/lib/habits";
import { calendarDays, calendarHabits, calendarKeyDate, historyLabels, monthStart, recordedWeek, shiftCalendarMonth, summarizeDay, validCalendarDate, type HistoryState } from "@/lib/habit-calendar";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";

const icons:Record<HistoryState,LucideIcon>={complete:Check,partial:Circle,zero:CircleSlash,"no-log":Minus,future:Clock,"before-creation":Sprout};
const colors:Record<HistoryState,string>={complete:"text-success",partial:"text-warning",zero:"text-muted","no-log":"text-subtle",future:"text-subtle","before-creation":"text-subtle"};
export function HabitCalendar(){
  const {habits,habitsStatus,habitsError,today}=useAppState();const {loadHabits}=useAppActions();
  const [month,setMonth]=useState(monthStart(today)),[selected,setSelected]=useState(today),[habitId,setHabit]=useState("all"),[includeArchived,setArchived]=useState(false);
  const id=useId(),selection=useRef<HTMLButtonElement|null>(null),focusAfterMove=useRef(false);
  const options=habits.filter(habit=>includeArchived||habit.isActive);
  const effectiveId=options.some(habit=>habit.id===habitId)?habitId:"all";
  const filtered=calendarHabits(habits,includeArchived,effectiveId),ready=habitsStatus==="ready";
  const dates=calendarDays(month),details=summarizeDay(filtered,selected,today);
  useEffect(()=>{if(focusAfterMove.current){selection.current?.focus();focusAfterMove.current=false;}},[month,selected]);
  function choose(date:string,focus=false){if(!validCalendarDate(date))return;focusAfterMove.current=focus;setSelected(date);setMonth(monthStart(date));}
  const monthLabel=new Intl.DateTimeFormat("en-US",{month:"long",year:"numeric"}).format(parseISODate(month));
  return <section className="mb-5 rounded-2xl border border-line bg-panel p-4 sm:p-5" aria-label="Habit history calendar">
    <CardHeader title="Habit history" description="A record of what you logged. Read-only; blank dates aren’t failures." icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />} />
    <fieldset disabled={!ready} className="mb-4 grid items-end gap-3 sm:grid-cols-2">
      <Field label="Habit" htmlFor={`${id}-habit`}><Select id={`${id}-habit`} value={effectiveId} onChange={event=>setHabit(event.target.value)}><option value="all">All included habits</option>{options.map(habit=><option key={habit.id} value={habit.id}>{habit.name}{habit.isActive?"":" (archived)"}</option>)}</Select></Field>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-muted"><input className="h-5 w-5 accent-[var(--color-accent)]" type="checkbox" checked={includeArchived} onChange={event=>{setArchived(event.target.checked);if(!event.target.checked&&habits.some(habit=>habit.id===habitId&&!habit.isActive))setHabit("all");}} />Include archived habits</label>
    </fieldset>
    {habitsStatus==="loading"&&<p role="status" className="py-4 text-sm text-muted">Loading habit history…</p>}
    {habitsStatus==="error"&&<div role="alert" className="space-y-3 rounded-xl border border-danger/30 p-4"><p className="text-sm text-danger">{habitsError??"Habit history couldn’t load."}</p><Button onClick={()=>void loadHabits()}>Retry habit history</Button></div>}
    {ready&&(!filtered.length?<p className="py-4 text-sm text-muted">{habits.length?"No active habits to show. Include archived habits to view their records.":"No habits yet. Use New habit to start; the calendar won’t create any records."}</p>:<>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 id={`${id}-month`} aria-live="polite" className="text-base font-semibold">{monthLabel}</h3>
            <div className="flex items-center gap-1"><Button size="icon" variant="ghost" aria-label="Previous history month" onClick={()=>choose(shiftCalendarMonth(selected,-1))}><ChevronLeft className="h-4 w-4" aria-hidden="true" /></Button><Button size="sm" onClick={()=>choose(today,true)}>Today</Button><Button size="icon" variant="ghost" aria-label="Next history month" onClick={()=>choose(shiftCalendarMonth(selected,1))}><ChevronRight className="h-4 w-4" aria-hidden="true" /></Button></div>
          </div>
          <div role="grid" aria-readonly="true" aria-labelledby={`${id}-month`} aria-describedby={`${id}-keys`}>
            <div role="row" className="mb-1 grid grid-cols-7 gap-1">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day=><span role="columnheader" key={day} className="py-2 text-center text-[11px] text-subtle">{day}</span>)}</div>
            {Array.from({length:6},(_,week)=><div role="row" className="grid grid-cols-7 gap-1" key={week}>{dates.slice(week*7,week*7+7).map(date=>{
              const summary=summarizeDay(filtered,date,today),Icon=icons[summary.state];
              const label=`${formatLongDate(date)}. ${historyLabels[summary.state]}. ${summary.recorded?`${summary.complete} recorded targets reached, ${summary.recorded} habits logged.`:""}${date>today?" Future date.":""}${date===today?" Today.":""}`;
              return <div role="gridcell" aria-selected={date===selected} key={date} className="min-w-0 py-0.5"><button type="button" ref={date===selected?selection:undefined} tabIndex={date===selected?0:-1} aria-label={label} aria-current={date===today?"date":undefined}
                style={{minWidth:0}} onClick={()=>choose(date,true)} onKeyDown={event=>{const next=calendarKeyDate(date,event.key,event.shiftKey);if(next){event.preventDefault();choose(next,true);}}}
                className={cn("flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-lg border px-0.5 text-sm transition-colors hover:bg-hover",colors[summary.state],date===selected?"border-accent bg-accent-soft ring-1 ring-accent":"border-transparent bg-raised/40",date.slice(0,7)!==month.slice(0,7)&&"opacity-50")}>
                <span className={cn("font-medium",date===today&&"underline decoration-accent decoration-2 underline-offset-4")}>{Number(date.slice(-2))}</span><Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </button></div>;
            })}</div>)}
          </div>
          <p id={`${id}-keys`} className="mt-3 text-xs text-subtle">Arrow keys move by day/week. Home/End move within a week; Page Up/Down changes month (Shift changes year). Enter or Space selects a day.</p>
          <div className="mt-3"><Field label="Jump to date" htmlFor={`${id}-date`}><Input id={`${id}-date`} type="date" value={selected} onChange={event=>choose(event.target.value)} /></Field></div>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted" aria-label="Calendar legend">{(Object.keys(historyLabels) as HistoryState[]).map(state=>{const Icon=icons[state];return <li key={state} className="flex items-center gap-1.5"><Icon className={cn("h-3.5 w-3.5",colors[state])} aria-hidden="true" />{historyLabels[state]}</li>;})}</ul>
          <p className="mt-3 text-xs text-subtle">With multiple habits, the check means all recorded targets on that date were reached—not that every habit was due or completed.</p>
        </div>
        <section className="min-w-0 rounded-xl border border-line p-4" aria-labelledby={`${id}-selected`}>
          <h3 id={`${id}-selected`} aria-live="polite" className="text-sm font-semibold"><time dateTime={selected}>{formatLongDate(selected)}</time></h3>
          <p className="mt-1 text-xs text-subtle">{details.recorded} {details.recorded===1?"habit":"habits"} with a saved log · {details.complete} targets reached</p>
          <ul className="mt-4 divide-y divide-line">{details.rows.map(row=>{
            const Icon=icons[row.state];return <li key={row.habit.id} className="space-y-2 py-4 first:pt-0">
              <p className="break-words text-sm font-medium">{row.habit.name}{!row.habit.isActive&&<span className="ml-2 text-xs font-normal text-subtle">Archived now</span>}</p>
              <p className={cn("flex items-center gap-1.5 text-xs",colors[row.state])}><Icon className="h-3.5 w-3.5" aria-hidden="true" />{row.habit.frequency!=="daily"?"Daily record · ":""}{historyLabels[row.state]}</p>
              {row.log&&<><p className="text-sm text-muted">{amountLabel(row.log.amount,row.habit.unit)} / {amountLabel(row.log.target,row.habit.unit)} <span className="text-xs">saved target</span></p><ProgressBar value={row.log.amount/row.log.target*100} label={`${row.habit.name} recorded progress on ${selected}`} /></>}
              {row.log&&row.future&&<p className="text-xs text-warning">A future-dated record is present; it is shown without changing it.</p>}
              {row.log&&row.beforeCreation&&<p className="text-xs text-subtle">This record predates the displayed creation day and is retained as recorded.</p>}
              {row.habit.frequency!=="daily"&&<p className="text-xs text-muted">Current weekly goal: {row.habit.targetPerWeek} successful days. {recordedWeek(row.habit,selected)} successful days recorded in this Monday–Sunday week. A blank day is not a missed daily obligation.</p>}
            </li>;
          })}</ul>
          <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-subtle">No-log dates have no recorded amount or historical target to display. Current active/archived status does not tell us exactly when a habit was paused in the past.</p>
        </section>
      </div>
    </>)}
  </section>;
}
