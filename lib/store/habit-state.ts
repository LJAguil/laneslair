import * as data from "@/lib/data/habits";
import { getVerifiedUserId, TaskDataError } from "@/lib/data/tasks";
import { withHabitDay } from "@/lib/habits";
import type { Habit } from "@/lib/types";

export interface HabitSlice {
  habits: Habit[];
  habitsStatus: "loading" | "ready" | "error";
  habitsError: string | null;
  pendingHabitIds: string[];
  failedHabitRequests: Record<string, { request?: data.HabitProgressRequest; message: string }>;
}
export const initialHabitState: HabitSlice = { habits: [], habitsStatus: "loading", habitsError: null, pendingHabitIds: [], failedHabitRequests: {} };
export type HabitAction =
  | { type: "habits/loading" }
  | { type: "habits/loaded"; habits: Habit[] }
  | { type: "habits/failed"; message: string }
  | { type: "habits/saved"; habit: Habit }
  | { type: "habits/log-failed"; request: data.HabitProgressRequest; message: string; uncertain: boolean }
  | { type: "habits/log-confirmed"; id: string }
  | { type: "habits/pending"; id: string; pending: boolean };

export function reduceHabits(state: HabitSlice, action: HabitAction): HabitSlice {
  switch (action.type) {
    case "habits/loading": return { ...state, habitsStatus: "loading", habitsError: null };
    case "habits/loaded": return { ...state, habits: action.habits, habitsStatus: "ready", habitsError: null };
    case "habits/failed": return { ...state, habitsStatus: "error", habitsError: action.message };
    case "habits/saved": return { ...state, habits: [action.habit, ...state.habits.filter((h) => h.id !== action.habit.id)].sort((a,b) => a.createdAt.localeCompare(b.createdAt)) };
    case "habits/log-failed": return { ...state, failedHabitRequests: { ...state.failedHabitRequests, [action.request.habitId]: { request: action.uncertain ? action.request : undefined, message: action.message } } };
    case "habits/log-confirmed": {
      const remaining = { ...state.failedHabitRequests }; delete remaining[action.id];
      return { ...state, failedHabitRequests: remaining };
    }
    case "habits/pending": return { ...state, pendingHabitIds: action.pending ? [...state.pendingHabitIds, action.id] : state.pendingHabitIds.filter((id) => id !== action.id) };
  }
}

export function createHabitActions(dispatch: (action: HabitAction) => void, notify: (kind: "success" | "error", message: string) => void) {
  const inFlight = new Set<string>();
  const latest = new Map<string,Habit>();
  const writes = new Map<string,number>();
  const unconfirmed = new Map<string,data.HabitProgressRequest>();
  let revision = 0;
  let readSeq = 0;
  function save(habit: Habit) { latest.set(habit.id, habit); writes.set(habit.id,++revision); dispatch({ type: "habits/saved", habit }); }
  async function withHabit<T>(id: string, work: () => Promise<T>): Promise<T> {
    if (inFlight.has(id)) throw new TaskDataError("This habit is still saving. Try again in a moment.");
    inFlight.add(id); dispatch({ type: "habits/pending", id, pending: true });
    try { return await work(); }
    finally { inFlight.delete(id); dispatch({ type: "habits/pending", id, pending: false }); }
  }
  return {
    async loadHabits({ showLoading = true } = {}) {
      const seq = ++readSeq; const startedAt = revision;
      if (showLoading) dispatch({ type: "habits/loading" });
      try {
        const rows = await data.fetchHabits(await getVerifiedUserId());
        if (seq !== readSeq) return;
        const merged = new Map(rows.map((h) => [h.id,h]));
        writes.forEach((v,id) => { if (v > startedAt) merged.set(id,latest.get(id)!); });
        latest.clear(); merged.forEach((h,id) => latest.set(id,h));
        dispatch({ type: "habits/loaded", habits: Array.from(merged.values()) });
      } catch (err) { if (seq === readSeq) dispatch({ type: "habits/failed", message: err instanceof TaskDataError ? err.message : "Couldn't load habits. Please try again." }); }
    },
    async addHabit(id: string, input: data.HabitInput) {
      return withHabit(id, async () => {
        save(await data.createHabit(await getVerifiedUserId(),id,input));
        notify("success", "Habit created");
      });
    },
    async editHabit(habit: Habit, input: data.HabitInput) {
      if (unconfirmed.has(habit.id)) throw new TaskDataError("Retry the pending progress update before editing this habit.");
      return withHabit(habit.id, async () => {
        const current = latest.get(habit.id) ?? habit;
        const saved = await data.updateHabit(await getVerifiedUserId(),current,input);
        save(saved); notify("success", "Habit saved");
      });
    },
    async archiveHabit(habit: Habit, active: boolean) {
      if (!active && unconfirmed.has(habit.id)) throw new TaskDataError("Retry the pending progress update before archiving this habit.");
      return withHabit(habit.id, async () => {
        await data.setHabitActive(await getVerifiedUserId(),habit.id,active);
        save({ ...(latest.get(habit.id) ?? habit), isActive: active });
        notify("success", active ? "Habit restored" : "Habit archived");
      });
    },
    async recordHabit(habit: Habit, request: data.HabitProgressRequest) {
      if (request.habitId !== habit.id) throw new TaskDataError("This update belongs to a different habit.");
      if (unconfirmed.has(habit.id) && unconfirmed.get(habit.id)!.id !== request.id) throw new TaskDataError("Retry the pending progress update before adding another.");
      return withHabit(habit.id, async () => {
        try {
          await getVerifiedUserId();
          const log = await data.recordHabitProgress(request);
          save(withHabitDay(latest.get(habit.id) ?? habit,log.completed_on,{ amount: Number(log.amount), target: Number(log.target) }));
          unconfirmed.delete(habit.id); dispatch({ type: "habits/log-confirmed", id: habit.id });
        } catch (err) {
          const uncertain = !data.progressWasRejected(err);
          if (uncertain) unconfirmed.set(habit.id,request); else unconfirmed.delete(habit.id);
          dispatch({ type: "habits/log-failed", request, uncertain, message: err instanceof TaskDataError ? err.message : "Couldn't confirm this progress update. Retry when connected." });
          throw err;
        }
      });
    },
  };
}
