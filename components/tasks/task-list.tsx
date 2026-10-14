"use client";

import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/page-header";
import { PriorityBadge } from "@/components/ui/badge";
import { CheckCircle } from "@/components/ui/checkbox";
import { formatDueLabel, PROTOTYPE_TODAY } from "@/lib/dates";
import { isDone, isOverdue } from "@/lib/selectors";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import type { Project, Task } from "@/lib/types";
import { accentClasses, cn } from "@/lib/utils";

interface TaskListProps {
  tasks: Task[];
  /** Compact rows hide notes (used on the dashboard). */
  compact?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function TaskList({ tasks, compact, emptyTitle = "Nothing here", emptyDescription }: TaskListProps) {
  const { projects } = useAppState();
  const { toggleTask } = useAppActions();
  const projectById = new Map(projects.map((p) => [p.id, p]));

  if (tasks.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  return (
    <ul className="divide-y divide-line/70">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          project={task.projectId ? projectById.get(task.projectId) : undefined}
          compact={compact}
          onToggle={() => toggleTask(task.id)}
        />
      ))}
    </ul>
  );
}

interface TaskRowProps {
  task: Task;
  project?: Project;
  compact?: boolean;
  onToggle: () => void;
}

export function TaskRow({ task, project, compact, onToggle }: TaskRowProps) {
  const done = isDone(task);
  const overdue = isOverdue(task);

  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <CheckCircle
        checked={done}
        onChange={onToggle}
        label={`Mark “${task.title}” ${done ? "not complete" : "complete"}`}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm transition-colors", done ? "text-subtle line-through" : "text-fg")}>{task.title}</p>
        {!compact && task.notes && <p className="mt-0.5 text-sm text-subtle">{task.notes}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
          {task.dueDate && (
            <span className={cn("inline-flex items-center gap-1", overdue && "text-danger", !done && task.dueDate === PROTOTYPE_TODAY && "text-warning")}>
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Due </span>
              {formatDueLabel(task.dueDate)}
            </span>
          )}
          {project && (
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", accentClasses[project.color].dot)} aria-hidden="true" />
              {project.name}
            </span>
          )}
        </div>
      </div>
      {!done && <PriorityBadge priority={task.priority} />}
    </li>
  );
}
