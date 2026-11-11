import { beforeEach, describe, expect, it, vi } from "vitest";
import { taskDueTimestamp } from "@/lib/dates";
const fake = vi.hoisted(() => ({ calls: [] as { method: string; args: unknown[] }[], results: [] as { data: unknown; error: unknown }[] }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({
  from: () => {
    const chain = Object.fromEntries(["select", "insert", "update", "eq", "order", "single"].map(method => [method, (...args: unknown[]) => { fake.calls.push({ method, args }); return chain; }])) as Record<string, unknown>;
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(fake.results.shift()).then(resolve);
    return chain;
  },
  rpc: (...args: unknown[]) => { fake.calls.push({ method: "rpc", args }); return Promise.resolve(fake.results.shift()); },
}) }));
import { buildTaskInsert, buildTaskUpdate, createTask, fetchTasks, rowToTask, updateTaskStatus } from "./tasks";
import { convertNote } from "./inbox";

const USER = "11111111-1111-4111-8111-111111111111";
const row = { id: USER, user_id: USER, title: "Invented", description: "", priority: "medium" as const, status: "todo" as const, project_id: null, created_at: "2026-11-11T09:00:00Z", completed_at: null, due_at: taskDueTimestamp("2026-11-11", "12:00"), due_has_time: true };
const missing = { code: "42703", message: "column tasks.due_has_time does not exist" };
beforeEach(() => { fake.calls = []; fake.results = []; });
describe("timed deadline transport (no live database)", () => {
  it("round-trips explicit noon without confusing existing date-only noon tasks", () => {
    expect(rowToTask(row)).toMatchObject({ dueTime: "12:00", dueAt: row.due_at });
    expect(rowToTask({ ...row, due_has_time: false }).dueTime).toBeUndefined();
    expect(buildTaskInsert(USER, { title: "Invented", priority: "medium", dueDate: "2026-11-11", dueTime: "12:00" })).toMatchObject({ due_has_time: true, due_at: row.due_at });
  });
  it("preserves exact deadline on unrelated edits and clears the timed flag explicitly", () => {
    const previous = rowToTask(row);
    expect(buildTaskUpdate(previous, { ...previous, title: "Renamed" })).not.toHaveProperty("due_at");
    expect(buildTaskUpdate(previous, { ...previous, dueTime: undefined })).toMatchObject({ due_has_time: false });
    expect(buildTaskUpdate(previous, { ...previous, dueDate: undefined, dueTime: undefined })).toMatchObject({ due_at: null, due_has_time: false });
    expect(buildTaskUpdate(previous, { ...previous, dueTime: "13:00" }).due_at).toBe(taskDueTimestamp("2026-11-11", "13:00"));
  });
  it("keeps old-schema reads/date-only saves working, with no inferred deadlines", async () => {
    fake.results = [{ data: null, error: missing }, { data: [{ ...row, due_has_time: undefined }], error: null }];
    expect((await fetchTasks())[0].dueAt).toBeUndefined();
    expect(fake.calls.filter(call => call.method === "select")).toHaveLength(2);
    fake.results = [{ data: null, error: missing }, { data: { ...row, due_has_time: undefined }, error: null }];
    await expect(createTask(USER, { title: "Invented", priority: "low" })).resolves.toHaveProperty("id", USER);
  });
  it("fails clearly without downgrading a timed save when setup is absent", async () => {
    fake.results = [{ data: null, error: missing }];
    await expect(createTask(USER, { title: "Invented", priority: "low", dueDate: "2026-11-11", dueTime: "12:00" })).rejects.toThrow(/due-time setup/);
    expect(fake.calls.filter(call => call.method === "insert")).toHaveLength(1);
  });
  it("never retries an ambiguous network failure and retains time on completion responses", async () => {
    fake.results = [{ data: null, error: { message: "Failed to fetch" } }];
    await expect(createTask(USER, { title: "Invented", priority: "low" })).rejects.toThrow();
    expect(fake.calls.filter(call => call.method === "insert")).toHaveLength(1);
    fake.results = [{ data: { ...row, status: "done" }, error: null }];
    expect((await updateTaskStatus(USER, USER, "done")).dueAt).toBe(row.due_at);
  });
  it("routes timed Inbox conversion atomically and explains missing RPC setup", async () => {
    const input = { title: "Invented", priority: "low" as const, dueDate: "2026-11-11", dueTime: "12:00" };
    fake.results = [{ data: null, error: { code: "PGRST202" } }];
    await expect(convertNote(USER, USER, input)).rejects.toThrow(/due-time setup/);
    expect(fake.calls[0].args).toEqual(["convert_inbox_note_timed", expect.objectContaining({ p_due_at: row.due_at })]);
    expect(fake.calls.some(call => call.method === "insert")).toBe(false);
  });
});
