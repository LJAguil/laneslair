import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState } from "./store/app-store";
import { defaultPreferences, type DailyPreferences } from "./daily-preferences";
const fake = vi.hoisted(() => ({ state: {} as AppState, prefs: {} as DailyPreferences, ready: true, durable: true, download: vi.fn() }));
vi.mock("@/lib/store/app-store", () => ({ useAppState: () => fake.state, useAppActions: () => ({ loadTasks: vi.fn(), loadProjects: vi.fn(), loadHabits: vi.fn() }) }));
vi.mock("@/components/today/daily-preferences-provider", () => ({ useDailyPreferences: () => ({ value: fake.prefs, ready: fake.ready, durable: fake.durable, update: vi.fn() }) }));
vi.mock("@/components/inbox/capture-draft-provider", () => ({ useCaptureDrafts: () => ({ store: { getSnapshot: vi.fn() }, snapshot: { ready: true, accountId: "invented", epoch: 1, needsReload: false } }) }));
vi.mock("@/components/shell/shell-context", () => ({ useShell: () => ({ openQuickAdd: vi.fn(), openNewTask: vi.fn() }) }));
vi.mock("@/components/reminders/reminder-button", () => ({ ReminderButton: () => null }));
vi.mock("@/components/reminders/use-reminder-draft", () => ({ useReminderDraft: () => ({ value: { enabled: false }, status: "ready" }) }));
vi.mock("@/components/reminders/reminder-fields", () => ({ ReminderFields: () => null }));
vi.mock("@/lib/data/export", () => ({ fetchExport: fake.download }));
vi.mock("@/components/inbox/capture-form", () => ({ CaptureForm: () => createElement("p", null, "Existing capture form") }));
vi.mock("@/components/dashboard/dashboard-cards", () => ({ HabitsCard: () => createElement("p", null, "Existing habit card") }));
vi.mock("@/components/today/upcoming-reminders", () => ({ UpcomingReminders: () => createElement("p", null, "Existing reminders") }));
vi.mock("@/components/play/featured-puzzle-card", () => ({ FeaturedPuzzleCard: () => createElement("p", null, "Existing puzzle") }));
import { TodayView } from "@/components/today/today-view";
import { WeeklyReviewView } from "@/components/review/weekly-review-view";
import { DataExport } from "@/components/settings/data-export";
import { NoticeMessage } from "@/components/shell/notice-message";
beforeEach(() => {
  vi.clearAllMocks(); fake.prefs = defaultPreferences("2026-11-26"); fake.ready = true; fake.durable = true;
  fake.state = { today: "2026-11-26", now: Date.parse("2026-11-26T18:00Z"), tasks: [{ id: "task", title: "Invented optional task", notes: "Invented task notes", status: "todo", priority: "high", createdAt: "2026-11-26", projectId: "project" }], projects: [{ id: "project", name: "Invented project", status: "active", color: "violet", description: "Invented project notes" }], habits: [], inboxNotes: [], journalSources: [], focus: null, tasksStatus: "ready", projectsStatus: "ready", habitsStatus: "ready", inboxStatus: "ready", journalIndexStatus: "ready", focusStatus: "ready", savingFocus: false, pendingTaskIds: [], pendingProjectIds: [], pendingHabitIds: [] } as unknown as AppState;
});
describe("rendered daily tools, invented records only", () => {
  it("shows focus, optional planning, wrap-up and browser-local customization", () => {
    const html = renderToStaticMarkup(createElement(TodayView));
    expect(html).toContain("Choose today’s focus"); expect(html).toContain("Up to two optional tasks"); expect(html).toContain("Close out the day");
    expect(html).toContain("Customize Today"); expect(html).toContain("browser for this account");
    expect(html).toContain("/journal?date=2026-11-26"); expect(html).toContain("/review"); expect(html).not.toContain("Invented task notes");
  });
  it("hides selected sections while retaining focus, planning and layout reset", () => {
    fake.prefs.hidden = ["capture", "habits", "reminders", "radar", "play", "wrap"]; fake.prefs.shortcuts = [];
    const html = renderToStaticMarkup(createElement(TodayView));
    expect(html).not.toContain("Existing capture form"); expect(html).not.toContain("Existing habit card"); expect(html).not.toContain("Existing puzzle"); expect(html).not.toContain("Close out the day");
    expect(html).toContain("Your next move"); expect(html).toContain("A little room for more"); expect(html).toContain("Reset layout");
  });
  it("renders a useful weekly review and keeps unavailable data distinct from empty records", () => {
    let html = renderToStaticMarkup(createElement(WeeklyReviewView));
    expect(html).toContain("Unfinished work"); expect(html).toContain("Projects to revisit"); expect(html).toContain("Invented project"); expect(html).toContain("Habit trends"); expect(html).toContain("Up to three priorities");
    fake.state.tasksStatus = "error"; fake.state.tasksError = "Invented task load failure"; fake.state.habitsStatus = "error"; fake.state.inboxStatus = "error";
    html = renderToStaticMarkup(createElement(WeeklyReviewView));
    expect(html).toContain("Invented task load failure"); expect(html).not.toContain("No unfinished tasks"); expect(html).toContain("Habits haven’t loaded successfully"); expect(html).not.toContain("0 unsorted captures");
  });
  it("makes export private-text choices explicit, unchecked and read-free on mount", () => {
    const html = renderToStaticMarkup(createElement(DataExport));
    expect(html).toContain("Download selected data"); expect(html).toContain("habit logs"); expect(html).toContain("Files are unencrypted"); expect(html).not.toContain('type="checkbox" checked'); expect(html).not.toContain("Invented task notes"); expect(fake.download).not.toHaveBeenCalled();
  });
  it("keeps Undo accessible with a phone-sized control", () => {
    const html = renderToStaticMarkup(createElement(NoticeMessage, { notice: { id: 1, kind: "success", message: "Invented saved action", undo: { expiresAt: 15000, run: async () => {} } }, dismiss: vi.fn() }));
    expect(html).toContain("Undo"); expect(html).toContain("min-h-11"); expect(html).toContain("Dismiss message");
  });
});
