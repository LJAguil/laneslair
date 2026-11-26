import { beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ calls: [] as { table: string; method: string; args: unknown[] }[], results: [] as { data: unknown; error: unknown }[] }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from: (table: string) => {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "update", "eq", "gte", "lt", "single", "order", "range"]) chain[method] = (...args: unknown[]) => { fake.calls.push({ table, method, args }); return chain; };
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(fake.results.shift()).then(resolve);
  return chain;
} }) }));
vi.mock("@/lib/data/tasks", async original => ({ ...await original<typeof import("./tasks")>(), getVerifiedUserId: vi.fn() }));
import { fetchExport } from "./export";
import { getVerifiedUserId, rowToTask, undoTaskCompletion } from "./tasks";
import { undoHabitAddition } from "./habits";
import { undoCaptureArchive } from "./inbox";
beforeEach(() => { vi.clearAllMocks(); fake.calls = []; fake.results = []; vi.mocked(getVerifiedUserId).mockResolvedValue("invented-owner"); });
describe("export and undo transport uses invented rows only", () => {
  it("pages an explicitly selected export, scopes all pages and excludes excess fields", async () => {
    fake.results = [{ data: Array.from({ length: 500 }, (_, i) => ({ id: `invented-${i}`, title: "Invented", description: "Excluded", user_id: "Excluded" })), error: null }, { data: [{ id: "last", title: "Last invented" }], error: null }];
    const result = await fetchExport("tasks", false, "invented-owner", () => true);
    expect(result.rows).toHaveLength(501); expect(result.rows[0]).not.toHaveProperty("user_id"); expect(result.rows[0]).not.toHaveProperty("description");
    expect(fake.calls.filter(call => call.method === "eq")).toEqual([{ table: "tasks", method: "eq", args: ["user_id", "invented-owner"] }, { table: "tasks", method: "eq", args: ["user_id", "invented-owner"] }]);
    expect(fake.calls.filter(call => call.method === "range").map(call => call.args)).toEqual([[0, 499], [500, 999]]);
    expect(fake.calls.some(call => call.method === "update")).toBe(false);
  });
  it("rejects partial reads, unsigned/mismatched accounts and late account changes without a file", async () => {
    await expect(fetchExport("tasks", false, "other", () => true)).rejects.toThrow(/account changed/); expect(fake.calls).toEqual([]);
    fake.results = [{ data: null, error: { message: "Invented secret error" } }];
    await expect(fetchExport("tasks", false, "invented-owner", () => true)).rejects.toThrow(/No file/);
    fake.results = [{ data: [], error: null }];
    vi.mocked(getVerifiedUserId).mockResolvedValueOnce("invented-owner").mockResolvedValueOnce("other");
    await expect(fetchExport("habits", false, "invented-owner", () => true)).rejects.toThrow(/account changed/);
  });
  it("reverses only the amount from a confirmed positive habit addition and guards the current total", async () => {
    const log = { habit_id: "habit", completed_on: "2026-11-26", amount: 2.5, target: 8 };
    fake.results = [{ data: { ...log, amount: 1.25 }, error: null }];
    expect((await undoHabitAddition("invented-owner", log, 1.25)).amount).toBe(1.25);
    expect(fake.calls.find(call => call.method === "update")?.args).toEqual([{ amount: 1.25 }]);
    expect(fake.calls).toContainEqual({ table: "habit_logs", method: "eq", args: ["amount", 2.5] });
    expect(fake.calls).toContainEqual({ table: "habit_logs", method: "eq", args: ["user_id", "invented-owner"] });
    fake.results = [{ data: null, error: { code: "PGRST116" } }];
    await expect(undoHabitAddition("invented-owner", log, 1.25)).rejects.toThrow(/may have changed/);
  });
  it("restores the previous open status while preserving unrelated task fields", async () => {
    const row = { id: "task", title: "Invented", priority: "medium" as const, status: "done" as const, description: "", created_at: "2026-11-26T09:00Z", completed_at: "2026-11-26T12:00:00.123Z", user_id: "invented-owner", project_id: null, due_at: null };
    const saved = rowToTask(row);
    fake.results = [{ data: { ...row, status: "in_progress", completed_at: null }, error: null }];
    await undoTaskCompletion("invented-owner", saved, { ...saved, status: "in_progress" });
    expect(fake.calls.find(call => call.method === "update")?.args[0]).toEqual({ status: "in_progress", completed_at: null, updated_at: expect.any(String) });
    expect(fake.calls).toContainEqual({ table: "tasks", method: "eq", args: ["status", "done"] });
    expect(fake.calls.filter(call => call.method === "gte" || call.method === "lt")).toHaveLength(2);
  });
  it("restores only an unchanged archived capture", async () => {
    const note = { id: "note", body: "Invented", createdAt: "2026-11-26T12:00Z", updatedAt: "2026-11-26T12:30Z", archivedAt: "2026-11-26T12:30Z" };
    fake.results = [{ data: { id: note.id, body: note.body, updated_at: note.updatedAt, created_at: note.createdAt, archived_at: null }, error: null }];
    await undoCaptureArchive("invented-owner", note);
    expect(fake.calls).toContainEqual({ table: "inbox_notes", method: "eq", args: ["archived_at", note.archivedAt] });
    expect(fake.calls).toContainEqual({ table: "inbox_notes", method: "eq", args: ["updated_at", note.updatedAt] });
    expect(fake.calls.find(call => call.method === "update")?.args[0]).not.toHaveProperty("body");
  });
});
