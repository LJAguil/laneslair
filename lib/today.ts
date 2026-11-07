import { addDays } from "./dates";
import { isOpen, isOverdue, sortTasks } from "./selectors";
import type { Task } from "./types";

/** Near deadlines plus important undated work, with overdue tasks first. */
export function relevantTasks(tasks: Task[], today: string, excludeId?: string): Task[] {
  const end = addDays(today, 7);
  return sortTasks(tasks.filter((t) => isOpen(t) && t.id !== excludeId && (
    t.dueDate ? t.dueDate <= end : t.priority === "urgent" || t.priority === "high"
  ))).sort((a, b) => {
    const overdue = Number(isOverdue(b, today)) - Number(isOverdue(a, today));
    if (overdue) return overdue;
    return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
  }).slice(0, 5);
}
