import { afterEach, describe, expect, it, vi } from "vitest";
import { taskDueTimestamp, formatTaskDue, timestampToLocalDateTime } from "./dates";
import { filterTasks, isOverdue, taskStats } from "./selectors";
import { taskNotifications } from "./task-notifications";
import type { Task } from "./types";

const today = "2026-11-11";
const deadline = taskDueTimestamp(today, "15:30")!;
const task: Task = { id: "invented", title: "Invented report", status: "todo", priority: "medium", createdAt: `${today}T09:00:00`, dueDate: today, dueTime: "15:30", dueAt: deadline };
const before = new Date(deadline).getTime() - 1;
const at = before + 1;
afterEach(() => vi.unstubAllEnvs());

describe("optional task deadlines and real task notifications", () => {
  it("changes overdue at the explicit deadline across all shared selectors", () => {
    expect(isOverdue(task, today, before)).toBe(false);
    expect(isOverdue(task, today, at)).toBe(true);
    expect(taskStats([task], today, at).overdue).toBe(1);
    expect(filterTasks([task], { status: "overdue", priority: "all", query: "" }, today, at)).toEqual([task]);
    expect(isOverdue({ ...task, status: "done" }, today, at)).toBe(false);
    expect(isOverdue({ ...task, status: "cancelled" }, today, at)).toBe(false);
  });
  it("keeps date-only tasks due through the end of their day, including old noon values", () => {
    const dateOnly = { ...task, dueTime: undefined, dueAt: undefined };
    expect(isOverdue(dateOnly, today, at)).toBe(false);
    expect(isOverdue(dateOnly, "2026-11-12", at)).toBe(true);
    expect(taskDueTimestamp()).toBeNull();
    expect(new Date(taskDueTimestamp(today)!).getHours()).toBe(12);
  });
  it("validates dates/times and supports midnight and noon explicitly", () => {
    expect(() => taskDueTimestamp(undefined, "12:00")).toThrow(/date/);
    expect(() => taskDueTimestamp("2026-02-30", "12:00")).toThrow(/date/);
    expect(() => taskDueTimestamp(today, "24:00")).toThrow(/time/);
    expect(timestampToLocalDateTime(taskDueTimestamp(today, "00:00")!).slice(11,16)).toBe("00:00");
    expect(formatTaskDue({ dueDate: today, dueTime: "12:00" }, today)).toBe("Today · 12 PM");
  });
  it("uses only real open due-today/overdue tasks and refreshes acknowledgment identity at deadline", () => {
    const tasks = [task, { ...task, id: "done", status: "done" as const }, { ...task, id: "future", dueDate: "2026-11-13", dueAt: undefined }, { ...task, id: "undated", dueDate: undefined, dueAt: undefined }];
    const early = taskNotifications(tasks, today, before);
    const late = taskNotifications(tasks, today, at);
    expect(early).toHaveLength(1);
    expect(early[0].title).toBe(task.title);
    expect(early[0].body).toContain("Due today");
    expect(late[0].body).toContain("Overdue");
    expect(late[0].id).not.toBe(early[0].id);
    expect(taskNotifications([{ ...task, status: "done" }], today, at)).toEqual([]);
  });
  it("rejects DST gaps and preserves absolute overdue checks across device zones", () => {
    vi.stubEnv("TZ", "America/Chicago");
    expect(() => taskDueTimestamp("2026-03-08", "02:30")).toThrow(/doesn't exist/);
    const fallBack = taskDueTimestamp("2026-11-01", "01:30")!;
    expect(fallBack).toBe("2026-11-01T06:30:00.000Z");
    const precise = taskDueTimestamp("2026-11-11", "15:30")!;
    vi.stubEnv("TZ", "America/Los_Angeles");
    const traveller = { ...task, dueAt: precise };
    expect(timestampToLocalDateTime(precise).slice(11,16)).toBe("13:30");
    expect(isOverdue(traveller, today, new Date(precise).getTime())).toBe(true);
  });
});
