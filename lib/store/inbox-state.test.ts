import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InboxNote } from "@/lib/types";
import { TaskDataError } from "@/lib/data/tasks";

vi.mock("@/lib/data/inbox", () => ({ fetchNotes: vi.fn(), createNote: vi.fn(), updateNote: vi.fn(), convertNote: vi.fn(), fetchFocus: vi.fn(), saveFocus: vi.fn() }));
vi.mock("@/lib/data/tasks", async (original) => ({ ...await original<typeof import("@/lib/data/tasks")>(), getVerifiedUserId: vi.fn(async () => "user") }));
import * as data from "@/lib/data/inbox";
import { createInboxActions, initialInboxState, reduceInbox, type InboxAction } from "./inbox-state";

const note: InboxNote = { id: "capture", body: "Original", createdAt: "2026-11-07T12:00:00Z", updatedAt: "2026-11-07T12:00:00Z" };
beforeEach(() => { vi.clearAllMocks(); });

describe("Inbox store reliability", () => {
  it("does not publish a note or success toast when saving fails", async () => {
    vi.mocked(data.createNote).mockRejectedValueOnce(new TaskDataError("Offline"));
    const dispatch = vi.fn(); const notify = vi.fn();
    await expect(createInboxActions(dispatch, notify).addCapture("capture", "Original")).rejects.toThrow("Offline");
    expect(dispatch.mock.calls.map(([a]) => a.type)).toEqual(["inbox/pending", "inbox/pending"]);
    expect(notify).not.toHaveBeenCalled();
  });
  it("does not erase a capture saved during a slower list load", async () => {
    let resolve!: (notes: InboxNote[]) => void;
    vi.mocked(data.fetchNotes).mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    vi.mocked(data.createNote).mockResolvedValueOnce(note);
    const dispatch = vi.fn();
    const actions = createInboxActions(dispatch, vi.fn());
    const load = actions.loadInbox();
    await vi.waitFor(() => expect(data.fetchNotes).toHaveBeenCalled());
    await actions.addCapture(note.id, note.body);
    resolve([]);
    await load;
    expect(dispatch).toHaveBeenLastCalledWith({ type: "inbox/loaded", notes: [note] });
  });
  it("rejects simultaneous conversion attempts and publishes neither note nor task on failure", async () => {
    let reject!: (err: Error) => void;
    vi.mocked(data.convertNote).mockImplementationOnce(() => new Promise((_, r) => { reject = r; }));
    const dispatch = vi.fn(); const actions = createInboxActions(dispatch, vi.fn());
    const first = actions.convertCapture(note, { title: "Task", priority: "low" });
    await vi.waitFor(() => expect(data.convertNote).toHaveBeenCalled());
    await expect(actions.convertCapture(note, { title: "Task", priority: "low" })).rejects.toThrow(/still saving/);
    const rejected = expect(first).rejects.toThrow("Offline");
    reject(new TaskDataError("Offline"));
    await rejected;
    expect(dispatch.mock.calls.some(([a]) => a.type === "task/add" || a.type === "inbox/saved")).toBe(false);
  });
  it("upserts saved captures without duplicates and preserves them in an error state", () => {
    let state = reduceInbox(initialInboxState, { type: "inbox/saved", note });
    state = reduceInbox(state, { type: "inbox/saved", note: { ...note, body: "Edited" } });
    state = reduceInbox(state, { type: "inbox/failed", message: "Offline" });
    expect(state.inboxNotes).toEqual([{ ...note, body: "Edited" }]);
    expect(state.inboxStatus).toBe("error");
  });
  it("retains the existing focus after a failed write", async () => {
    const focus = { taskId: "existing", date: "2026-11-07" };
    let state = { ...initialInboxState, focus, focusStatus: "ready" as const };
    const dispatch = (action: InboxAction | { type: "task/add" }) => { if (action.type !== "task/add") state = reduceInbox(state, action) as typeof state; };
    vi.mocked(data.saveFocus).mockRejectedValueOnce(new TaskDataError("Offline"));
    await expect(createInboxActions(dispatch, vi.fn()).setFocus("replacement", focus.date)).rejects.toThrow("Offline");
    expect(state.focus).toEqual(focus);
    expect(state.savingFocus).toBe(false);
  });
});
