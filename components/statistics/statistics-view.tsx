"use client";

import { BookOpen, CheckCheck, RefreshCw, Target } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { FilterChips } from "@/components/ui/filter-chips";
import { ProgressBar } from "@/components/ui/progress";
import { formatShortDate } from "@/lib/dates";
import { fetchStatistics, loadingStatistics, type StatisticsSnapshot, type StatisticsSource } from "@/lib/data/statistics";
import { TaskDataError } from "@/lib/data/tasks";
import { habitStatistics, journalStatistics, quantityStatistics, statisticsRange, taskStatistics, type HabitStatisticsData, type PeriodDays, type StatisticsRange } from "@/lib/statistics";
import { useAppState } from "@/lib/store/app-store";

const number=(value:number)=>new Intl.NumberFormat("en-US",{maximumFractionDigits:3}).format(value);
const percent=(value:number)=>`${new Intl.NumberFormat("en-US",{maximumFractionDigits:1}).format(value)}%`;
export function StatisticsView(){
  const {today}=useAppState();const [days,setDays]=useState<PeriodDays>(30);
  const [quantityId,setQuantityId]=useState("");
  const range=useMemo(()=>statisticsRange(today,days),[today,days]);
  return <div className="mx-auto max-w-6xl space-y-5">
    <PageHeader title="Statistics" description="A little perspective on your days. Real records, with room for the gaps." />
    <FilterChips label="Statistics period" options={[7,30,90].map(days=>({value:String(days),label:`${days} days`}))} value={String(days)} onChange={value=>setDays(Number(value) as PeriodDays)} />
    <StatisticsPeriod key={`${today}/${days}`} range={range} quantityId={quantityId} onQuantityChange={setQuantityId} />
  </div>;
}
function StatisticsPeriod({range,quantityId,onQuantityChange}:{range:StatisticsRange;quantityId:string;onQuantityChange:(id:string)=>void}){
  const [snapshot,setSnapshot]=useState<StatisticsSnapshot>(loadingStatistics);
  const [loadedAt,setLoadedAt]=useState<string|null>(null);const sequence=useRef({version:0});
  const refresh=useCallback(async()=>{
    const state=sequence.current,request=++state.version;setSnapshot(loadingStatistics());setLoadedAt(null);
    try{const next=await fetchStatistics(statisticsRange(range.through,range.length));if(request!==state.version)return;setSnapshot(next);setLoadedAt(new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}));}
    catch(error){if(request!==state.version)return;const failed={status:"error" as const,error:error instanceof TaskDataError?error.message:"Couldn’t load statistics. Check your connection and try again."};setSnapshot({journal:failed,habits:failed,tasks:failed});}
  },[range]);
  useEffect(()=>{const state=sequence.current;let active=true;void Promise.resolve().then(()=>{if(active)return refresh();});return()=>{active=false;state.version++;};},[refresh]);
  return <StatisticsReport range={range} snapshot={snapshot} loadedAt={loadedAt} refresh={refresh} quantityId={quantityId} onQuantityChange={onQuantityChange} />;
}
export function StatisticsReport({range,snapshot,loadedAt,refresh,quantityId,onQuantityChange}:{range:StatisticsRange;snapshot:StatisticsSnapshot;loadedAt:string|null;refresh:()=>Promise<void>;quantityId:string;onQuantityChange:(id:string)=>void}){
  const loading=Object.values(snapshot).some(source=>source.status==="loading");
  const journal=snapshot.journal.status==="ready"?journalStatistics(snapshot.journal.data,range):null;
  const habits=snapshot.habits.status==="ready"?habitStatistics(snapshot.habits.data,range):null;
  const tasks=snapshot.tasks.status==="ready"?taskStatistics(snapshot.tasks.data,range):null;
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <p><time dateTime={range.from}>{formatShortDate(range.from)}</time> – <time dateTime={range.through}>{formatShortDate(range.through)}</time> · {range.length} calendar days including today</p>
      <Button disabled={loading} onClick={()=>void refresh()}><RefreshCw className="h-4 w-4" aria-hidden="true" />{loading?"Loading…":"Refresh statistics"}</Button>
    </div>
    <p className="text-xs text-subtle">Dates follow this device ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Journal/log dates stay as recorded; task completion timestamps use local dates. {loadedAt?`Snapshot loaded at ${loadedAt}.`:""}</p>
    <div className="grid items-start gap-4 lg:grid-cols-3">
      <Card><CardHeader title="Journal days" icon={<BookOpen className="h-4 w-4" aria-hidden="true" />} /><Source source={snapshot.journal} retry={refresh}>{journal&&<>
        <p className="text-2xl font-semibold tabular-nums">{journal.count}<span className="ml-2 text-sm font-normal text-muted">of {journal.denominator} days</span></p>
        <p className="mt-2 text-sm text-muted">{journal.count?`${percent(journal.percent)} of calendar days have a saved entry.`:"No saved entries dated in this period."}</p>
        <p className="mt-3 text-xs text-subtle">Counts distinct entry dates, not edit dates or writing sessions. The denominator includes every calendar day in this range.</p><Link href="/journal" className="mt-3 inline-block text-sm text-accent-strong hover:underline">Open journal</Link>
      </>}</Source></Card>
      <Card><CardHeader title="Recorded habit progress" icon={<Target className="h-4 w-4" aria-hidden="true" />} /><Source source={snapshot.habits} retry={refresh}>{habits&&<>
        <p className="text-2xl font-semibold tabular-nums">{habits.reached}<span className="ml-2 text-sm font-normal text-muted">of {habits.recorded} logs reached target</span></p>
        <p className="mt-2 text-sm text-muted">{habits.recorded?`${percent(habits.percent!)} of recorded targets reached across ${habits.days} dates.`:"No habit logs recorded in this period."}</p>
        {habits.percent!==null&&<ProgressBar className="mt-3" value={habits.percent} label="Recorded habit targets reached" />}
        <p className="mt-3 text-xs text-subtle">One log per habit/date. Includes zero logs and archived habits. Targets come from each saved log. Missing days aren’t counted as failures; this is not an adherence rate.</p>
      </>}</Source></Card>
      <Card><CardHeader title="Currently completed tasks" icon={<CheckCheck className="h-4 w-4" aria-hidden="true" />} /><Source source={snapshot.tasks} retry={refresh}>{tasks&&<>
        <p className="text-2xl font-semibold tabular-nums">{tasks.count}</p><p className="mt-2 text-sm text-muted">{tasks.count?"Tasks still marked Done with a completion date in this period.":"No currently completed tasks have a completion date in this period."}</p>
        <p className="mt-3 text-xs text-subtle">Excludes reopened/cancelled tasks, missing completion dates and deleted tasks. Earlier completions aren’t reconstructed. No historical completion-rate denominator is available.</p><Link href="/tasks" className="mt-3 inline-block text-sm text-accent-strong hover:underline">Open tasks</Link>
      </>}</Source></Card>
    </div>
    <Card><CardHeader title="Quantity trends" description="Choose one habit; units are never combined." /><Source source={snapshot.habits} retry={refresh}>{snapshot.habits.status==="ready"&&<QuantityTrends data={snapshot.habits.data} range={range} choice={quantityId} onChange={onQuantityChange} />}</Source></Card>
    <Card><CardHeader title="Daily records" description="The same counts by calendar date. Unavailable sources stay unknown." />
      <div role="region" aria-label="Daily statistics table" tabIndex={0} className="max-h-96 overflow-auto rounded-lg border border-line">
        <table className="w-full min-w-[30rem] text-left text-sm"><caption className="sr-only">Daily journal presence, recorded habit results, and currently completed tasks from {range.from} through {range.through}.</caption><thead className="bg-raised text-xs text-muted"><tr>{["Date","Journal entry","Habit targets / logs","Currently done tasks"].map(title=><th key={title} scope="col" className="px-3 py-3 font-medium">{title}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">{[...range.dates].reverse().map(date=>{
            const logs=habits?.records.filter(log=>log.date===date),done=tasks?.completed.filter(task=>task.completedAt?.slice(0,10)===date);
            return <tr key={date}><th scope="row" className="whitespace-nowrap px-3 py-3 font-normal"><time dateTime={date}>{formatShortDate(date)}</time></th><td className="px-3 py-3 text-muted">{journal?(journal.saved.has(date)?<Link className="text-accent-strong hover:underline" href={`/journal?date=${date}`}>Saved</Link>:"No entry"):sourceLabel(snapshot.journal)}</td><td className="px-3 py-3 text-muted">{logs?(logs.length?`${logs.filter(log=>log.amount>=log.target).length} / ${logs.length}`:"No logs"):sourceLabel(snapshot.habits)}</td><td className="px-3 py-3 text-muted">{done?done.length:sourceLabel(snapshot.tasks)}</td></tr>;
          })}</tbody>
        </table>
      </div>
    </Card>
    <details className="rounded-xl border border-line bg-panel p-4 text-sm text-muted"><summary className="cursor-pointer font-medium">What these statistics can—and can’t—tell you</summary><div className="mt-3 space-y-3">
      <p>These are the surviving records currently in your account, not a full activity ledger. Deletions and reopened tasks can change an older period’s counts. Archive labels reflect current state, not past pause dates. Weekly habits have weekly goals; this page counts their saved daily records, not missed weekdays.</p>
      <p>Journal content and task notes are not loaded for Statistics. Goals, events, AI/sample activity, and device-local games are excluded. Rune Lock progress is still per device and isn’t mixed into account-wide counts.</p>
      <p>Saved habit targets are used for recorded dates. No target is invented for an unlogged day, and no quantities with different units are added together. Refresh for a new snapshot; these tables aren’t a live event stream.</p>
      <Link href="/overview" className="inline-block text-accent-strong hover:underline">Open Overview</Link>
    </div></details>
  </>;
}
function sourceLabel(source:StatisticsSource<unknown>){return source.status==="loading"?"Loading…":"Unavailable";}
function Source({source,retry,children}:{source:StatisticsSource<unknown>;retry:()=>Promise<void>;children:ReactNode}){
  return source.status==="loading"?<p role="status" className="text-sm text-muted">Loading this source…</p>:source.status==="error"?<div role="alert" className="space-y-3"><p className="text-sm text-danger">{source.error}</p><Button size="sm" onClick={()=>void retry()}>Retry statistics</Button></div>:children;
}
function QuantityTrends({data,range,choice,onChange}:{data:HabitStatisticsData;range:StatisticsRange;choice:string;onChange:(id:string)=>void}){
  const quantities=data.habits.filter(habit=>habit.trackingType==="quantity");
  const id=quantities.some(habit=>habit.id===choice)?choice:quantities[0]?.id;
  const result=id?quantityStatistics(data,id,range):null;
  if(!quantities.length)return <p className="text-sm text-muted">No quantity habits yet. Track water or another amount using New habit on <Link href="/habits" className="text-accent-strong hover:underline">Habits</Link>.</p>;
  return <div className="space-y-4">
    <Field label="Quantity habit" htmlFor="statistics-quantity"><Select id="statistics-quantity" value={id} onChange={event=>onChange(event.target.value)} className="sm:max-w-md">{quantities.map(habit=><option key={habit.id} value={habit.id}>{habit.name} · {habit.unit}{habit.isActive?"":" · archived now"}</option>)}</Select></Field>
    {result&&(result.recordedDays?<>
      <p className="text-sm text-muted"><strong className="text-fg">{number(result.total)} {result.habit.unit}</strong> recorded across {result.recordedDays} logged days. Average per logged day: {number(result.mean!)} {result.habit.unit}. {result.reached} saved daily targets reached.</p>
      <figure aria-hidden="true" className="space-y-2"><div className="grid h-28 items-end gap-px rounded-lg border border-line bg-raised/30 px-2 pt-3" style={{gridTemplateColumns:`repeat(${range.length}, minmax(0, 1fr))`}}>{result.rows.map(row=><div key={row.date} title={`${row.date}: ${row.log?`${number(row.log.amount)} ${result.habit.unit}`:"No log"}`} className={row.log?"min-h-px rounded-t bg-accent":"h-px border-b border-dashed border-line-strong"} style={row.log?{height:`${result.max?Math.max(1,row.log.amount/result.max*100):1}%`}:undefined} />)}</div><figcaption className="flex justify-between text-xs text-subtle"><span>{formatShortDate(range.from)}</span><span>{formatShortDate(range.through)}</span></figcaption></figure>
      <p className="text-xs text-subtle">Bars compare recorded amounts with the largest recorded day in this range. Gaps mean no log, not zero. Exact values and saved targets are in the table.</p>
      <div role="region" aria-label="Quantity trend values" tabIndex={0} className="max-h-80 overflow-auto rounded-lg border border-line"><table className="w-full min-w-[24rem] text-left text-sm"><caption className="p-3 text-left text-xs text-muted">{result.habit.name} · {result.habit.unit} · {range.from} to {range.through}. Average denominator: logged days only, including zero records.</caption><thead className="bg-raised text-xs text-muted"><tr>{["Date","Amount","Saved target","Result"].map(label=><th key={label} scope="col" className="px-3 py-2 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-line">{[...result.rows].reverse().map(row=><tr key={row.date}><th scope="row" className="whitespace-nowrap px-3 py-2 font-normal">{formatShortDate(row.date)}</th><td className="px-3 py-2">{row.log?number(row.log.amount):"No log"}</td><td className="px-3 py-2">{row.log?number(row.log.target):"Unknown"}</td><td className="px-3 py-2">{!row.log?"—":row.log.amount>=row.log.target?"Reached":row.log.amount>0?"Partial":"Zero recorded"}</td></tr>)}</tbody></table></div>
    </>:<p className="text-sm text-muted">No {result.habit.name} amounts recorded in this period. No daily targets or zero amounts have been invented for the gaps.</p>)}
  </div>;
}
