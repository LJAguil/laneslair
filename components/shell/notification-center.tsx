"use client";

import { Bell, Clock } from "lucide-react";
import { useState } from "react";
import { Popover } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import { taskNotifications } from "@/lib/task-notifications";
import { cn } from "@/lib/utils";

export function NotificationCenter() {
  const { tasks, tasksStatus, tasksError, today, now } = useAppState();
  const { loadTasks } = useAppActions();
  // Session-only acknowledgments; no task text in browser storage.
  const [read, setRead] = useState<Set<string>>(() => new Set());
  const [editingId, setEditingId] = useState<string>();
  const notifications = tasksStatus === "ready" ? taskNotifications(tasks, today, now) : [];
  const unread = notifications.filter(n => !read.has(n.id)).length;
  const editing = tasks.find(task => task.id === editingId);

  return <>
    <Popover label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      trigger={<><Bell className="h-[18px] w-[18px]" aria-hidden="true" />{unread > 0 && <span aria-hidden="true" className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent">{unread}</span>}</>}
      triggerClassName="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-fg">
      {close => <div>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">Notifications</h2>
          <Button size="sm" variant="ghost" disabled={!unread} onClick={() => setRead(previous => new Set([...previous, ...notifications.map(n => n.id)]))}>Mark all read</Button>
        </div>
        <p className="px-4 pt-3 text-xs text-subtle">Your due-today and overdue tasks. Read marks last for this app session. Push reminders are separate.</p>
        {tasksStatus === "loading" && <p role="status" className="p-4 text-sm text-muted">Loading your tasks…</p>}
        {tasksStatus === "error" && <div role="alert" className="space-y-2 p-4"><p className="text-sm text-danger">{tasksError ?? "Couldn't load your tasks."}</p><Button onClick={() => void loadTasks()}>Retry tasks</Button></div>}
        {tasksStatus === "ready" && !notifications.length && <p className="p-4 text-sm text-muted">No tasks due today or overdue.</p>}
        <ul className="max-h-96 overflow-y-auto py-1">{notifications.map(n => <li key={n.id}>
          <button type="button" className="flex min-h-11 w-full gap-3 px-4 py-3 text-left hover:bg-hover" onClick={() => {
            setRead(previous => new Set([...previous, n.id])); setEditingId(n.taskId); close();
          }}>
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent-strong" aria-hidden="true" />
            <span className="min-w-0 flex-1"><span className={cn("block break-words text-sm", read.has(n.id) ? "text-muted" : "font-medium text-fg")}>{n.title}</span>
              <span className="block text-xs text-subtle">{n.body}</span>{!read.has(n.id) && <span className="sr-only">Unread</span>}
            </span>
          </button>
        </li>)}</ul>
      </div>}
    </Popover>
    <TaskFormDialog open={!!editing} task={editing} onClose={() => setEditingId(undefined)} />
  </>;
}
