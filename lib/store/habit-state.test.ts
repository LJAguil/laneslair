import { beforeEach,expect,it,vi } from "vitest";
import { TaskDataError } from "@/lib/data/tasks";
import type { Habit } from "@/lib/types";
vi.mock("@/lib/data/habits",async(original) => ({...await original<typeof import("@/lib/data/habits")>(),fetchHabits:vi.fn(),createHabit:vi.fn(),updateHabit:vi.fn(),setHabitActive:vi.fn(),recordHabitProgress:vi.fn()}));
vi.mock("@/lib/data/tasks",async(original) => ({...await original<typeof import("@/lib/data/tasks")>(),getVerifiedUserId:vi.fn(async() => "owner")}));
import * as data from "@/lib/data/habits";
import { createHabitActions,initialHabitState,reduceHabits,type HabitAction } from "./habit-state";
const h:Habit={id:"habit",name:"Water",description:"",frequency:"daily",targetPerWeek:7,trackingType:"quantity",dailyTarget:8,unit:"glasses",streakEnabled:true,isActive:true,color:"cyan",createdAt:"2026-01-01T12:00:00Z",days:{},checkIns:[]};
const request={id:"operation",habitId:h.id,date:"2026-11-07",mode:"add" as const,value:1};
beforeEach(() => vi.clearAllMocks());
it("retains a failed request in shared state, rejects a new action, and retries the same receipt safely",async() => {
  let state={...initialHabitState,habits:[h]};
  const dispatch=(a:HabitAction) => {state=reduceHabits(state,a);};
  const actions=createHabitActions(dispatch,vi.fn());
  vi.mocked(data.recordHabitProgress).mockRejectedValueOnce(new TaskDataError("Offline"));
  await expect(actions.recordHabit(h,request)).rejects.toThrow("Offline");
  expect(state.habits[0].days).toEqual({}); expect(state.failedHabitRequests[h.id].request).toEqual(request);
  await expect(actions.recordHabit(h,{...request,id:"different"})).rejects.toThrow(/pending/);
  await expect(actions.archiveHabit(h,false)).rejects.toThrow(/pending/);
  vi.mocked(data.recordHabitProgress).mockResolvedValueOnce({habit_id:h.id,completed_on:request.date,amount:1,target:8});
  await actions.recordHabit(h,request);
  expect(state.failedHabitRequests).toEqual({}); expect(state.habits[0].days[request.date].amount).toBe(1);
});
it("keeps a successful update when an older background load finishes",async() => {
  let resolve!:(habits:Habit[]) => void;
  vi.mocked(data.fetchHabits).mockImplementationOnce(() => new Promise((r) => {resolve=r;}));
  vi.mocked(data.recordHabitProgress).mockResolvedValueOnce({habit_id:h.id,completed_on:request.date,amount:8,target:8});
  const dispatch=vi.fn();const actions=createHabitActions(dispatch,vi.fn());const load=actions.loadHabits();
  await vi.waitFor(() => expect(data.fetchHabits).toHaveBeenCalled());
  await actions.recordHabit(h,request); resolve([h]); await load;
  expect(dispatch).toHaveBeenLastCalledWith(expect.objectContaining({type:"habits/loaded",habits:[expect.objectContaining({checkIns:[request.date]})]}));
});
it("does not change a habit or show success after an edit failure",async() => {
  vi.mocked(data.updateHabit).mockRejectedValueOnce(new TaskDataError("Offline"));
  const dispatch=vi.fn(),notify=vi.fn();
  await expect(createHabitActions(dispatch,notify).editHabit(h,{...h,streakEnabled:false})).rejects.toThrow("Offline");
  expect(dispatch.mock.calls.some(([a]) => a.type === "habits/saved")).toBe(false);expect(notify).not.toHaveBeenCalled();
});
it("lets the user correct a definitively rejected update instead of locking them into retry",async() => {
  let state={...initialHabitState,habits:[h]};
  const dispatch=(a:HabitAction) => {state=reduceHabits(state,a);};
  const actions=createHabitActions(dispatch,vi.fn());
  vi.mocked(data.recordHabitProgress).mockRejectedValueOnce(new TaskDataError("Choose a valid date",{code:"22023"}));
  await expect(actions.recordHabit(h,request)).rejects.toThrow(/date/);
  expect(state.failedHabitRequests[h.id].request).toBeUndefined();
  vi.mocked(data.recordHabitProgress).mockResolvedValueOnce({habit_id:h.id,completed_on:request.date,amount:2,target:8});
  await actions.recordHabit(h,{...request,id:"corrected",value:2});
  expect(state.habits[0].days[request.date].amount).toBe(2);
});
