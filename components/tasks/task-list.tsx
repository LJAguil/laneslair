"use client";

import { AlertTriangle, CalendarClock, Loader2, Pencil, RotateCw, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { EmptyState } from "@/components/page-header";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { formatTaskDue } from "@/lib/dates";
import { isDone, isOpen, isOverdue } from "@/lib/selectors";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import type { ISODate, Project, Task } from "@/lib/types";
import { accentClasses, cn } from "@/lib/utils";
import { TaskFormDialog } from "./task-form-dialog";
import { ReminderButton } from "@/components/reminders/reminder-button";

interface TaskListProps {
  tasks: Task[];
  /** Compact rows hide notes (used on the dashboard). */
  compact?: boolean;
  /** Show a delete button on each row (Tasks page). */
  allowDelete?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

/**
 * Renders tasks from the store, with distinct loading, error and empty states,
 * so a failed request is never mistaken for "no tasks".
 */
export function TaskList({ tasks, compact, allowDelete, emptyTitle = "Nothing here", emptyDescription }: TaskListProps) {
  const { projects, tasksStatus, tasksError, pendingTaskIds, today, now } = useAppState();
  const { toggleTask, deleteTask, loadTasks } = useAppActions();
  const [confirming, setConfirming] = useState<Task | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const projectById = new Map(projects.map((p) => [p.id, p]));

  if (tasksStatus === "loading") return <TaskListSkeleton rows={compact ? 3 : 5} />;
  if (tasksStatus === "error") {
    return <TaskLoadError message={tasksError ?? "Couldn't load your tasks."} onRetry={() => loadTasks()} />;
  }
  if (tasks.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  const deletingPending = confirming ? pendingTaskIds.includes(confirming.id) : false;

  return (
    <>
      <ul className="divide-y divide-line/70">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            today={today}
            now={now}
            project={task.projectId ? projectById.get(task.projectId) : undefined}
            compact={compact}
            pending={pendingTaskIds.includes(task.id)}
            onToggle={() => toggleTask(task)}
            onEdit={() => setEditing(task)}
            onDelete={allowDelete ? () => setConfirming(task) : undefined}
          />
        ))}
      </ul>

      <TaskFormDialog open={!!editing} task={editing} onClose={() => setEditing(null)} />

      <Dialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        dismissible={!deletingPending}
        title="Delete task?"
        description={confirming ? `“${confirming.title}” will be permanently deleted.` : undefined}
        className="max-w-sm"
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(null)} disabled={deletingPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={deletingPending}
            onClick={async () => {
              if (!confirming) return;
              // Close only once the database confirms; on failure a toast explains and the task stays.
              const ok = await deleteTask(confirming);
              if (ok) setConfirming(null);
            }}
          >
            {deletingPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Delete
          </Button>
        </div>
      </Dialog>
    </>
  );
}

interface TaskRowProps {
  task: Task;
  today: ISODate;
  now?: number;
  project?: Project;
  compact?: boolean;
  pending?: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function TaskRow({ task, today, now, project, compact, pending, onToggle, onEdit, onDelete }: TaskRowProps) {
  const done = isDone(task);
  const cancelled = task.status === "cancelled";
  const overdue = isOverdue(task, today, now);

  return (
    <li className="group grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0 sm:flex sm:gap-3" aria-busy={pending || undefined}>
      <CheckCircle
        checked={done}
        onChange={onToggle}
        disabled={pending}
        label={`Mark “${task.title}” ${done ? "not complete" : "complete"}`}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm transition-colors", isOpen(task) ? "text-fg" : "text-subtle line-through")}>{task.title}</p>
        {!compact && task.notes && <p className="mt-0.5 text-sm text-subtle">{task.notes}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
          {task.dueDate && (
            <span className={cn("inline-flex items-center gap-1", overdue ? "text-danger" : isOpen(task) && task.dueDate === today && "text-warning")}>
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Due </span>
              {formatTaskDue(task, today)}{overdue && task.dueAt ? " · Overdue" : ""}
            </span>
          )}
          {project && (
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", accentClasses[project.color].dot)} aria-hidden="true" />
              {project.name}
            </span>
          )}
          {pending && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              Saving…
            </span>
          )}
        </div>
      </div>
      <div className="col-start-2 flex flex-wrap items-center justify-end gap-1 sm:contents">
      {cancelled ? <Badge>Cancelled</Badge> : !done && <PriorityBadge priority={task.priority} />}
      <ReminderButton kind="task" id={task.id} name={task.title} disabled={pending} />
      {onEdit && (
        <RowAction label={`Edit “${task.title}”`} onClick={onEdit} disabled={pending}>
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        </RowAction>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          aria-label={`Delete “${task.title}”`}
          className="-my-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-subtle opacity-60 transition hover:bg-danger/10 hover:text-danger hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-30 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
      </div>
    </li>
  );
}

function TaskListSkeleton({ rows }: { rows: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading your tasks…</span>
      <ul className="divide-y divide-line/70" aria-hidden="true">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span className="h-5 w-5 shrink-0 animate-pulse rounded-full bg-raised" />
            <div className="flex-1 space-y-2">
              <span className="block h-3.5 animate-pulse rounded bg-raised" style={{ width: `${70 - i * 8}%` }} />
              <span className="block h-2.5 w-24 animate-pulse rounded bg-raised/70" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TaskLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 px-6 py-8 text-center">
      <AlertTriangle className="h-5 w-5 text-danger" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-fg">Your tasks didn&apos;t load</p>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>
      <Button size="sm" onClick={onRetry}>
        <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}

function RowAction({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="-my-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-subtle opacity-60 transition hover:bg-hover hover:text-fg hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-30 group-hover:opacity-100"
    >
      {children}
    </button>
  );
}
