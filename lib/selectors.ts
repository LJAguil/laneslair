// Pure business logic. No React, no UI — easy to unit test and reuse
// whether data comes from sample files or a database.
import { daysBetween, lastNDays } from "./dates";
import type {
  Goal,
  Habit,
  ISODate,
  LocalEvent,
  Priority,
  Project,
  Task,
  TaskStatus,
} from "./types";

const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export const isDone = (task: Task) => task.status === "done";
/** Still needs doing: not done and not cancelled. */
export const isOpen = (task: Task) => task.status === "todo" || task.status === "in_progress";

export function isOverdue(task: Task, today: ISODate): boolean {
  return isOpen(task) && !!task.dueDate && daysBetween(today, task.dueDate) < 0;
}

/** Open tasks first, then by priority, then by due date (no due date last). */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (isOpen(a) !== isOpen(b)) return isOpen(a) ? -1 : 1;
    const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (p !== 0) return p;
    return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
  });
}

export type StatusFilter = "all" | TaskStatus | "overdue";
export type PriorityFilter = "all" | Priority;

export interface TaskFilters {
  status: StatusFilter;
  priority: PriorityFilter;
  query: string;
}

export function filterTasks(tasks: Task[], filters: TaskFilters, today: ISODate): Task[] {
  const q = filters.query.trim().toLowerCase();
  return tasks.filter((t) => {
    if (filters.priority !== "all" && t.priority !== filters.priority) return false;
    if (filters.status === "overdue" && !isOverdue(t, today)) return false;
    if (filters.status !== "all" && filters.status !== "overdue" && t.status !== filters.status) return false;
    if (q && !t.title.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function taskStats(tasks: Task[], today: ISODate) {
  const open = tasks.filter(isOpen);
  return {
    outstanding: open.length,
    dueToday: open.filter((t) => t.dueDate === today).length,
    overdue: open.filter((t) => isOverdue(t, today)).length,
    completedToday: tasks.filter((t) => isDone(t) && t.completedAt?.startsWith(today)).length,
  };
}

/** Tasks that matter today: overdue or due within `withinDays`, plus ones finished today. */
export function priorityTasks(tasks: Task[], today: ISODate, withinDays = 3): Task[] {
  return sortTasks(
    tasks.filter((t) => {
      if (isDone(t)) return !!t.completedAt?.startsWith(today);
      if (!isOpen(t)) return false;
      return !!t.dueDate && daysBetween(today, t.dueDate) <= withinDays;
    }),
  );
}

export function projectProgress(project: Project, tasks: Task[]) {
  const projectTasks = tasks.filter((t) => t.projectId === project.id && t.status !== "cancelled");
  const done = projectTasks.filter(isDone).length;
  const total = projectTasks.length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export { habitStreakValue as habitStreak } from "./habits";

export const isCheckedIn = (habit: Habit, date: ISODate) =>
  habit.checkIns.includes(date);

export function goalPercent(goal: Goal): number {
  return Math.min(100, Math.round((goal.current / goal.target) * 100));
}

export interface ActivityDay {
  date: ISODate;
  tasksCompleted: number;
  habitCheckIns: number;
}

export function weeklyActivity(tasks: Task[], habits: Habit[], today: ISODate): ActivityDay[] {
  return lastNDays(7, today).map((date) => ({
    date,
    tasksCompleted: tasks.filter((t) => isDone(t) && t.completedAt?.startsWith(date)).length,
    habitCheckIns: habits.filter((h) => h.checkIns.includes(date)).length,
  }));
}

export function upcomingEvents(events: LocalEvent[], today: ISODate): LocalEvent[] {
  return events
    .filter((e) => daysBetween(today, e.startsAt.slice(0, 10)) >= 0)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
