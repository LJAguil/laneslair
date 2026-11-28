import { ProgressBar } from "@/components/ui/progress";
import { formatShortDate } from "@/lib/dates";
import { goalPercent } from "@/lib/selectors";
import type { Goal } from "@/lib/types";
import { accentClasses } from "@/lib/utils";

function formatAmount(goal: Goal, value: number) {
  return goal.unit === "$" ? `$${value.toLocaleString("en-US")}` : value.toLocaleString("en-US");
}

/** Goal title, progress bar, and current vs target values. */
export function GoalProgress({ goal }: { goal: Goal }) {
  const percent = goalPercent(goal);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 break-words text-sm font-medium">{goal.title}</p>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{percent}%</span>
      </div>
      <ProgressBar value={percent} label={`${goal.title} progress`} barClassName={accentClasses[goal.color].bar} className="mt-2" />
      <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm text-subtle">
        <span className="tabular-nums">
          {formatAmount(goal, goal.current)} of {formatAmount(goal, goal.target)}
          {goal.unit !== "$" && ` ${goal.unit}`}
        </span>
        {goal.targetDate && <span>by {formatShortDate(goal.targetDate)}</span>}
      </p>
    </div>
  );
}
