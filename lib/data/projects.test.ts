import { beforeEach, describe, expect, it, vi } from "vitest";
import { projectProgress } from "@/lib/selectors";
import type { Task } from "@/lib/types";

const db = vi.hoisted(() => ({ calls: [] as { method: string; args: unknown[] }[], result: { data: null as unknown, error: null as unknown } }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (...args: unknown[]) => {
      db.calls.push({ method: "from", args });
      const record = (method: string) => (...args: unknown[]) => { db.calls.push({ method, args }); return chain; };
      const chain = {
        select: record("select"), insert: record("insert"), update: record("update"),
        eq: record("eq"), order: record("order"), single: record("single"),
        then: (resolve: (r: typeof db.result) => unknown) => Promise.resolve(db.result).then(resolve),
      };
      return chain;
    },
  }),
}));

import { buildProjectFields, createProject, fetchProjects, rowToProject, updateProject, type ProjectRow } from "./projects";

const USER = "11111111-1111-4111-8111-111111111111";
const ID = "22222222-2222-4222-8222-222222222222";
const row: ProjectRow = {
  id: ID, user_id: USER, name: "Home", description: "", status: "active",
  due_date: "2026-11-12", created_at: "2026-11-06T12:00:00Z", updated_at: "2026-11-06T12:00:00Z",
};
const calls = (method: string) => db.calls.filter((c) => c.method === method).map((c) => c.args);
beforeEach(() => { db.calls = []; db.result = { data: row, error: null }; });

describe("project persistence", () => {
  it("maps a date-only due date without a timezone conversion and gives stable color", () => {
    expect(rowToProject(row)).toMatchObject({ id: ID, dueDate: "2026-11-12", status: "active" });
    expect(rowToProject(row).color).toBe(rowToProject({ ...row, name: "Renamed" }).color);
    expect(rowToProject({ ...row, due_date: null }).dueDate).toBeUndefined();
  });

  it("keeps absent and whitespace descriptions as non-null empty strings", () => {
    expect(buildProjectFields({ name: " Home ", status: "active" })).toEqual({ name: "Home", description: "", status: "active", due_date: null });
    expect(buildProjectFields({ name: "Home", description: " \n ", status: "paused" }).description).toBe("");
  });

  it("validates name, status, and impossible calendar dates before saving", () => {
    expect(() => buildProjectFields({ name: " ", status: "active" })).toThrow(/name/);
    expect(() => buildProjectFields({ name: "Home", status: "planning" as never })).toThrow(/status/);
    expect(() => buildProjectFields({ name: "Home", status: "active", dueDate: "2026-02-30" })).toThrow(/date/);
  });

  it("fetches only the verified owner's projects", async () => {
    db.result.data = [row];
    expect(await fetchProjects(USER)).toEqual([rowToProject(row)]);
    expect(calls("from")).toEqual([["projects"]]);
    expect(calls("eq")).toEqual([["user_id", USER]]);
  });

  it("distinguishes an empty account from a failed read", async () => {
    db.result.data = [];
    expect(await fetchProjects(USER)).toEqual([]);
    db.result = { data: null, error: { message: "Failed to fetch" } };
    await expect(fetchProjects(USER)).rejects.toThrow(/connection/);
  });

  it("inserts exactly one project with the verified owner and database-generated ID", async () => {
    await createProject(USER, { name: "Home", status: "active" });
    expect(calls("insert")).toEqual([[{ name: "Home", description: "", status: "active", due_date: null, user_id: USER }]]);
    expect(calls("update")).toHaveLength(0);
  });

  it("edits the owned UUID and clears description and date", async () => {
    await updateProject(USER, ID, { name: "Updated", description: " ", dueDate: undefined, status: "paused" });
    expect(calls("eq")).toEqual([["id", ID], ["user_id", USER]]);
    expect(calls("update")[0][0]).toMatchObject({ name: "Updated", description: "", due_date: null, updated_at: expect.any(String), status: "paused" });
    expect(calls("insert")).toHaveLength(0);
  });

  it("archives and restores using status updates, without deleting tasks or projects", async () => {
    for (const status of ["archived", "active"] as const) {
      await updateProject(USER, ID, { name: "Home", status });
    }
    expect(calls("update").map(([payload]) => (payload as { status: string }).status)).toEqual(["archived", "active"]);
    expect(calls("from")).toEqual([["projects"], ["projects"]]);
  });

  it("surfaces ownership failures and missing projects", async () => {
    db.result = { data: null, error: { code: "42501", message: "denied" } };
    await expect(createProject(USER, { name: "Home", status: "active" })).rejects.toThrow(/permission/);
    db.result.error = { code: "PGRST116", message: "no rows" };
    await expect(updateProject(USER, ID, { name: "Home", status: "active" })).rejects.toThrow(/no longer available/);
  });

  it("counts only linked non-cancelled tasks toward progress", () => {
    const task: Task = { id: USER, title: "x", priority: "low", status: "todo", createdAt: row.created_at, projectId: ID };
    expect(projectProgress(rowToProject(row), [task, { ...task, id: ID, status: "done" }, { ...task, status: "cancelled" }, { ...task, projectId: USER }]))
      .toEqual({ done: 1, total: 2, percent: 50 });
  });
});
