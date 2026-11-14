import { describe, expect, it } from "vitest";
import { createPuzzleStore, puzzleStorageKey } from "./storage";
const valid = (value: unknown): value is { moves: number[] } => !!value && Array.isArray((value as { moves: number[] }).moves);
function storage() { const data = new Map<string, string>(); return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } }; }
describe("device-local deduction progress", () => {
  it("persists undoable notes and separates accounts, difficulty, daily, practice and games", () => {
    const disk = storage(), key = puzzleStorageKey("account-a", "detective/v1/2026-11-13/normal");
    createPuzzleStore(key, { moves: [] }, valid, disk).save({ moves: [1, 2] });
    expect(createPuzzleStore(key, { moves: [] }, valid, disk).getSnapshot().data.moves).toEqual([1, 2]);
    for (const other of [puzzleStorageKey("account-b", "detective/v1/2026-11-13/normal"), puzzleStorageKey("account-a", "detective/v1/2026-11-13/hard"), puzzleStorageKey("account-a", "labyrinth/v1/2026-11-13/normal"), puzzleStorageKey("account-a", "detective/v1/2026-11-13/practice-1/normal")]) expect(createPuzzleStore(other, { moves: [] }, valid, disk).getSnapshot().data.moves).toEqual([]);
  });
  it("retains in-memory moves on quota failure and retries without extra moves", () => {
    const disk = storage(); let blocked = true;
    const adapter = { ...disk, setItem: (key: string, value: string) => { if (blocked) throw new Error("quota"); disk.setItem(key, value); } };
    const store = createPuzzleStore("game", { moves: [] }, valid, adapter);
    store.save({ moves: [4] }); expect(store.getSnapshot().error).toBeTruthy(); expect(store.getSnapshot().data.moves).toEqual([4]);
    blocked = false; store.retry(); expect(store.getSnapshot().error).toBeNull();
    expect(JSON.parse(disk.data.get("game")!).moves).toEqual([4]);
  });
  it("does not overwrite corrupt data or another tab's distinct edits", () => {
    const disk = storage(); disk.data.set("bad", "{broken");
    const bad = createPuzzleStore("bad", { moves: [] }, valid, disk); bad.save({ moves: [1] });
    expect(disk.data.get("bad")).toBe("{broken"); expect(bad.getSnapshot().error).toBeTruthy();
    const first = createPuzzleStore("same", { moves: [] }, valid, disk), second = createPuzzleStore("same", { moves: [] }, valid, disk);
    first.save({ moves: [1] }); second.save({ moves: [2] });
    expect(second.getSnapshot().data.moves).toEqual([2]); expect(second.getSnapshot().error).toContain("Another tab");
    expect(JSON.parse(disk.data.get("same")!).moves).toEqual([1]);
    second.reload(); expect(second.getSnapshot().data.moves).toEqual([1]);
  });
});
