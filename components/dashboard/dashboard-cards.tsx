"use client";

// Dashboard widgets. Each reads from the store and reuses feature components.
import { ArrowRight, Compass, FolderKanban, ListChecks, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { EventRow } from "@/components/discover/event-row";
import { GoalProgress } from "@/components/habits/goal-progress";
import { HabitLoadState } from "@/components/habits/habit-load-state";
import { HabitRow } from "@/components/habits/habit-row";
import { ProjectLoadState } from "@/components/projects/project-load-state";
import { EmptyState } from "@/components/page-header";
import { ProjectCard } from "@/components/projects/project-card";
import { TaskList } from "@/components/tasks/task-list";
import { Card, CardHeader } from "@/components/ui/card";
import { isCheckedIn, priorityTasks, projectProgress, upcomingEvents } from "@/lib/selectors";
import { useAppState } from "@/lib/store/app-store";

function ViewAll({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1 rounded text-xs font-medium text-accent-strong hover:underline"
      aria-label={label}
    >
      View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

export function PriorityTasksCard() {
  const { tasks, today } = useAppState();
  const list = priorityTasks(tasks, today).slice(0, 7);
  return (
    <Card>
      <CardHeader
        title="Priority tasks"
        description="Overdue and due in the next 3 days"
        icon={<ListChecks className="h-[18px] w-[18px]" />}
        action={<ViewAll href="/tasks" label="View all tasks" />}
      />
      <TaskList tasks={list} compact emptyTitle="You're all caught up" emptyDescription="Nothing overdue or due in the next 3 days." />
    </Card>
  );
}

export function ProjectsCard() {
  const { projects, projectsStatus, tasks, tasksStatus } = useAppState();
  const active = projects.filter((p) => p.status === "active").slice(0, 4);
  return (
    <Card>
      <CardHeader
        title="Project progress"
        icon={<FolderKanban className="h-[18px] w-[18px]" />}
        action={<ViewAll href="/projects" label="View all projects" />}
      />
      <ProjectLoadState />
      {projectsStatus === "ready" && active.length === 0 && <EmptyState title="No active projects" description="Create or activate a project on the Projects page." />}
      {projectsStatus === "ready" && <div className="grid gap-3 sm:grid-cols-2">
        {active.map((p) => (
          <ProjectCard key={p.id} project={p} progress={projectProgress(p, tasks)} tasksStatus={tasksStatus} compact />
        ))}
      </div>}
    </Card>
  );
}

export function HabitsCard() {
  const { habits, habitsStatus, today } = useAppState();
  const active = habits.filter((h) => h.isActive);
  const done = active.filter((h) => isCheckedIn(h, today)).length;
  return (
    <Card>
      <CardHeader
        title="Habit check-ins"
        description={habitsStatus === "ready" ? `${done} of ${active.length} checked in today` : undefined}
        icon={<Target className="h-[18px] w-[18px]" />}
        action={<ViewAll href="/habits" label="View all habits" />}
      />
      <HabitLoadState />
      {habitsStatus === "ready" && active.length === 0 && <EmptyState title="Make room for a small routine" description="Add water tracking or your own habit on Habits & Goals." />}
      {habitsStatus === "ready" && <ul className="divide-y divide-line/70">
        {active.map((h) => (
          <HabitRow key={h.id} habit={h} />
        ))}
      </ul>}
    </Card>
  );
}

export function GoalsCard() {
  const { goals } = useAppState();
  return (
    <Card>
      <CardHeader
        title="Goals"
        icon={<Trophy className="h-[18px] w-[18px]" />}
        action={<ViewAll href="/habits#goals" label="View all goals" />}
      />
      <div className="space-y-5">
        {goals.map((g) => (
          <GoalProgress key={g.id} goal={g} />
        ))}
      </div>
    </Card>
  );
}

export function EventsCard() {
  const { events, today } = useAppState();
  const list = upcomingEvents(events, today).slice(0, 4);
  return (
    <Card>
      <CardHeader
        title="Upcoming local events"
        icon={<Compass className="h-[18px] w-[18px]" />}
        action={<ViewAll href="/discover" label="Discover more events" />}
      />
      <ul className="divide-y divide-line/70">
        {list.map((e) => (
          <EventRow key={e.id} event={e} />
        ))}
      </ul>
    </Card>
  );
}
