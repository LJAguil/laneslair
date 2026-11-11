import { formatTaskDue } from "./dates";
import { isOpen, isOverdue } from "./selectors";
import type { Task } from "./types";

/** Live attention list, not a history or proof of push delivery. */
export function taskNotifications(tasks: Task[], today: string, now: number) {
  return tasks.filter(task => isOpen(task) && (task.dueDate === today || isOverdue(task, today, now)))
    .sort((a, b) => Number(isOverdue(b, today, now)) - Number(isOverdue(a, today, now)) ||
      `${a.dueDate}T${a.dueTime ?? "23:59"}`.localeCompare(`${b.dueDate}T${b.dueTime ?? "23:59"}`) || a.id.localeCompare(b.id))
    .map(task => {
      const overdue = isOverdue(task, today, now);
      return {
        id: `${task.id}/${task.dueAt ?? task.dueDate}/${overdue ? "overdue" : "today"}`,
        taskId: task.id,
        title: task.title,
        body: `${overdue ? "Overdue" : "Due today"} · ${formatTaskDue(task, today)}`,
      };
    });
}
