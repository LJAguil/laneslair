import { describe, expect, it, vi } from "vitest";
import { createCaptureDrafts, hasCaptureDrafts, type CaptureRequest } from "./capture-drafts";
const failure = (error: unknown) => ({ message: error instanceof Error ? error.message : "Save failed", conflict: error instanceof Error && error.message === "conflict" });
function setup(write = vi.fn(async (request: CaptureRequest) => { void request; })) {
  let id = 0;
  const store = createCaptureDrafts(write, failure, () => `invented-request-${++id}`);
  store.setAccount("invented-account-a");
  return { store, write, epoch: store.getSnapshot().epoch };
}
describe("capture drafts held in app memory", () => {
  it("shares a new capture across form mounts and keeps edit drafts separate", () => {
    const { store, epoch } = setup();
    store.change("new", "Invented multiline\ncapture", "", epoch);
    expect(store.getSnapshot().drafts.new.body).toBe("Invented multiline\ncapture");
    store.change("edit/note-a", "Invented edit", "Saved invented note", epoch);
    expect(store.getSnapshot().drafts.new.body).toBe("Invented multiline\ncapture");
    expect(hasCaptureDrafts(store.getSnapshot())).toBe(true);
    store.discard("edit/note-a", "Saved invented note", epoch);
    expect(store.getSnapshot().drafts["edit/note-a"].body).toBe("Saved invented note");
  });
  it("retains exact text and retry identity after a lost response, clearing only confirmed writing", async () => {
    const write = vi.fn(async (request: CaptureRequest) => { void request; });
    write.mockRejectedValueOnce(new Error("Lost response"));
    const { store, epoch } = setup(write);
    store.change("new", "Invented note", "", epoch);
    expect(await store.save("new", "", epoch)).toBe(false);
    const failed = store.getSnapshot().drafts.new;
    expect(failed).toMatchObject({ body: "Invented note", status: "error", requestId: "invented-request-1" });
    expect(await store.save("new", "", epoch)).toBe(true);
    expect(write.mock.calls.map(([request]) => request.requestId)).toEqual(["invented-request-1", "invented-request-1"]);
    expect(store.getSnapshot().drafts.new).toMatchObject({ body: "", requestId: null, status: "saved" });
    expect(hasCaptureDrafts(store.getSnapshot())).toBe(false);
  });
  it("blocks duplicate submission and draft discard while a write is unresolved", async () => {
    let finish!: () => void;
    const write = vi.fn((request: CaptureRequest) => { void request; return new Promise<void>(resolve => { finish = resolve; }); });
    const { store, epoch } = setup(write);
    store.change("new", "Invented note", "", epoch);
    const pending = store.save("new", "", epoch);
    expect(await store.save("new", "", epoch)).toBe(false);
    store.discard("new", "", epoch); store.change("new", "Changed", "", epoch);
    expect(store.getSnapshot().drafts.new.body).toBe("Invented note");
    finish(); await pending; expect(write).toHaveBeenCalledTimes(1);
  });
  it("requires an explicit new-copy choice when changed text conflicts with a previously accepted request", async () => {
    const write = vi.fn(async (request: CaptureRequest) => { void request; });
    write.mockRejectedValueOnce(new Error("Lost response")).mockRejectedValueOnce(new Error("conflict"));
    const { store, epoch } = setup(write);
    store.change("new", "First invented text", "", epoch); await store.save("new", "", epoch);
    store.change("new", "Updated invented text", "", epoch); await store.save("new", "", epoch);
    expect(store.getSnapshot().drafts.new.conflict).toBe(true);
    store.fork("new", epoch); await store.save("new", "", epoch);
    expect(write.mock.calls.map(([request]) => request.requestId)).toEqual(["invented-request-1", "invented-request-1", "invented-request-2"]);
  });
  it("clears on sign-out/account change, fences late results and ignores stale input handlers", async () => {
    let finish!: () => void;
    const { store, epoch } = setup(vi.fn((request: CaptureRequest) => { void request; return new Promise<void>(resolve => { finish = resolve; }); }));
    store.change("new", "Invented account A text", "", epoch);
    const pending = store.save("new", "", epoch);
    store.setAccount(null); store.setAccount("invented-account-b");
    store.change("new", "Late handler", "", epoch);
    finish(); expect(await pending).toBe(false);
    expect(store.getSnapshot().drafts).toEqual({});
    expect(store.getSnapshot().needsReload).toBe(true);
  });
  it("keeps same-account token refreshes intact and retains saved edits without unsaved warnings", async () => {
    const { store, epoch } = setup();
    store.change("edit/note", "Invented edited note", "Original", epoch);
    store.setAccount("invented-account-a");
    expect(store.getSnapshot().epoch).toBe(epoch);
    await store.save("edit/note", "Original", epoch, "note");
    expect(store.getSnapshot().drafts["edit/note"]).toMatchObject({ body: "Invented edited note", baseBody: "Invented edited note", status: "saved" });
    expect(hasCaptureDrafts(store.getSnapshot())).toBe(false);
  });
});
