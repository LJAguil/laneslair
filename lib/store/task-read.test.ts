import { expect, it } from "vitest";
import type { Task } from "@/lib/types";
import { mergeTaskRead } from "./task-read";

const task: Task = { id: "task", title: "original", priority: "low", status: "todo", createdAt: "2026-11-07T12:00:00" };
it("does not erase a newly converted task or resurrect a deleted task after a stale read", () => {
  expect(mergeTaskRead([], new Map([[task.id, { revision: 2, task }]]), 1)).toEqual([task]);
  expect(mergeTaskRead([task], new Map([[task.id, { revision: 2, task: null }]]), 1)).toEqual([]);
});
it("preserves a newer edit while allowing later authoritative reloads", () => {
  const writes = new Map([[task.id, { revision: 2, task: { ...task, title: "edited" } }]]);
  expect(mergeTaskRead([task], writes, 1)[0].title).toBe("edited");
  expect(mergeTaskRead([task], writes, 2)[0].title).toBe("original");
});
