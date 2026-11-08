import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState } from "@/lib/store/app-store";
const mock=vi.hoisted(()=>({state:{} as AppState,load:vi.fn(),record:vi.fn(),create:vi.fn()}));
vi.mock("@/lib/store/app-store",()=>({useAppState:()=>mock.state,useAppActions:()=>({loadHabits:mock.load,recordHabit:mock.record,addHabit:mock.create})}));
vi.mock("@/components/reminders/reminder-provider",()=>({useItemReminder:()=>({rule:undefined})}));
import { HabitCalendar } from "@/components/habits/habit-calendar";
import { HabitsView } from "@/components/habits/habits-view";
beforeEach(()=>{
  vi.clearAllMocks();mock.state={today:"2026-11-08",habitsStatus:"ready",habitsError:null,habits:[{id:"water",name:"Water",description:"",frequency:"daily",targetPerWeek:7,trackingType:"quantity",dailyTarget:10,unit:"glasses",streakEnabled:false,isActive:true,color:"blue",createdAt:"2026-11-01T12:00:00Z",days:{"2026-11-08":{amount:8,target:8}},checkIns:["2026-11-08"]}],goals:[],pendingHabitIds:[],failedHabitRequests:{}} as unknown as AppState;
});
describe("habit calendar markup (simulated, not physical keyboard/touch)",()=>{
  it("renders an accessible six-week grid, labelled filters, date input and keyboard instructions",()=>{
    const html=renderToStaticMarkup(createElement(HabitCalendar));expect(html).toContain('role="grid"');expect((html.match(/role="gridcell"/g)??[])).toHaveLength(42);
    expect((html.match(/tabindex="0"/g)??[])).toHaveLength(1);expect(html).toContain("Include archived habits");expect(html).toContain("Jump to date");expect(html).toContain("Page Up/Down");expect(html).toContain('aria-selected="true"');
  });
  it("shows saved quantities and target snapshots rather than current targets",()=>{
    const html=renderToStaticMarkup(createElement(HabitCalendar));expect(html).toContain("8 glasses");expect(html).toContain("saved target");expect(html).not.toContain("10 glasses");expect(html).toContain('role="progressbar"');
  });
  it("names every state beyond color and explains the limits of missing history",()=>{
    const html=renderToStaticMarkup(createElement(HabitCalendar));for(const label of ["Target reached","Partial progress","Zero recorded","No log","Future date","Before creation"])expect(html).toContain(label);
    expect(html).toContain("blank dates aren’t failures");expect(html).toContain("does not tell us exactly when a habit was paused");
  });
  it("does not render an empty calendar on loading or failed reads",()=>{
    mock.state.habitsStatus="loading";let html=renderToStaticMarkup(createElement(HabitCalendar));expect(html).toContain('role="status"');expect(html).not.toContain('role="grid"');
    mock.state.habitsStatus="error";mock.state.habitsError="History unavailable";html=renderToStaticMarkup(createElement(HabitCalendar));expect(html).toContain("History unavailable");expect(html).toContain("Retry habit history");expect(html).not.toContain("No habits yet");
  });
  it("shows distinct empty and archived-only explanations",()=>{
    mock.state.habits=[];expect(renderToStaticMarkup(createElement(HabitCalendar))).toContain("No habits yet");
    mock.state.habits=[{id:"old",isActive:false}] as AppState["habits"];expect(renderToStaticMarkup(createElement(HabitCalendar))).toContain("Include archived habits to view their records");
  });
  it("preserves the existing default list, quantity controls, reminder actions and single New habit entry point",()=>{
    const html=renderToStaticMarkup(createElement(HabitsView));expect((html.match(/New habit/g)??[])).toHaveLength(1);expect(html).toContain("Calendar");expect(html).toContain("Your habits");expect(html).toContain("Amount (glasses)");expect(html).toContain("Set reminder for");
    expect(mock.record).not.toHaveBeenCalled();expect(mock.create).not.toHaveBeenCalled();expect(mock.load).not.toHaveBeenCalled();
  });
});
