import { describe, expect, it, vi } from "vitest";
import { createDailyPreferences, defaultPreferences, parsePreferences } from "./daily-preferences";
import { dailyReview, weeklyReview } from "./daily-review";
import { exportColumns, exportDocument } from "./data-export";
import { undoAction } from "./undo";
import { reminderControlPatch } from "./push/reminder-controls";
import type { Habit, Project, Task } from "./types";
const today = "2026-11-26";
const task: Task = { id: "invented-task", title: "Invented task", status: "todo", priority: "high", createdAt: today, projectId: "invented-project" };
describe("daily preference boundaries", () => {
  it("bounds choices and ignores unknown fields, invalid IDs, old dates and stale weeks", () => {
    const parsed = parsePreferences({ day: today, optional: ["a", "a", "b", "c", "private text"], week: "2026-11-30", priorities: ["a", "b", "c", "d"], hidden: ["play", "focus", "anything"], shortcuts: ["water", "unknown"], writing: "Invented private text" }, today);
    expect(parsed).toMatchObject({ optional: ["a", "b"], priorities: ["a", "b", "c"], hidden: ["play"], shortcuts: ["water"] });
    expect(JSON.stringify(parsed)).not.toContain("private");
    expect(parsePreferences(parsed, "2026-11-27").optional).toEqual([]);
    expect(parsePreferences(parsed, "2026-11-30").priorities).toEqual(["a", "b", "c"]);
    expect(parsePreferences(parsed, "2026-12-07").priorities).toEqual([]);
  });
  it("handles blocked storage and malformed values without losing the session choice", () => {
    const store = createDailyPreferences(today, "invented", () => { throw new Error("blocked"); }, () => true);
    store.load(); store.update({ optional: ["a"] });
    expect(store.getSnapshot()).toMatchObject({ ready: true, durable: false, value: { optional: ["a"] } });
    expect(parsePreferences(null, today)).toEqual(defaultPreferences(today));
  });
  it("loads only its account key and refuses stale handlers after identity changes", () => {
    let active = true;
    const memory = new Map<string, string>(), storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: vi.fn((key: string, value: string) => { memory.set(key, value); }) };
    const a = createDailyPreferences(today, "account-a", () => storage, () => active);
    a.load(); a.update({ optional: ["invented"] }); active = false; a.update({ optional: ["late"] });
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    const b = createDailyPreferences(today, "account-b", () => storage, () => true); b.load(); expect(b.getSnapshot().value.optional).toEqual([]);
    const restored = createDailyPreferences(today, "account-a", () => storage, () => true); restored.load(); expect(restored.getSnapshot().value.optional).toEqual(["invented"]);
  });
});
describe("review uses confirmed records without journal bodies", () => {
  it("distinguishes open, overdue, completed-period and future records", () => {
    const done = { ...task, id: "done", status: "done" as const, completedAt: `${today}T12:00:00` };
    const cancelled = { ...task, id: "cancelled", status: "cancelled" as const };
    const future = { ...done, id: "future", completedAt: "2026-11-27T12:00:00" };
    const project: Project = { id: "invented-project", name: "Invented", description: "", status: "active", color: "violet" };
    const habit: Habit = { id: "habit", name: "Invented quantity", description: "", color: "cyan", isActive: true, trackingType: "quantity", dailyTarget: 8, frequency: "daily", targetPerWeek: 7, unit: "glasses", streakEnabled: false, createdAt: today, checkIns: [], days: { [today]: { amount: 2, target: 2 }, "2026-11-19": { amount: 5, target: 5 }, "2026-11-27": { amount: 8, target: 8 } } };
    const review = weeklyReview([{ ...task, dueDate: "2026-11-25" }, done, cancelled, future], [project], [habit], [], [], today, Date.parse(`${today}T12:00Z`));
    expect(review.open).toHaveLength(1); expect(review.overdue).toHaveLength(1); expect(review.completed).toEqual([done]); expect(review.revisit).toEqual([]);
    expect(review.habits[0]).toMatchObject({ current: 1, previous: 1, recorded: 1 });
    expect(dailyReview([task, done, cancelled, future], today, task.id).completed).toEqual([done]);
  });
});
describe("exports are explicit and spreadsheet safe", () => {
  it("omits excluded text and unknown fields even if transport supplies them", () => {
    const rows = [{ id: "invented", title: "Invented title", description: "Invented private note", secret: "Invented excluded field" }];
    const body = exportDocument("tasks", rows, exportColumns("tasks", false), "json", new Date(`${today}T12:00Z`));
    expect(body).toContain("Invented title"); expect(body).not.toContain("Invented private note"); expect(body).not.toContain("Invented excluded field");
    expect(exportDocument("tasks", rows, exportColumns("tasks", true), "json", new Date())).toContain("Invented private note");
    expect(exportColumns("habits", true)).not.toContain("description"); expect(exportColumns("habits", true)).not.toContain("days");
  });
  it("quotes multiline CSV and neutralizes formulas, including leading whitespace", () => {
    const csv = exportDocument("tasks", [{ title: '  =SUM(1,2)', description: 'Invented "quote"\nnext line' }], ["title", "description"], "csv", new Date());
    expect(csv).toContain('"\'  =SUM(1,2)"'); expect(csv).toContain('"Invented ""quote""\nnext line"');
  });
});
describe("reversible controls", () => {
  it("bounds undo and blocks double clicks while keeping failures retryable", async () => {
    let now = 0, finish!: () => void;
    const write = vi.fn(() => new Promise<void>(resolve => { finish = resolve; })), undo = undoAction(write, () => now);
    const pending = undo.run(); await expect(undo.run()).rejects.toThrow(); finish(); await pending;
    await expect(undo.run()).rejects.toThrow(); expect(write).toHaveBeenCalledTimes(1);
    const failed = undoAction(vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined), () => now);
    await expect(failed.run()).rejects.toThrow("offline"); await failed.run();
    const expired = undoAction(write, () => now); now = 15001; await expect(expired.run()).rejects.toThrow(/expired/);
  });
  it("snoozes task reminders across midnight in their own time zone, without deadlines", () => {
    const rule = { id: "invented", task_id: "task", habit_id: null, enabled: true, local_date: today, local_time: "08:00", time_zone: "America/Chicago" };
    expect(reminderControlPatch(rule, "snooze15", Date.parse("2026-11-27T05:55:10Z"))).toEqual({ local_date: "2026-11-27", local_time: "00:11", enabled: true });
    expect(reminderControlPatch(rule, "mute", 0)).toEqual({ enabled: false });
    expect(() => reminderControlPatch({ ...rule, task_id: null, habit_id: "habit" }, "snooze60", 0)).toThrow(/daily reminder/);
    expect(() => reminderControlPatch(rule, "invalid" as never, 0)).toThrow();
    expect(() => reminderControlPatch(rule, "snooze15", Date.parse("2026-11-01T06:10:00Z"))).toThrow(/repeated/);
  });
});
