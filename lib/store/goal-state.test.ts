import { beforeEach, expect, it, vi } from "vitest";
import type { Goal } from "@/lib/types";
vi.mock("@/lib/data/goals", () => ({ fetchGoals: vi.fn(), createGoal: vi.fn(), updateGoal: vi.fn(), deleteGoal: vi.fn() }));
import * as data from "@/lib/data/goals";
import { createGoalActions, initialGoalState, reduceGoals, type GoalAction } from "./goal-state";
const goal: Goal = { id: "goal", title: "Read", unit: "books", current: 1, target: 12, status: "active", color: "blue" };
const input = { ...goal, status: "active" as const };
beforeEach(() => vi.resetAllMocks());
function setup(verify = async () => "owner") {
  let state = { ...initialGoalState, goals: [goal] };
  const notify = vi.fn();
  const actions = createGoalActions((action: GoalAction) => { state = reduceGoals(state, action); }, notify, verify);
  return { actions, notify, state: () => state };
}
it("keeps saved progress and deletions when an older load finishes", async () => {
  let resolve!: (rows: Goal[]) => void;
  vi.mocked(data.fetchGoals).mockImplementation(() => new Promise(r => { resolve = r; }));
  const s = setup(); const load = s.actions.loadGoals();
  await vi.waitFor(() => expect(data.fetchGoals).toHaveBeenCalled());
  vi.mocked(data.updateGoal).mockResolvedValue({ ...goal, current: 5 });
  await s.actions.editGoal(goal.id, input); resolve([goal]); await load;
  expect(s.state().goals[0].current).toBe(5);
  const reload = s.actions.loadGoals();
  await vi.waitFor(() => expect(data.fetchGoals).toHaveBeenCalledTimes(2));
  await s.actions.deleteGoal(goal.id); resolve([goal]); await reload;
  expect(s.state().goals).toEqual([]);
});
it("retains prior progress after a failed save and releases pending controls", async () => {
  const s = setup(); vi.mocked(data.updateGoal).mockRejectedValue(new Error("Offline"));
  await expect(s.actions.editGoal(goal.id, input)).rejects.toThrow("Offline");
  expect(s.state().goals).toEqual([goal]); expect(s.state().pendingGoalIds).toEqual([]); expect(s.notify).not.toHaveBeenCalled();
});
it("blocks duplicate in-flight writes", async () => {
  let resolve!: (row: Goal) => void;
  vi.mocked(data.updateGoal).mockImplementation(() => new Promise(r => { resolve = r; }));
  const s = setup(); const write = s.actions.editGoal(goal.id, input);
  await vi.waitFor(() => expect(data.updateGoal).toHaveBeenCalled());
  await expect(s.actions.deleteGoal(goal.id)).rejects.toThrow(/still saving/);
  expect(data.deleteGoal).not.toHaveBeenCalled(); resolve(goal); await write;
});
it("blocks stale account forms before all writes", async () => {
  const s = setup(async () => { throw new Error("Account changed"); });
  await expect(s.actions.addGoal(goal.id, input)).rejects.toThrow(/Account changed/);
  await expect(s.actions.editGoal(goal.id, input)).rejects.toThrow(/Account changed/);
  await expect(s.actions.deleteGoal(goal.id)).rejects.toThrow(/Account changed/);
  expect(data.createGoal).not.toHaveBeenCalled(); expect(data.updateGoal).not.toHaveBeenCalled(); expect(data.deleteGoal).not.toHaveBeenCalled();
});
