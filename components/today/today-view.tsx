"use client";

import { ArrowRight, CheckCircle2, Inbox, ListChecks, Target } from "lucide-react";
import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { useShell } from "@/components/shell/shell-context";
import { CaptureForm } from "@/components/inbox/capture-form";
import { HabitsCard } from "@/components/dashboard/dashboard-cards";
import { TaskList } from "@/components/tasks/task-list";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { TaskDataError } from "@/lib/data/tasks";
import { formatLongDate } from "@/lib/dates";
import { isOpen, sortTasks } from "@/lib/selectors";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import { relevantTasks } from "@/lib/today";

export function TodayView() {
  const { today, tasks, focus } = useAppState();
  const { openNewTask } = useShell();
  const focusId = focus?.date === today ? focus.taskId : undefined;
  const upcoming = relevantTasks(tasks, today, focusId ?? undefined);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm text-subtle"><time dateTime={today}>{formatLongDate(today)}</time></p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Today in the Lair</h1>
          <p className="mt-2 text-sm text-muted">Clear your head. Choose your next move.</p></div>
        <Button onClick={openNewTask}>New task</Button>
      </div>
      <Card>
        <CardHeader title="Get it out of your head" description="Ideas don’t need a plan yet." icon={<Inbox className="h-5 w-5" />}
          action={<Link href="/inbox" className="text-sm text-accent-strong hover:underline">Inbox</Link>} />
        <CaptureForm />
      </Card>
      <FocusCard />
      <Card>
        <CardHeader title="On your radar" description="Overdue work, the next 7 days, and important undated tasks."
          icon={<ListChecks className="h-5 w-5" />} />
        <TaskList tasks={upcoming} compact emptyTitle="A little breathing room" emptyDescription="Nothing else urgent or due soon. You can choose any task as your focus." />
        <Link href="/tasks" className={buttonClasses("ghost", "sm", "mt-4 min-h-11")}>All tasks<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </Card>
      <HabitsCard />
      <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted">
        <Link href="/projects" className="hover:text-fg hover:underline">Your projects</Link>
        <Link href="/overview" className="hover:text-fg hover:underline">Activity & overview</Link>
        <Link href="/habits" className="hover:text-fg hover:underline">Habits & goals</Link>
      </div>
    </div>
  );
}

function FocusCard() {
  const { today, tasks, tasksStatus, focus, focusStatus, focusError } = useAppState();
  const { loadFocus } = useAppActions();
  const currentId = focus?.date === today ? focus.taskId : null;
  const task = tasks.find((t) => t.id === currentId);
  return (
    <Card className="border-accent/30">
      <CardHeader title="Your next move" description="One thing to give your attention to today." icon={<Target className="h-5 w-5" />} />
      {focusStatus === "loading" && <p role="status" className="text-sm text-muted">Loading today’s focus…</p>}
      {focusStatus === "error" && <div role="alert" className="space-y-3"><p className="text-sm text-danger">{focusError}</p><Button onClick={() => void loadFocus()}>Retry focus</Button></div>}
      {focusStatus === "ready" && <>
        {tasksStatus !== "ready" ? <TaskList tasks={[]} /> : <>
          {task && <>
            {task.status === "done" && <p className="mb-3 flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />You finished your focus. Keep it here or choose another.</p>}
            {task.status === "cancelled" && <p className="mb-3 text-sm text-muted">This task was cancelled. Choose a new focus when you’re ready.</p>}
            <TaskList tasks={[task]} compact />
          </>}
          {!task && <p className="text-sm text-muted">{currentId ? "That task is no longer available. Pick a fresh focus." : "Pick one task. The rest can wait their turn."}</p>}
          <FocusPicker key={`${today}/${currentId ?? "none"}`} currentId={currentId ?? ""} />
        </>}
      </>}
    </Card>
  );
}

function FocusPicker({ currentId }: { currentId: string }) {
  const { tasks, today, savingFocus } = useAppState();
  const { setFocus } = useAppActions();
  const [choice, setChoice] = useState(currentId);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const choices = sortTasks(tasks.filter((t) => isOpen(t) || t.id === currentId));
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try { await setFocus(choice || null, today); }
    catch (err) { setError(err instanceof TaskDataError ? err.message : "Couldn't save your focus. Please try again."); }
  }
  return (
    <form onSubmit={submit} className="mt-4 space-y-2" aria-busy={savingFocus}>
      <label htmlFor={id} className="text-sm text-muted">{currentId ? "Change today’s focus" : "Choose today’s focus"}</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select id={id} value={choice} onChange={(e) => setChoice(e.target.value)} disabled={savingFocus} className="min-w-0 flex-1">
          <option value="">No focus selected</option>
          {currentId && !tasks.some((t) => t.id === currentId) && <option value={currentId}>Unavailable task</option>}
          {choices.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </Select>
        <Button type="submit" variant="primary" disabled={savingFocus || choice === currentId}>{savingFocus ? "Saving…" : "Save focus"}</Button>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </form>
  );
}
