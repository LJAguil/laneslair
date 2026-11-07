import { describe, expect, it } from "vitest";
import { relevantTasks } from "./today";
import type { Task } from "./types";

const task = (id: string, extra: Partial<Task> = {}): Task => ({ id, title: id, status: "todo", priority: "medium", createdAt: "2026-11-07T12:00:00Z", ...extra });
describe("Today radar", () => {
  it("shows overdue tasks first, near deadlines next, and important undated work", () => {
    const result = relevantTasks([
      task("undated", { priority: "urgent" }), task("tomorrow", { dueDate: "2026-11-08" }),
      task("overdue", { dueDate: "2026-11-06" }), task("later", { dueDate: "2026-12-01" }),
      task("low"), task("done", { dueDate: "2026-11-07", status: "done" }),
      task("cancelled", { dueDate: "2026-11-06", status: "cancelled" }),
    ], "2026-11-07");
    expect(result.map((t) => t.id)).toEqual(["overdue", "tomorrow", "undated"]);
  });
  it("excludes the chosen focus and limits the list to five", () => {
    expect(relevantTasks(Array.from({ length: 9 }, (_, i) => task(String(i), { dueDate: "2026-11-07" })), "2026-11-07", "0").map((t) => t.id)).toEqual(["1", "2", "3", "4", "5"]);
  });
});
