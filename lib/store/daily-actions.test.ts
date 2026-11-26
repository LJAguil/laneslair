import { beforeEach, expect, it, vi } from "vitest";
import type { Task } from "@/lib/types";
import type { Notice } from "./app-store";
vi.mock("@/lib/data/tasks", async original => ({ ...await original<typeof import("@/lib/data/tasks")>(), getVerifiedUserId: vi.fn(), updateTaskStatus: vi.fn(), undoTaskCompletion: vi.fn(), updateTaskDueDate: vi.fn() }));
import * as data from "@/lib/data/tasks";
import { createActions } from "./app-store";
const task: Task = { id: "invented-task", title: "Invented", status: "in_progress", priority: "high", createdAt: "2026-11-26T09:00:00" };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(data.getVerifiedUserId).mockResolvedValue("invented-owner"); });
it("offers undo only after confirmation and restores the exact original open status", async () => {
  const dispatch = vi.fn(), actions = createActions(dispatch), saved = { ...task, status: "done" as const, completedAt: "2026-11-26T12:00:00" };
  vi.mocked(data.updateTaskStatus).mockResolvedValue(saved); vi.mocked(data.undoTaskCompletion).mockResolvedValue(task);
  await actions.toggleTask(task);
  const notice: Notice = dispatch.mock.calls.find(([action]) => action.type === "notice/show")![0].notice;
  await notice.undo!.run();
  expect(data.undoTaskCompletion).toHaveBeenCalledWith("invented-owner", saved, task);
  expect(dispatch).toHaveBeenCalledWith({ type: "task/replace", task });
});
it("does not offer undo on failure and refuses stale undo after a later mutation", async () => {
  const dispatch = vi.fn(), actions = createActions(dispatch);
  vi.mocked(data.updateTaskStatus).mockRejectedValueOnce(new Error("offline")); await actions.toggleTask(task);
  expect(dispatch.mock.calls.find(([action]) => action.type === "notice/show")![0].notice.undo).toBeUndefined();
  dispatch.mockClear(); const saved = { ...task, status: "done" as const, completedAt: "2026-11-26T12:00:00" };
  vi.mocked(data.updateTaskStatus).mockResolvedValue(saved); await actions.toggleTask(task);
  const notice: Notice = dispatch.mock.calls.find(([action]) => action.type === "notice/show")![0].notice;
  vi.mocked(data.updateTaskDueDate).mockResolvedValue({ ...saved, dueDate: "2026-11-27" }); await actions.rescheduleTask(saved, "2026-11-27");
  await expect(notice.undo!.run()).rejects.toThrow(/changed/); expect(data.undoTaskCompletion).not.toHaveBeenCalled();
});
it("never undoes under a different verified account", async () => {
  const dispatch = vi.fn(), actions = createActions(dispatch);
  vi.mocked(data.updateTaskStatus).mockResolvedValue({ ...task, status: "done", completedAt: "2026-11-26T12:00:00" }); await actions.toggleTask(task);
  const notice: Notice = dispatch.mock.calls.find(([action]) => action.type === "notice/show")![0].notice;
  vi.mocked(data.getVerifiedUserId).mockResolvedValue("other"); await expect(notice.undo!.run()).rejects.toThrow(/original account/);
  expect(data.undoTaskCompletion).not.toHaveBeenCalled();
});
