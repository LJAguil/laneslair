import * as data from "@/lib/data/goals";
import { getVerifiedUserId, TaskDataError } from "@/lib/data/tasks";
import type { Goal } from "@/lib/types";

export interface GoalSlice {
  goals: Goal[]; goalsStatus: "loading" | "ready" | "error";
  goalsError: string | null; pendingGoalIds: string[];
}
export const initialGoalState: GoalSlice = { goals: [], goalsStatus: "loading", goalsError: null, pendingGoalIds: [] };
export type GoalAction =
  | { type: "goals/loading" }
  | { type: "goals/loaded"; goals: Goal[] }
  | { type: "goals/failed"; message: string }
  | { type: "goals/saved"; goal: Goal }
  | { type: "goals/deleted"; id: string }
  | { type: "goals/pending"; id: string; pending: boolean };
export function reduceGoals(state: GoalSlice, action: GoalAction): GoalSlice {
  switch (action.type) {
    case "goals/loading": return { ...state, goalsStatus: "loading", goalsError: null };
    case "goals/loaded": return { ...state, goals: action.goals, goalsStatus: "ready", goalsError: null };
    case "goals/failed": return { ...state, goalsStatus: "error", goalsError: action.message };
    case "goals/saved": return { ...state, goals: state.goals.some(g => g.id === action.goal.id) ? state.goals.map(g => g.id === action.goal.id ? action.goal : g) : [action.goal, ...state.goals] };
    case "goals/deleted": return { ...state, goals: state.goals.filter(g => g.id !== action.id) };
    case "goals/pending": return { ...state, pendingGoalIds: action.pending ? [...state.pendingGoalIds, action.id] : state.pendingGoalIds.filter(id => id !== action.id) };
  }
}
export function createGoalActions(dispatch: (action: GoalAction) => void, notify: (kind: "success" | "error", message: string) => void, verifyUser = getVerifiedUserId) {
  const inFlight = new Set<string>();
  const writes = new Map<string, { revision: number; goal: Goal | null }>();
  let revision = 0, readSeq = 0;
  function save(id: string, goal: Goal | null) {
    writes.set(id, { revision: ++revision, goal });
    dispatch(goal ? { type: "goals/saved", goal } : { type: "goals/deleted", id });
  }
  async function pending<T>(id: string, work: () => Promise<T>) {
    if (inFlight.has(id)) throw new TaskDataError("This goal is still saving. Try again in a moment.");
    inFlight.add(id); dispatch({ type: "goals/pending", id, pending: true });
    try { return await work(); }
    finally { inFlight.delete(id); dispatch({ type: "goals/pending", id, pending: false }); }
  }
  return {
    async loadGoals({ showLoading = true } = {}) {
      const seq = ++readSeq, startedAt = revision;
      if (showLoading) dispatch({ type: "goals/loading" });
      try {
        const rows = await data.fetchGoals(await verifyUser());
        if (seq !== readSeq) return;
        const merged = new Map(rows.map(g => [g.id, g]));
        writes.forEach((write, id) => { if (write.revision > startedAt) { if (write.goal) merged.set(id, write.goal); else merged.delete(id); } });
        dispatch({ type: "goals/loaded", goals: [...merged.values()] });
      } catch (error) { if (seq === readSeq) dispatch({ type: "goals/failed", message: error instanceof TaskDataError ? error.message : "Couldn't load goals. Please try again." }); }
    },
    async addGoal(id: string, input: data.GoalInput) {
      return pending(id, async () => { const goal = await data.createGoal(await verifyUser(), id, input); save(id, goal); notify("success", "Goal created"); return goal; });
    },
    async editGoal(id: string, input: data.GoalInput) {
      return pending(id, async () => { const goal = await data.updateGoal(await verifyUser(), id, input); save(id, goal); notify("success", "Goal saved"); return goal; });
    },
    async deleteGoal(id: string) {
      return pending(id, async () => { await data.deleteGoal(await verifyUser(), id); save(id, null); notify("success", "Goal deleted"); });
    },
  };
}
