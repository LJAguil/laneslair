import { addDays } from "./dates";
import { isOpen, isOverdue, sortTasks } from "./selectors";
import { captureIsUnsorted } from "./journal";
import type { Habit, InboxNote, JournalSource, Project, Task } from "./types";
export function dailyReview(tasks: Task[], today: string, focusId?: string | null) {
  return { completed: tasks.filter(task => task.status === "done" && task.completedAt?.slice(0, 10) === today),
    focus: tasks.find(task => task.id === focusId), open: tasks.filter(isOpen) };
}
export function weeklyReview(tasks: Task[], projects: Project[], habits: Habit[], notes: InboxNote[], sources: JournalSource[], today: string, now: number) {
  const from = addDays(today, -6), previous = addDays(from, -7);
  const completed = tasks.filter(task => task.status === "done" && task.completedAt && task.completedAt.slice(0, 10) >= from && task.completedAt.slice(0, 10) <= today);
  const open = sortTasks(tasks.filter(isOpen));
  return { from, completed, open, overdue: open.filter(task => isOverdue(task, today, now)),
    captures: notes.filter(note => captureIsUnsorted(note, sources)),
    revisit: projects.filter(project => project.status === "active" && (!open.some(task => task.projectId === project.id) || !completed.some(task => task.projectId === project.id))),
    habits: habits.filter(habit => habit.isActive).map(habit => ({ id: habit.id, name: habit.name,
      current: Object.entries(habit.days).filter(([date, day]) => date >= from && date <= today && day.amount >= day.target).length,
      previous: Object.entries(habit.days).filter(([date, day]) => date >= previous && date < from && day.amount >= day.target).length,
      recorded: Object.keys(habit.days).filter(date => date >= from && date <= today).length })) };
}
