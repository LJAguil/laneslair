import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ state: {} as Record<string, unknown>, loadTasks: vi.fn() }));
vi.mock("@/lib/store/app-store", () => ({ useAppState: () => fake.state, useAppActions: () => ({ loadTasks: fake.loadTasks }) }));
vi.mock("@/components/reminders/use-reminder-draft", () => ({ useReminderDraft: () => ({ value: { enabled: false }, preferences: {}, status: "ready" }) }));
vi.mock("@/components/reminders/reminder-fields", () => ({ ReminderFields: () => null }));
vi.mock("@/components/reminders/reminder-button", () => ({ ReminderButton: () => null }));
// Expand the popover for simulated markup assertions; not a browser interaction test.
vi.mock("@/components/ui/popover", () => ({ Popover: ({ trigger, children }: { trigger: ReactNode; children: (close: () => void) => ReactNode }) => createElement("div", null, trigger, children(() => {})) }));
import { NotificationCenter } from "@/components/shell/notification-center";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskRow } from "@/components/tasks/task-list";
import { taskDueTimestamp } from "./dates";
import type { Task } from "./types";
const today = "2026-11-11";
const task: Task = { id: "invented", title: "Invented task title", priority: "medium", status: "todo", createdAt: `${today}T09:00:00`, dueDate: today, dueTime: "12:00", dueAt: taskDueTimestamp(today, "12:00")! };
beforeEach(() => { fake.state = { today, now: new Date(task.dueAt!).getTime(), tasks: [task], tasksStatus: "ready", projects: [], projectsStatus: "ready" }; });
describe("deadline controls and bell (simulated markup only)", () => {
  it("offers an optional native time input and preserves the keyboard actions", () => {
    const html = renderToStaticMarkup(createElement(TaskFormDialog, { open: true, task, onClose: () => {} }));
    expect(html).toContain("Due time (optional)");
    expect(html).toContain('type="time"');
    expect(html).toContain('value="12:00"');
    expect(html).toContain("Clear time");
    expect(html).toContain("task-form-actions");
    expect(html).toContain("Done typing");
    expect(html).toContain("push reminders are set separately");
  });
  it("renders real task titles and explicit loading/error/empty states without sample activity", () => {
    const render = () => renderToStaticMarkup(createElement(NotificationCenter));
    expect(render()).toContain(task.title);
    expect(render()).toContain("Overdue");
    expect(render()).not.toContain("Sample activity");
    fake.state.tasksStatus = "loading";
    expect(render()).toContain("Loading your tasks");
    expect(render()).not.toContain(task.title);
    fake.state.tasksStatus = "error";
    expect(render()).toContain("Retry tasks");
    fake.state.tasksStatus = "ready"; fake.state.tasks = [];
    expect(render()).toContain("No tasks due today or overdue");
  });
  it("labels an overdue same-day task explicitly and displays its chosen time", () => {
    const html = renderToStaticMarkup(createElement(TaskRow, { task, today, now: new Date(task.dueAt!).getTime(), onToggle: () => {} }));
    expect(html).toContain("Today · 12 PM");
    expect(html).toContain("· Overdue");
    expect(html).toContain("text-danger");
  });
});
