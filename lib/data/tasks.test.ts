import { beforeEach, describe, expect, it, vi } from "vitest";
import { timestampToLocalDate } from "@/lib/dates";
import type { Task } from "@/lib/types";

// ---------------------------------------------------------------------------
// Fake Supabase client: records every query-builder call so tests can assert
// exactly what would be sent to the database. No network, no credentials.
// ---------------------------------------------------------------------------
type Call = { method: string; args: unknown[] };
let calls: Call[] = [];
let nextResult: { data: unknown; error: unknown } = { data: null, error: null };

function builder() {
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    };
  const chain = {
    select: record("select"),
    insert: record("insert"),
    update: record("update"),
    delete: record("delete"),
    eq: record("eq"),
    order: record("order"),
    single: (...args: unknown[]) => {
      calls.push({ method: "single", args });
      return Promise.resolve(nextResult);
    },
  };
  return chain;
}

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => {
      calls.push({ method: "from", args: [table] });
      return builder();
    },
  }),
}));

const { buildTaskInsert, buildTaskUpdate, createTask, normalizeNotes, rowToTask, TaskDataError, updateTask } = await import("./tasks");

const USER = "11111111-1111-4111-8111-111111111111";
const TASK_ID = "22222222-2222-4222-8222-222222222222";

function dbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TASK_ID,
    user_id: USER,
    project_id: null,
    title: "Write report",
    description: "",
    status: "todo",
    priority: "medium",
    due_at: null,
    completed_at: null,
    created_at: "2026-10-15T16:00:00.000Z",
    ...overrides,
  };
}

const baseTask: Task = {
  id: TASK_ID,
  title: "Write report",
  notes: "Draft the intro",
  priority: "medium",
  status: "todo",
  dueDate: "2026-10-20",
  createdAt: "2026-10-15T09:00:00",
};

const callsOf = (method: string) => calls.filter((c) => c.method === method);

beforeEach(() => {
  calls = [];
  nextResult = { data: dbRow(), error: null };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// ---------------------------------------------------------------------------
describe("notes normalisation", () => {
  it("treats missing, empty and whitespace-only notes as an empty string", () => {
    expect(normalizeNotes(undefined)).toBe("");
    expect(normalizeNotes(null)).toBe("");
    expect(normalizeNotes("")).toBe("");
    expect(normalizeNotes("   \n\t ")).toBe("");
  });

  it("trims surrounding whitespace from real notes", () => {
    expect(normalizeNotes("  buy milk  ")).toBe("buy milk");
  });

  it("maps an empty database description back to no notes", () => {
    expect(rowToTask(dbRow({ description: "" }) as never).notes).toBeUndefined();
    expect(rowToTask(dbRow({ description: "  " }) as never).notes).toBeUndefined();
    expect(rowToTask(dbRow({ description: "Hello" }) as never).notes).toBe("Hello");
  });
});

// ---------------------------------------------------------------------------
describe("creating tasks", () => {
  it("regression: sends description '' (never null) when notes are empty", () => {
    const insert = buildTaskInsert(USER, { title: "No notes", priority: "medium" });
    expect(insert.description).toBe("");
    expect(insert.description).not.toBeNull();
  });

  it("sends description '' for whitespace-only notes", () => {
    expect(buildTaskInsert(USER, { title: "x", priority: "low", notes: "   " }).description).toBe("");
  });

  it("uses the verified user id, defaults status to todo, and never sends project_id", () => {
    const insert = buildTaskInsert(USER, { title: "  Trim me  ", priority: "high", projectId: "p1" });
    expect(insert).toMatchObject({ user_id: USER, title: "Trim me", status: "todo", priority: "high" });
    expect(insert).not.toHaveProperty("project_id");
  });

  it("stores no due date as null and a due date as local noon on the same day", () => {
    expect(buildTaskInsert(USER, { title: "x", priority: "low" }).due_at).toBeNull();
    const dueAt = buildTaskInsert(USER, { title: "x", priority: "low", dueDate: "2026-10-20" }).due_at!;
    expect(new Date(dueAt).getHours()).toBe(12);
    expect(timestampToLocalDate(dueAt)).toBe("2026-10-20");
  });

  it("regression: createTask inserts one row with description '' when notes are empty", async () => {
    const task = await createTask(USER, { title: "No notes", priority: "medium" });
    const inserts = callsOf("insert");
    expect(inserts).toHaveLength(1);
    expect(inserts[0].args[0]).toMatchObject({ description: "", user_id: USER });
    expect(task.notes).toBeUndefined();
  });

  it("turns a not-null violation into a useful message", async () => {
    nextResult = { data: null, error: { code: "23502", message: "null value in column" } };
    await expect(createTask(USER, { title: "x", priority: "low" })).rejects.toThrow(TaskDataError);
    await expect(createTask(USER, { title: "x", priority: "low" })).rejects.toThrow(/required field/);
  });
});

// ---------------------------------------------------------------------------
describe("editing tasks", () => {
  const now = new Date("2026-10-16T18:30:00.000Z");

  it("always sets updated_at and sends only fields that changed", () => {
    const update = buildTaskUpdate(baseTask, { ...baseTask, title: "Write final report" }, now);
    expect(update).toEqual({ updated_at: now.toISOString(), title: "Write final report" });
  });

  it("sends just updated_at when nothing changed", () => {
    expect(buildTaskUpdate(baseTask, { ...baseTask }, now)).toEqual({ updated_at: now.toISOString() });
  });

  it("clearing an existing description sends ''", () => {
    expect(buildTaskUpdate(baseTask, { ...baseTask, notes: "" }, now).description).toBe("");
    expect(buildTaskUpdate(baseTask, { ...baseTask, notes: "   " }, now).description).toBe("");
  });

  it("changing the due date sends the new day; clearing it sends null", () => {
    const moved = buildTaskUpdate(baseTask, { ...baseTask, dueDate: "2026-10-25" }, now);
    expect(timestampToLocalDate(moved.due_at!)).toBe("2026-10-25");
    expect(buildTaskUpdate(baseTask, { ...baseTask, dueDate: undefined }, now).due_at).toBeNull();
  });

  it("leaves due_at alone when the day is unchanged (keeps any time set elsewhere)", () => {
    expect(buildTaskUpdate(baseTask, { ...baseTask, priority: "urgent" }, now)).not.toHaveProperty("due_at");
  });

  it("keeps completed_at consistent with status changes", () => {
    expect(buildTaskUpdate(baseTask, { ...baseTask, status: "done" }, now).completed_at).toBe(now.toISOString());

    const done: Task = { ...baseTask, status: "done", completedAt: "2026-10-15T10:00:00" };
    expect(buildTaskUpdate(done, { ...done, status: "todo" }, now).completed_at).toBeNull();
    expect(buildTaskUpdate(done, { ...done, status: "cancelled" }, now).completed_at).toBeNull();
    // Editing other fields of a done task keeps its original completion time.
    expect(buildTaskUpdate(done, { ...done, title: "Renamed" }, now)).not.toHaveProperty("completed_at");
    // Moving between open states doesn't touch completed_at.
    expect(buildTaskUpdate(baseTask, { ...baseTask, status: "in_progress" }, now)).not.toHaveProperty("completed_at");
  });

  it("updateTask updates the existing row by id and owner, and never inserts", async () => {
    nextResult = { data: dbRow({ title: "Edited", description: "" }), error: null };
    const saved = await updateTask(USER, baseTask, { ...baseTask, title: "Edited", notes: "" });

    expect(callsOf("insert")).toHaveLength(0);
    expect(callsOf("update")).toHaveLength(1);
    expect(callsOf("update")[0].args[0]).toMatchObject({ title: "Edited", description: "" });
    expect(callsOf("eq").map((c) => c.args)).toEqual([
      ["id", TASK_ID],
      ["user_id", USER],
    ]);
    expect(saved).toMatchObject({ id: TASK_ID, title: "Edited", notes: undefined });
  });

  it("reports a clear error when the task no longer exists", async () => {
    nextResult = { data: null, error: { code: "PGRST116", message: "0 rows" } };
    await expect(updateTask(USER, baseTask, { ...baseTask, title: "x" })).rejects.toThrow(/no longer exists/);
  });
});
