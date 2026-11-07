"use client";

import { Archive, Flame, Plus, RotateCcw, Target, Trophy } from "lucide-react";
import { useState } from "react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { FilterChips } from "@/components/ui/filter-chips";
import { ProgressRing } from "@/components/ui/progress";
import { streakUnit } from "@/lib/habits";
import { TaskDataError } from "@/lib/data/tasks";
import { habitStreak, isCheckedIn } from "@/lib/selectors";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import type { Habit } from "@/lib/types";
import { GoalProgress } from "./goal-progress";
import { HabitFormDialog } from "./habit-form-dialog";
import { HabitLoadState } from "./habit-load-state";
import { HabitRow } from "./habit-row";

export function HabitsView() {
  const { habits, habitsStatus, goals, today, pendingHabitIds } = useAppState();
  const { archiveHabit } = useAppActions();
  const [filter,setFilter] = useState<"active" | "archived">("active");
  const [creating,setCreating] = useState(false);
  const [editing,setEditing] = useState<Habit>();
  const [error,setError] = useState<string | null>(null);
  const active = habits.filter((h) => h.isActive);
  const daily = active.filter((h) => h.frequency === "daily");
  const done = daily.filter((h) => isCheckedIn(h,today)).length;
  const best = active.filter((h) => h.streakEnabled).sort((a,b) => habitStreak(b,today)-habitStreak(a,today))[0];
  const visible = habits.filter((h) => filter === "active" ? h.isActive : !h.isActive);
  return <>
    <PageHeader title="Habits & Goals" description="Build routines that feel like yours. Keep the streaks you find motivating."
      actions={<Button variant="primary" disabled={habitsStatus !== "ready"} onClick={() => setCreating(true)}><Plus className="h-4 w-4" aria-hidden="true" />New habit</Button>} />
    <HabitLoadState />
    {habitsStatus === "ready" && <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-4"><ProgressRing value={daily.length ? done/daily.length*100 : 0} label="Daily habits completed" /><div><p className="text-xs text-subtle">Daily habits</p><p className="text-sm font-medium">{done} of {daily.length} completed today</p></div></div>
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-4"><Flame className="h-5 w-5 text-warning" aria-hidden="true" /><div className="min-w-0"><p className="text-xs text-subtle">Streak spotlight</p><p className="break-words text-sm font-medium">{best ? `${habitStreak(best,today)} ${streakUnit(best)}${habitStreak(best,today) === 1 ? "" : "s"} · ${best.name}` : "Streaks are optional — progress still counts."}</p></div></div>
      </div>
      <Card className="mb-5">
        <CardHeader title="Your habits" description="Water, reading, movement, or anything you want to make time for." icon={<Target className="h-5 w-5" />} />
        <div className="mb-4"><FilterChips label="Habit status" options={[{value:"active",label:"Active",count:active.length},{value:"archived",label:"Archived",count:habits.length-active.length}]} value={filter} onChange={setFilter} /></div>
        {error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
        {!visible.length ? <EmptyState title={filter === "active" ? "Start with one small habit" : "No archived habits"} description={filter === "active" ? "Create a habit of your own, including water tracking. You choose its target and whether it shows a streak." : "Archived habits keep their history and can be restored."} /> :
          <ul className="divide-y divide-line">{visible.map((h) => <li key={h.id} className="py-4 first:pt-0 last:pb-0"><ul><HabitRow habit={h} showWeek onEdit={() => setEditing(h)} /></ul><div className="mt-3 flex justify-end"><Button variant="ghost" size="sm" disabled={pendingHabitIds.includes(h.id)} onClick={async () => { setError(null); try { await archiveHabit(h,!h.isActive); } catch(err) { setError(err instanceof TaskDataError ? err.message : "Couldn't update this habit."); } }}>{h.isActive ? <Archive className="h-4 w-4" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}{h.isActive ? "Archive" : "Restore"}</Button></div></li>)}</ul>}
      </Card>
    </>}
    <Card id="goals" className="scroll-mt-24"><CardHeader title="Goals" description="Sample goals for now; persistent goals come in a later step." icon={<Trophy className="h-5 w-5" />} /><div className="grid gap-6 sm:grid-cols-2">{goals.map((g) => <GoalProgress key={g.id} goal={g} />)}</div></Card>
    <HabitFormDialog open={creating || !!editing} habit={editing} onClose={() => { setCreating(false); setEditing(undefined); }} />
  </>;
}
