"use client";

import { Check, Flame } from "lucide-react";
import { formatWeekday, lastNDays, PROTOTYPE_TODAY } from "@/lib/dates";
import { habitStreak, isCheckedIn } from "@/lib/selectors";
import { useAppActions } from "@/lib/store/app-store";
import type { Habit, HabitFrequency } from "@/lib/types";
import { accentClasses, cn, pluralize } from "@/lib/utils";

const frequencyLabel: Record<HabitFrequency, string> = { daily: "Daily", weekdays: "Weekdays", weekly: "Weekly" };

/** One habit with a check-in toggle, its streak, and (optionally) the last 7 days. */
export function HabitRow({ habit, showWeek = false }: { habit: Habit; showWeek?: boolean }) {
  const { toggleHabitCheckIn } = useAppActions();
  const checked = isCheckedIn(habit);
  const streak = habitStreak(habit);
  const accent = accentClasses[habit.color];

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <button
        type="button"
        onClick={() => toggleHabitCheckIn(habit.id)}
        aria-pressed={checked}
        aria-label={`${checked ? "Undo check-in for" : "Check in"} ${habit.name}`}
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition-colors",
          checked ? "border-transparent bg-accent text-on-accent" : "border-line-strong text-subtle hover:border-accent hover:text-accent-strong",
        )}
      >
        <Check className="h-4 w-4" strokeWidth={checked ? 3 : 2} aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{habit.name}</p>
        <p className="text-xs text-subtle">{frequencyLabel[habit.frequency]}</p>
      </div>

      {showWeek && <WeekDots habit={habit} colorClass={accent.dot} />}

      <span
        className={cn("inline-flex w-14 items-center justify-end gap-1 text-sm tabular-nums", streak > 0 ? "text-warning" : "text-subtle")}
        title={`${pluralize(streak, "day")} streak`}
      >
        <Flame className="h-4 w-4" aria-hidden="true" />
        {streak}
        <span className="sr-only"> day streak</span>
      </span>
    </li>
  );
}

function WeekDots({ habit, colorClass }: { habit: Habit; colorClass: string }) {
  const days = lastNDays(7);
  return (
    <ol className="hidden items-center gap-1.5 sm:flex" aria-label={`${habit.name}, last 7 days`}>
      {days.map((d) => {
        const done = habit.checkIns.includes(d);
        return (
          <li key={d} className="flex flex-col items-center gap-1">
            <span className={cn("h-5 w-5 rounded-md", done ? colorClass : "bg-raised", d === PROTOTYPE_TODAY && "ring-1 ring-line-strong ring-offset-1 ring-offset-panel")}>
              <span className="sr-only">
                {formatWeekday(d)}: {done ? "done" : "missed"}
              </span>
            </span>
            <span className="text-[10px] text-subtle" aria-hidden="true">
              {formatWeekday(d, "narrow")}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
