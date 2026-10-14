"use client";

import { Activity } from "lucide-react";
import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { formatShortDate, formatWeekday, PROTOTYPE_TODAY } from "@/lib/dates";
import { weeklyActivity, type ActivityDay } from "@/lib/selectors";
import { useAppState } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";

// Two-series palette validated for dark-mode separation and contrast on the panel surface.
const SERIES = [
  { key: "tasksCompleted", label: "Tasks completed", color: "#8b7cf8" },
  { key: "habitCheckIns", label: "Habit check-ins", color: "#059669" },
] as const satisfies ReadonlyArray<{ key: keyof ActivityDay; label: string; color: string }>;

const CHART_HEIGHT = 128;

export function WeeklyActivityCard() {
  const { tasks, habits } = useAppState();
  const [view, setView] = useState<"chart" | "table">("chart");
  const days = weeklyActivity(tasks, habits);
  const max = Math.max(1, ...days.flatMap((d) => [d.tasksCompleted, d.habitCheckIns]));
  const totals = {
    tasks: days.reduce((n, d) => n + d.tasksCompleted, 0),
    habits: days.reduce((n, d) => n + d.habitCheckIns, 0),
  };

  return (
    <Card>
      <CardHeader
        title="Weekly activity"
        description="Last 7 days"
        icon={<Activity className="h-[18px] w-[18px]" />}
        action={
          <button
            type="button"
            onClick={() => setView((v) => (v === "chart" ? "table" : "chart"))}
            className="rounded text-xs font-medium text-accent-strong hover:underline"
          >
            {view === "chart" ? "Show table" : "Show chart"}
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2">
        <Total label="Tasks completed" value={totals.tasks} color={SERIES[0].color} />
        <Total label="Habit check-ins" value={totals.habits} color={SERIES[1].color} />
      </div>

      {view === "chart" ? (
        <div className="relative" style={{ height: CHART_HEIGHT + 24 }}>
          {/* Recessive baseline */}
          <div className="absolute inset-x-0 border-t border-line" style={{ top: CHART_HEIGHT }} aria-hidden="true" />
          <ol className="relative grid h-full grid-cols-7 gap-1" aria-label="Activity by day">
            {days.map((d) => (
              <DayColumn key={d.date} day={d} max={max} />
            ))}
          </ol>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-subtle">
              <th scope="col" className="pb-2 font-medium">Day</th>
              <th scope="col" className="pb-2 text-right font-medium">Tasks</th>
              <th scope="col" className="pb-2 text-right font-medium">Habits</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {days.map((d) => (
              <tr key={d.date}>
                <th scope="row" className="py-1.5 text-left font-normal text-muted">
                  {formatWeekday(d.date)} {formatShortDate(d.date)}
                </th>
                <td className="py-1.5 text-right tabular-nums">{d.tasksCompleted}</td>
                <td className="py-1.5 text-right tabular-nums">{d.habitCheckIns}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function Total({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} aria-hidden="true" />
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function DayColumn({ day, max }: { day: ActivityDay; max: number }) {
  const isToday = day.date === PROTOTYPE_TODAY;
  const summary = `${formatWeekday(day.date)} ${formatShortDate(day.date)}: ${day.tasksCompleted} tasks completed, ${day.habitCheckIns} habit check-ins`;

  return (
    <li
      tabIndex={0}
      aria-label={summary}
      className="group relative flex flex-col items-center rounded-md outline-offset-0 hover:bg-raised/40 focus-visible:bg-raised/40"
    >
      <div className="flex w-full items-end justify-center gap-[2px]" style={{ height: CHART_HEIGHT }} aria-hidden="true">
        {SERIES.map((s) => {
          const value = day[s.key];
          return (
            <div
              key={s.key}
              className="w-2.5 rounded-t-[4px] transition-[height] duration-300 sm:w-3"
              style={{ height: value === 0 ? 2 : (value / max) * (CHART_HEIGHT - 8), background: value === 0 ? "var(--color-line)" : s.color }}
            />
          );
        })}
      </div>
      <span className={cn("mt-2 text-[11px]", isToday ? "font-semibold text-fg" : "text-subtle")} aria-hidden="true">
        {formatWeekday(day.date)}
      </span>

      {/* Hover / focus tooltip */}
      <div
        role="presentation"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-max -translate-x-1/2 rounded-lg border border-line bg-raised px-3 py-2 text-xs shadow-lg shadow-black/40 group-hover:block group-focus-visible:block"
      >
        <p className="mb-1 font-medium text-fg">
          {formatWeekday(day.date)}, {formatShortDate(day.date)}
        </p>
        {SERIES.map((s) => (
          <p key={s.key} className="flex items-center gap-2 text-muted">
            <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
            {s.label}
            <span className="ml-auto pl-3 font-semibold tabular-nums text-fg">{day[s.key]}</span>
          </p>
        ))}
      </div>
    </li>
  );
}
