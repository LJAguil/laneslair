"use client";

import { Plus } from "lucide-react";
import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/button";
import { formatLongDate, PROTOTYPE_TODAY } from "@/lib/dates";
import { taskStats } from "@/lib/selectors";
import { useAppState } from "@/lib/store/app-store";
import { pluralize } from "@/lib/utils";

export function WelcomeHeader() {
  const { profile, tasks } = useAppState();
  const { openQuickAdd } = useShell();
  const stats = taskStats(tasks);

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm text-subtle">
          <time dateTime={PROTOTYPE_TODAY}>{formatLongDate(PROTOTYPE_TODAY)}</time>
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Welcome back, {profile.name}</h1>
        <p className="mt-1 text-sm text-muted">
          You have {pluralize(stats.dueToday, "task")} due today
          {stats.overdue > 0 && ` and ${stats.overdue} overdue`}.
        </p>
      </div>
      <Button variant="primary" onClick={openQuickAdd} className="h-11 px-5 sm:self-auto">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Quick add task
      </Button>
    </div>
  );
}
