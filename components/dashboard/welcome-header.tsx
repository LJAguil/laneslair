"use client";

import { Plus } from "lucide-react";
import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/button";
import { formatLongDate } from "@/lib/dates";
import { taskStats } from "@/lib/selectors";
import { useAppState } from "@/lib/store/app-store";
import { pluralize } from "@/lib/utils";

export function WelcomeHeader() {
  const { profile, tasks, tasksStatus, today, now } = useAppState();
  const { openNewTask } = useShell();
  const stats = taskStats(tasks, today, now);

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm text-subtle">
          <time dateTime={today}>{formatLongDate(today)}</time>
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Welcome back, {profile.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {tasksStatus === "loading" && "Loading your tasks…"}
          {tasksStatus === "error" && "Your tasks couldn't be loaded right now."}
          {tasksStatus === "ready" && (
            <>
              You have {pluralize(stats.dueToday, "task")} due today
              {stats.overdue > 0 && ` and ${stats.overdue} overdue`}.
            </>
          )}
        </p>
      </div>
      <Button variant="primary" onClick={openNewTask} className="h-11 px-5 sm:self-auto">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Quick add task
      </Button>
    </div>
  );
}
