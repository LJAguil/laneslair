"use client";
import Link from "next/link";
import { useId } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { TaskList } from "@/components/tasks/task-list";
import { useAppState } from "@/lib/store/app-store";
import { isOpen, isOverdue, sortTasks } from "@/lib/selectors";
import { useDailyPreferences } from "./daily-preferences-provider";
export function TaskChoices({ kind, exclude }: { kind: "optional" | "priorities"; exclude?: string | null }) {
  const { tasks, tasksStatus } = useAppState();
  const prefs = useDailyPreferences(), id = useId();
  const ids = prefs.value[kind], max = kind === "optional" ? 2 : 3;
  const selected = tasks.filter(task => ids.includes(task.id) && task.id !== exclude);
  return <div className="space-y-3">
    <p className="text-xs text-subtle">Saved on this browser for this account. {prefs.durable ? "" : "Storage is unavailable; changes last for this session."}</p>
    {tasksStatus !== "ready" ? <TaskList tasks={[]} /> : <>
      <label className="block text-sm text-muted" htmlFor={id}>{kind === "optional" ? "Up to two optional tasks" : "Up to three priorities"}</label>
      <Select id={id} value="" disabled={!prefs.ready || ids.length >= max} onChange={event => { if (event.target.value) prefs.update({ [kind]: [...ids, event.target.value] }); }}>
        <option value="">{ids.length >= max ? "Remove a choice to add another" : "Choose a task…"}</option>
        {sortTasks(tasks.filter(task => isOpen(task) && task.id !== exclude && !ids.includes(task.id))).map(task => <option key={task.id} value={task.id}>{task.title}</option>)}
      </Select>
      <ul className="space-y-2">{ids.map(taskId => {
        const task = selected.find(task => task.id === taskId);
        return <li key={taskId} className="flex items-center gap-2"><span className="min-w-0 flex-1 break-words text-sm">{task?.title ?? (taskId === exclude ? "This task is now your focus" : "Task no longer available")}{task?.status === "done" && " · done"}</span><Button className="min-h-11" size="sm" disabled={!prefs.ready} onClick={() => prefs.update({ [kind]: ids.filter(value => value !== taskId) })}>Remove<span className="sr-only"> {task?.title ?? "choice"}</span></Button></li>;
      })}</ul>
      {selected.length > 0 && <details><summary className="cursor-pointer py-2 text-sm text-accent-strong">Work on these tasks</summary><TaskList tasks={selected} compact /></details>}
    </>}
  </div>;
}
export function DailyPlanning() {
  const { today, now, tasks, tasksStatus, focus, projects, projectsStatus } = useAppState();
  const count = tasks.filter(task => isOverdue(task, today, now)).length;
  return <Card><CardHeader title="A little room for more" description="Your focus comes first. These two are optional." />
    <TaskChoices kind="optional" exclude={focus?.date === today ? focus.taskId : null} />
    <div className="mt-4 flex flex-wrap gap-4 text-sm"><Link href="/tasks" className="text-accent-strong underline">{tasksStatus === "ready" ? `${count} overdue · Review tasks` : "Review tasks"}</Link><Link href="/review" className="text-accent-strong underline">Weekly review</Link></div>
    {projectsStatus === "ready" && projects.some(project => project.status === "active") && <details className="mt-3"><summary className="cursor-pointer py-2 text-sm text-muted">Active projects</summary><ul className="space-y-1">{projects.filter(project => project.status === "active").map(project => <li key={project.id}><Link href={`/projects/${project.id}`} className="inline-flex min-h-11 items-center text-sm text-accent-strong underline">{project.name}</Link></li>)}</ul></details>}
  </Card>;
}
