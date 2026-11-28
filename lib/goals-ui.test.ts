import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import type { AppState } from "@/lib/store/app-store";
import { initialGoalState } from "@/lib/store/goal-state";
const mock = vi.hoisted(() => ({ state: {} as AppState }));
vi.mock("@/lib/store/app-store", () => ({ useAppState: () => mock.state, useAppActions: () => ({}) }));
import { GoalsSection } from "@/components/habits/goals-section";
import { GoalsCard } from "@/components/dashboard/dashboard-cards";
import { GoalFormDialog } from "@/components/habits/goal-form-dialog";
beforeEach(() => { mock.state = { ...initialGoalState, goalsStatus: "ready", goals: [] } as unknown as AppState; });
it("shows personal empty states without sample goals", () => {
  const html = renderToStaticMarkup(createElement(GoalsSection));
  expect(html).toContain("New goal"); expect(html).toContain("Give yourself something to work toward"); expect(html).not.toContain("Sample goals");
  expect(renderToStaticMarkup(createElement(GoalsCard))).toContain("Choose your next milestone");
});
it("shows loading and retry states instead of an empty account", () => {
  mock.state.goalsStatus = "loading";
  expect(renderToStaticMarkup(createElement(GoalsSection))).toContain("Loading your goals");
  mock.state.goalsStatus = "error"; mock.state.goalsError = "Connection failed";
  const html = renderToStaticMarkup(createElement(GoalsCard));
  expect(html).toContain("Connection failed"); expect(html).toContain("Retry goals"); expect(html).not.toContain("Choose your next milestone");
});
it("shows only active goals on Overview and exposes editing on Habits & Goals", () => {
  const goal = { id: "read", title: "Read books", unit: "books", current: 2, target: 12, status: "active" as const, color: "blue" as const };
  mock.state.goals = [goal, { ...goal, id: "done", title: "Finished goal", status: "completed" }];
  const card = renderToStaticMarkup(createElement(GoalsCard));
  expect(card).toContain("Read books"); expect(card).not.toContain("Finished goal");
  const section = renderToStaticMarkup(createElement(GoalsSection));
  expect(section).toContain("Update progress"); expect(section).toContain("Delete"); expect(section).toContain("Goal status");
});
it("labels goal inputs and uses a total rather than an additive progress action", () => {
  const html = renderToStaticMarkup(createElement(GoalFormDialog, { open: true, onClose: () => {} }));
  for (const label of ["Goal", "Target", "Unit", "Current progress", "Target date", "Status", "Create goal"]) expect(html).toContain(label);
  expect(html).toContain('type="number"'); expect(html).toContain('type="date"');
});
