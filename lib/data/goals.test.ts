import { beforeEach, expect, it, vi } from "vitest";
import { goalPercent } from "@/lib/selectors";
const db = vi.hoisted(() => ({ calls: [] as { method: string; args: unknown[] }[], results: [] as { data: unknown; error: unknown }[] }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from: (...args: unknown[]) => {
  db.calls.push({ method: "from", args });
  const record = (method: string) => (...args: unknown[]) => { db.calls.push({ method, args }); return chain; };
  const chain = { select: record("select"), insert: record("insert"), update: record("update"), delete: record("delete"), eq: record("eq"), order: record("order"), single: record("single"),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(db.results.shift()).then(resolve) };
  return chain;
} }) }));
import { buildGoalFields, createGoal, deleteGoal, fetchGoals, rowToGoal, updateGoal, type GoalInput, type GoalRow } from "./goals";
const input: GoalInput = { title: " Read books ", description: " For fun ", current: 2.5, target: 12, unit: " books ", targetDate: "2027-02-28", status: "active" };
const row: GoalRow = { id: "goal", title: "Read books", description: "For fun", current_value: "2.5", target_value: "12", unit: "books", due_date: "2027-02-28", status: "active" };
const calls = (method: string) => db.calls.filter(c => c.method === method).map(c => c.args);
beforeEach(() => { db.calls = []; db.results = [{ data: row, error: null }]; });
it("maps numeric values, date-only deadlines and stable colors; handles old goals with no target", () => {
  expect(rowToGoal(row)).toMatchObject({ current: 2.5, target: 12, targetDate: "2027-02-28", status: "active" });
  expect(rowToGoal({ ...row, title: "Renamed" }).color).toBe(rowToGoal(row).color);
  expect(goalPercent(rowToGoal({ ...row, target_value: null }))).toBe(0);
  expect(goalPercent({ ...rowToGoal(row), current: 20 })).toBe(100);
});
it("validates input and clears optional fields explicitly", () => {
  expect(buildGoalFields({ ...input, description: " ", targetDate: "" })).toMatchObject({ title: "Read books", description: "", due_date: null, unit: "books" });
  for (const changes of [{ title: " " }, { target: 0 }, { current: -1 }, { current: NaN }, { target: Infinity }, { unit: " " }, { targetDate: "2027-02-30" }, { status: "invalid" }])
    expect(() => buildGoalFields({ ...input, ...changes } as GoalInput)).toThrow();
});
it("loads the verified owner's goals and surfaces network errors separately from empty accounts", async () => {
  db.results = [{ data: [], error: null }, { data: null, error: { message: "Failed to fetch" } }];
  expect(await fetchGoals("owner")).toEqual([]);
  expect(calls("eq")).toEqual([["user_id", "owner"]]);
  await expect(fetchGoals("owner")).rejects.toThrow(/connection/);
});
it("creates with the form UUID and owner, and scopes updates and deletes to the owner", async () => {
  await createGoal("owner", "goal", input);
  expect(calls("insert")[0][0]).toMatchObject({ id: "goal", user_id: "owner", target_value: 12, current_value: 2.5 });
  db.results.push({ data: row, error: null }, { data: null, error: null });
  await updateGoal("owner", "goal", input); await deleteGoal("owner", "goal");
  expect(calls("eq")).toEqual([["id", "goal"], ["user_id", "owner"], ["id", "goal"], ["user_id", "owner"]]);
});
it("recovers a committed create after a lost response without overwriting later edits", async () => {
  db.results = [{ data: null, error: { code: "23505" } }, { data: row, error: null }];
  expect(await createGoal("owner", "goal", input)).toEqual(rowToGoal(row));
  db.results = [{ data: null, error: { code: "23505" } }, { data: { ...row, current_value: 5 }, error: null }];
  await expect(createGoal("owner", "goal", input)).rejects.toThrow(/already saved/);
  expect(calls("update")).toEqual([]);
});
it("does not turn missing goals or permission failures into successful writes", async () => {
  db.results = [{ data: null, error: { code: "PGRST116" } }, { data: null, error: { code: "42501" } }];
  await expect(updateGoal("owner", "goal", input)).rejects.toThrow(/no longer available/);
  await expect(deleteGoal("owner", "goal")).rejects.toThrow(/permission/);
});
