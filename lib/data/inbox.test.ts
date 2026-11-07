import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InboxNote } from "@/lib/types";

const fake = vi.hoisted(() => ({ calls: [] as { method: string; args: unknown[] }[], results: [] as { data: unknown; error: unknown }[] }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({
  from: (...args: unknown[]) => {
    fake.calls.push({ method: "from", args });
    const chain = Object.fromEntries(["select", "insert", "update", "eq", "order", "upsert", "single", "maybeSingle"].map((method) => [method, (...args: unknown[]) => { fake.calls.push({ method, args }); return chain; }])) as Record<string, unknown>;
    chain.then = (resolve: (r: unknown) => unknown) => Promise.resolve(fake.results.shift()).then(resolve);
    return chain;
  },
  rpc: (...args: unknown[]) => { fake.calls.push({ method: "rpc", args }); return Promise.resolve(fake.results.shift()); },
}) }));
import { captureBody, captureTaskDefaults, CaptureConflictError, convertNote, createNote, fetchFocus, fetchNotes, noteFromRow, saveFocus, updateNote } from "./inbox";

const USER = "11111111-1111-4111-8111-111111111111";
const ID = "22222222-2222-4222-8222-222222222222";
const row = { id: ID, user_id: USER, body: "An idea", archived_at: null, converted_task_id: null, converted_at: null, created_at: "2026-11-07T12:00:00Z", updated_at: "2026-11-07T12:00:00Z" };
const call = (method: string) => fake.calls.filter((c) => c.method === method).map((c) => c.args);
beforeEach(() => { fake.calls = []; fake.results = [{ data: row, error: null }]; });

describe("capture data", () => {
  it("rejects empty/oversized text and preserves meaningful line breaks", () => {
    expect(() => captureBody(" \n ")).toThrow(/Write something/);
    expect(() => captureBody("x".repeat(20001))).toThrow(/20,000/);
    expect(captureBody("  first\nsecond  ")).toBe("first\nsecond");
    const note = { ...noteFromRow(row), body: "First line\nKeep this original detail" };
    expect(captureTaskDefaults(note)).toEqual({ title: "First line", notes: note.body });
  });
  it("loads only owned notes and distinguishes empty from missing setup", async () => {
    fake.results = [{ data: [], error: null }, { data: null, error: { code: "PGRST205" } }];
    expect(await fetchNotes(USER)).toEqual([]);
    expect(call("eq")).toEqual([["user_id", USER]]);
    await expect(fetchNotes(USER)).rejects.toThrow(/setup is needed/);
  });
  it("uses a stable capture UUID and recovers a lost successful response", async () => {
    fake.results = [{ data: null, error: { code: "23505" } }, { data: row, error: null }];
    expect(await createNote(USER, ID, " An idea ")).toEqual(noteFromRow(row));
    expect(call("insert")).toEqual([[{ id: ID, user_id: USER, body: "An idea" }]]);
    expect(call("eq")).toEqual([["id", ID], ["user_id", USER]]);
  });
  it("does not overwrite a recovered capture when the retry text changed", async () => {
    fake.results = [{ data: null, error: { code: "23505" } }, { data: row, error: null }];
    await expect(createNote(USER, ID, "New edits")).rejects.toThrow(CaptureConflictError);
    expect(call("update")).toHaveLength(0);
  });
  it("edits and archives by owner without touching conversion history", async () => {
    await updateNote(USER, ID, { body: "Updated", archived: true });
    expect(call("eq")).toEqual([["id", ID], ["user_id", USER]]);
    const fields = call("update")[0][0];
    expect(fields).toMatchObject({ body: "Updated", archived_at: expect.any(String), updated_at: expect.any(String) });
    expect(fields).not.toHaveProperty("converted_task_id");
    fake.results = [{ data: row, error: null }];
    await updateNote(USER, ID, { archived: false });
    expect(call("update")[1][0]).toMatchObject({ archived_at: null });
  });
  it("converts through one atomic RPC without client-side task inserts", async () => {
    const note = { ...row, converted_task_id: USER, converted_at: row.updated_at };
    const task = { id: USER, user_id: USER, title: "Task", description: "", status: "todo", priority: "low", project_id: null, due_at: null, completed_at: null, created_at: row.created_at };
    fake.results = [{ data: { note, task }, error: null }];
    const result = await convertNote(USER, ID, { title: "Task", priority: "low" });
    expect(call("rpc")).toEqual([["convert_inbox_note", { p_note_id: ID, p_title: "Task", p_description: "", p_priority: "low", p_due_at: null, p_project_id: null }]]);
    expect(call("insert")).toHaveLength(0);
    expect(result.note.convertedTaskId).toBe(USER);
    expect(result.task?.id).toBe(USER);
  });
  it("keeps deleted-task history and reports failed conversion rather than fabricating success", async () => {
    fake.results = [{ data: { note: { ...row, converted_task_id: USER, converted_at: row.updated_at }, task: null }, error: null }, { data: null, error: { message: "Failed to fetch" } }];
    expect((await convertNote(USER, ID, { title: "Task", priority: "low" })).task).toBeNull();
    await expect(convertNote(USER, ID, { title: "Task", priority: "low" })).rejects.toThrow(/connection/);
  });
  it("loads and saves a calendar-day focus for the verified owner", async () => {
    fake.results = [{ data: { task_id: ID, focus_date: "2026-11-07" }, error: null }, { data: { task_id: null, focus_date: "2026-11-07" }, error: null }];
    expect(await fetchFocus(USER)).toEqual({ taskId: ID, date: "2026-11-07" });
    expect(await saveFocus(USER, null, "2026-11-07")).toEqual({ taskId: null, date: "2026-11-07" });
    expect(call("upsert")[0]).toEqual([{ user_id: USER, task_id: null, focus_date: "2026-11-07", updated_at: expect.any(String) }, { onConflict: "user_id" }]);
  });
});

// Keep the public UI model independent of database field names.
const _model: InboxNote = noteFromRow(row);
void _model;
