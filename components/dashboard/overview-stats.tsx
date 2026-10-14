"use client";

import { AlertTriangle, CalendarCheck, CheckCircle2, ListTodo, type LucideIcon } from "lucide-react";
import { taskStats } from "@/lib/selectors";
import { useAppState } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  value: number;
  icon: LucideIcon;
  iconClass: string;
}

/** Daily overview tiles: outstanding, due today, overdue, completed today. */
export function OverviewStats() {
  const { tasks } = useAppState();
  const s = taskStats(tasks);

  const stats: Stat[] = [
    { label: "Outstanding", value: s.outstanding, icon: ListTodo, iconClass: "text-accent-strong bg-accent-soft" },
    { label: "Due today", value: s.dueToday, icon: CalendarCheck, iconClass: "text-warning bg-warning/10" },
    { label: "Overdue", value: s.overdue, icon: AlertTriangle, iconClass: "text-danger bg-danger/10" },
    { label: "Completed today", value: s.completedToday, icon: CheckCircle2, iconClass: "text-success bg-success/10" },
  ];

  return (
    <section aria-label="Daily overview">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, iconClass }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-4">
            <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", iconClass)} aria-hidden="true">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <dt className="truncate text-xs text-subtle">{label}</dt>
              <dd className="text-xl font-semibold tabular-nums">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
