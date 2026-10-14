// Pure business logic. No React, no UI — easy to unit test and reuse
// whether data comes from sample files or a database.
import { addDays, daysBetween, lastNDays, parseISODate, PROTOTYPE_TODAY } from "./dates";
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

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export const isDone = (task: Task) => task.status === "done";

export function isOverdue(task: Task, today: ISODate = PROTOTYPE_TODAY): boolean {
  return !isDone(task) && !!task.dueDate && daysBetween(today, task.dueDate) < 0;
}

/** Open tasks first, then by priority, then by due date (no due date last). */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (isDone(a) !== isDone(b)) return isDone(a) ? 1 : -1;
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

export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  const q = filters.query.trim().toLowerCase();
  return tasks.filter((t) => {
    if (filters.priority !== "all" && t.priority !== filters.priority) return false;
    if (filters.status === "overdue" && !isOverdue(t)) return false;
    if (filters.status !== "all" && filters.status !== "overdue" && t.status !== filters.status) return false;
    if (q && !t.title.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function taskStats(tasks: Task[], today: ISODate = PROTOTYPE_TODAY) {
  const open = tasks.filter((t) => !isDone(t));
  return {
    outstanding: open.length,
    dueToday: open.filter((t) => t.dueDate === today).length,
    overdue: open.filter((t) => isOverdue(t, today)).length,
    completedToday: tasks.filter((t) => t.completedAt?.startsWith(today)).length,
  };
}

/** Tasks that matter today: overdue or due within `withinDays`, sorted by importance. */
export function priorityTasks(tasks: Task[], withinDays = 3, today: ISODate = PROTOTYPE_TODAY): Task[] {
  return sortTasks(
    tasks.filter((t) => {
      if (isDone(t)) return !!t.completedAt?.startsWith(today);
      return !!t.dueDate && daysBetween(today, t.dueDate) <= withinDays;
    }),
  );
}

export function projectProgress(project: Project, tasks: Task[]) {
  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const done = projectTasks.filter(isDone).length;
  const total = projectTasks.length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

function countsForStreak(habit: Habit, date: ISODate): boolean {
  if (habit.frequency !== "weekdays") return true;
  const day = parseISODate(date).getDay();
  return day !== 0 && day !== 6;
}

/**
 * Consecutive check-ins ending today. If today isn't checked in yet, the streak
 * is counted from yesterday so it doesn't look "broken" before the day is over.
 */
export function habitStreak(habit: Habit, today: ISODate = PROTOTYPE_TODAY): number {
  const checked = new Set(habit.checkIns);
  let cursor = checked.has(today) ? today : addDays(today, -1);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    if (countsForStreak(habit, cursor)) {
      if (!checked.has(cursor)) break;
      streak++;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export const isCheckedIn = (habit: Habit, date: ISODate = PROTOTYPE_TODAY) =>
  habit.checkIns.includes(date);

export function goalPercent(goal: Goal): number {
  return Math.min(100, Math.round((goal.current / goal.target) * 100));
}

export interface ActivityDay {
  date: ISODate;
  tasksCompleted: number;
  habitCheckIns: number;
}

export function weeklyActivity(tasks: Task[], habits: Habit[], today: ISODate = PROTOTYPE_TODAY): ActivityDay[] {
  return lastNDays(7, today).map((date) => ({
    date,
    tasksCompleted: tasks.filter((t) => t.completedAt?.startsWith(date)).length,
    habitCheckIns: habits.filter((h) => h.checkIns.includes(date)).length,
  }));
}

export function upcomingEvents(events: LocalEvent[], today: ISODate = PROTOTYPE_TODAY): LocalEvent[] {
  return events
    .filter((e) => daysBetween(today, e.startsAt.slice(0, 10)) >= 0)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
