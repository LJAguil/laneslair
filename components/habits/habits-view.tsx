"use client";

import { Flame, Target, Trophy } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress";
import { goalPercent, habitStreak, isCheckedIn } from "@/lib/selectors";
import { useAppState } from "@/lib/store/app-store";
import { pluralize } from "@/lib/utils";
import { GoalProgress } from "./goal-progress";
import { HabitRow } from "./habit-row";

export function HabitsView() {
  const { habits, goals } = useAppState();
  const doneToday = habits.filter((h) => isCheckedIn(h)).length;
  const best = habits.reduce<{ name: string; streak: number } | null>((acc, h) => {
    const streak = habitStreak(h);
    return !acc || streak > acc.streak ? { name: h.name, streak } : acc;
  }, null);
  const completion = habits.length ? Math.round((doneToday / habits.length) * 100) : 0;

  return (
    <>
      <PageHeader title="Habits & Goals" description="Small check-ins, long streaks, steady progress." />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-4">
          <ProgressRing value={completion} label="Habits done today" />
          <div>
            <p className="text-xs text-subtle">Today</p>
            <p className="text-sm font-medium">
              {doneToday} of {habits.length} checked in
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-warning/10 text-warning" aria-hidden="true">
            <Flame className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-subtle">Longest active streak</p>
            <p className="truncate text-sm font-medium">{best ? `${pluralize(best.streak, "day")} · ${best.name}` : "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent-strong" aria-hidden="true">
            <Trophy className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs text-subtle">Goals over halfway</p>
            <p className="text-sm font-medium">
              {goals.filter((g) => goalPercent(g) >= 50).length} of {goals.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Habits" description="Check in for today and watch the last 7 days fill in." icon={<Target className="h-[18px] w-[18px]" />} />
          <ul className="divide-y divide-line/70">
            {habits.map((h) => (
              <HabitRow key={h.id} habit={h} showWeek />
            ))}
          </ul>
        </Card>
        <Card id="goals" className="scroll-mt-24 xl:col-span-2">
          <CardHeader title="Goals" icon={<Trophy className="h-[18px] w-[18px]" />} />
          <div className="space-y-6">
            {goals.map((g) => (
              <GoalProgress key={g.id} goal={g} />
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
