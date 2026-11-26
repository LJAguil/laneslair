"use client";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { TaskList } from "@/components/tasks/task-list";
import { useAppState } from "@/lib/store/app-store";
import { dailyReview } from "@/lib/daily-review";
import { isOpen } from "@/lib/selectors";
export function EveningWrap() {
  const { tasks, today, tasksStatus, focus, focusStatus } = useAppState();
  const review = dailyReview(tasks, today, focus?.date === today ? focus.taskId : null);
  return <Card><CardHeader title="Close out the day" description="A moment to notice what moved. No streak to maintain." />
    {tasksStatus !== "ready" ? <TaskList tasks={[]} /> : <div className="space-y-3">
      <p className="text-sm text-muted">{review.completed.length} {review.completed.length === 1 ? "task completed" : "tasks completed"} today.</p>
      {review.completed.length > 0 && <details><summary className="cursor-pointer py-2 text-sm text-accent-strong">See completed work</summary><TaskList tasks={review.completed} compact /></details>}
      {focusStatus === "ready" && review.focus && <p className="break-words text-sm">{isOpen(review.focus) ? "Still on your mind" : review.focus.status === "done" ? "Focus finished" : "Focus cancelled"}: {review.focus.title}</p>}
      {focusStatus !== "ready" && <p className="text-xs text-muted">Today’s focus is unavailable until it loads successfully.</p>}
      {review.focus && isOpen(review.focus) && <TaskList tasks={[review.focus]} compact />}
      <p className="text-xs text-muted">Unfinished work can wait. Move its date if that helps; nothing rolls over automatically.</p>
    </div>}
    <Link href={`/journal?date=${today}`} className="mt-3 inline-flex min-h-11 items-center text-sm text-accent-strong underline">Reflect in Journal</Link>
  </Card>;
}
