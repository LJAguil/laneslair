"use client";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { TaskList } from "@/components/tasks/task-list";
import { TaskChoices } from "@/components/today/daily-planning";
import { useDailyPreferences } from "@/components/today/daily-preferences-provider";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import { weeklyReview } from "@/lib/daily-review";
import { addDays, formatShortDate } from "@/lib/dates";
import { weekStart } from "@/lib/habits";
export function WeeklyReviewView() {
  const state = useAppState(), actions = useAppActions(), prefs = useDailyPreferences();
  const review = weeklyReview(state.tasks, state.projects, state.habits, state.inboxNotes, state.journalSources, state.today, state.now);
  const next = addDays(weekStart(state.today), 7);
  return <div className="mx-auto max-w-4xl space-y-5"><PageHeader title="Weekly review" description={`The last seven days: ${formatShortDate(review.from)}–${formatShortDate(state.today)}. Keep what matters; leave the rest.`} />
    <Card><CardHeader title="Unfinished work" description="Move a date, finish a task, or leave it for later." />
      {state.tasksStatus === "ready" && <p className="mb-3 text-sm text-muted">{review.completed.length} currently done tasks completed in this period · {review.open.length} open · {review.overdue.length} overdue</p>}
      <TaskList tasks={review.open.slice(0, 12)} compact emptyTitle="No unfinished tasks" emptyDescription="There’s room for what comes next." />
      <Link href="/tasks" className="mt-3 inline-flex min-h-11 items-center text-sm text-accent-strong underline">Review all tasks</Link>
    </Card>
    <Card><CardHeader title="Projects to revisit" description="Active projects without an open next action, or without a task completed in the last seven days. This isn’t a full activity history." />
      {state.projectsStatus !== "ready" || state.tasksStatus !== "ready" ? <div role="status" className="space-y-2 text-sm text-muted"><p>Projects and tasks must load successfully for this review.</p><Button onClick={() => { void actions.loadProjects(); void actions.loadTasks(); }}>Reload projects and tasks</Button></div> : review.revisit.length ? <ul>{review.revisit.map(project => <li key={project.id}><Link className="inline-flex min-h-11 items-center break-words text-sm text-accent-strong underline" href={`/projects/${project.id}`}>{project.name}</Link></li>)}</ul> : <p className="text-sm text-muted">No active projects meet these review criteria.</p>}
    </Card>
    <Card><CardHeader title="Clear a little Inbox space" description="Your original captures stay in Inbox until you choose what to do with them." />
      {state.inboxStatus !== "ready" || state.journalIndexStatus !== "ready" ? <p className="text-sm text-muted">Inbox links are unavailable until Inbox and journal links load successfully.</p> : <p className="text-sm text-muted">{review.captures.length} unsorted {review.captures.length === 1 ? "capture" : "captures"}.</p>}
      <Link href="/inbox" className="inline-flex min-h-11 items-center text-sm text-accent-strong underline">Sort captures in Inbox</Link>
    </Card>
    <Card><CardHeader title="Habit trends" description="Days reaching the saved daily target, compared with the previous seven days. Missing records aren’t assumed to be failures; this is not a weekly schedule score." />
      {state.habitsStatus !== "ready" ? <div className="space-y-2"><p role="status" className="text-sm text-muted">Habits haven’t loaded successfully.</p><Button onClick={() => void actions.loadHabits()}>Reload habits</Button></div> : review.habits.length ? <ul className="divide-y divide-line">{review.habits.map(habit => <li key={habit.id} className="py-3 text-sm"><span className="font-medium">{habit.name}</span><p className="mt-1 text-xs text-muted">{habit.current} target days · {habit.previous} in the previous period · {habit.recorded} days recorded this period</p></li>)}</ul> : <p className="text-sm text-muted">No active habits yet.</p>}
      <Link href="/habits" className="inline-flex min-h-11 items-center text-sm text-accent-strong underline">Habits and corrections</Link>
    </Card>
    <Card><CardHeader title={`Priorities for the week of ${formatShortDate(prefs.value.week)}`} description="Choose up to three existing tasks. Their deadlines don’t change." />
      <TaskChoices kind="priorities" />
      {prefs.value.week !== next && <Button className="mt-3 min-h-11" disabled={!prefs.ready} onClick={() => prefs.update({ week: next, priorities: [] })}>Start next week’s plan</Button>}
    </Card>
    <Link href="/" className="inline-flex min-h-11 items-center text-sm text-accent-strong underline">Back to Today</Link>
  </div>;
}
