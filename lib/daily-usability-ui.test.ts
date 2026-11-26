import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCaptureDrafts, type CaptureDraftStore } from "./store/capture-drafts";
import type { Project, Task } from "./types";
const fake = vi.hoisted(() => ({ state: {} as Record<string, unknown>, drafts: null as CaptureDraftStore | null }));
vi.mock("@/lib/store/app-store", () => ({ useAppState: () => fake.state, useAppActions: () => ({ notify: vi.fn(), loadProjects: vi.fn(), loadTasks: vi.fn() }) }));
vi.mock("@/components/inbox/capture-draft-provider", () => ({ useCaptureDrafts: () => ({ store: fake.drafts!, snapshot: fake.drafts!.getSnapshot() }) }));
vi.mock("@/components/reminders/use-reminder-draft", () => ({ useReminderDraft: () => ({ value: { enabled: false }, preferences: {}, status: "ready" }) }));
vi.mock("@/components/reminders/reminder-fields", () => ({ ReminderFields: () => null }));
vi.mock("@/components/reminders/reminder-button", () => ({ ReminderButton: () => null }));
import { CaptureForm } from "@/components/inbox/capture-form";
import { ProjectDetailView } from "@/components/projects/project-detail-view";
import { ProjectCard } from "@/components/projects/project-card";
import { TaskRescheduleForm } from "@/components/tasks/task-reschedule";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
const project: Project = { id: "11111111-1111-4111-8111-111111111111", name: "Invented project", description: "Invented project notes", status: "active", color: "violet" };
const task: Task = { id: "invented-task", title: "Invented next action", projectId: project.id, status: "todo", priority: "high", createdAt: "2026-11-26T09:00:00", dueDate: "2026-11-27", dueTime: "15:30", notes: "Invented task notes" };
beforeEach(() => {
  fake.state = { today: "2026-11-26", now: Date.parse("2026-11-26T12:00:00Z"), tasks: [task], tasksStatus: "ready", projects: [project], projectsStatus: "ready", pendingTaskIds: [], pendingProjectIds: [] };
  fake.drafts = createCaptureDrafts(async () => {}, () => ({ message: "Invented failure", conflict: false }));
  fake.drafts.setAccount("invented-account");
});
describe("daily usability (synthetic rendering)", () => {
  it("shows shared unsaved and confirmed capture states without introducing browser persistence", async () => {
    const store = fake.drafts!, epoch = store.getSnapshot().epoch;
    store.change("new", "Invented capture draft", "", epoch);
    let html = renderToStaticMarkup(createElement(CaptureForm));
    expect(html).toContain("Invented capture draft"); expect(html).toContain("Unsaved draft"); expect(html).toContain("Discard draft");
    expect(html).toContain("app memory only"); expect(html).toContain('enterKeyHint="enter"');
    await store.save("new", "", epoch);
    html = renderToStaticMarkup(createElement(CaptureForm));
    expect(html).toContain("Saved to Inbox."); expect(html).not.toContain("Invented capture draft");
  });
  it("hides capture text while its account is unavailable", () => {
    fake.drafts!.setAccount(null);
    const html = renderToStaticMarkup(createElement(CaptureForm, { note: { id: "note", body: "Invented old account text", createdAt: "2026-11-26", updatedAt: "2026-11-26" } }));
    expect(html).not.toContain("Invented old account text"); expect(html).toContain("Sign in again"); expect(html).toContain("disabled");
  });
  it("puts notes, owned linked tasks and a real next action together, excluding unrelated tasks", () => {
    fake.state.tasks = [task, { ...task, id: "done", title: "Invented completed task", status: "done" }, { ...task, id: "cancelled", title: "Invented cancelled task", status: "cancelled" }, { ...task, id: "unrelated", title: "Unrelated invented task", projectId: "other" }];
    const html = renderToStaticMarkup(createElement(ProjectDetailView, { projectId: project.id }));
    expect(html).toContain("Invented project notes"); expect(html).toContain("Invented next action"); expect(html).toContain("1 of 2 tasks complete");
    expect(html).not.toContain("Unrelated invented task"); expect(html).toContain("Move due date for");
    expect(renderToStaticMarkup(createElement(ProjectCard, { project, progress: { done: 0, total: 0, percent: 0 } }))).toContain(`href="/projects/${project.id}"`);
  });
  it("keeps load errors distinct from empty/completed projects and supports archived/missing projects", () => {
    fake.state.tasksStatus = "error";
    let html = renderToStaticMarkup(createElement(ProjectDetailView, { projectId: project.id }));
    expect(html).toContain("Task progress is unavailable"); expect(html).not.toContain("No open tasks left");
    fake.state.projects = [{ ...project, status: "archived" }];
    html = renderToStaticMarkup(createElement(ProjectDetailView, { projectId: project.id }));
    expect(html).toContain("Restore this project before adding");
    fake.state.projects = [];
    expect(renderToStaticMarkup(createElement(ProjectDetailView, { projectId: project.id }))).toContain("Project unavailable");
    fake.state.projectsStatus = "loading";
    expect(renderToStaticMarkup(createElement(ProjectDetailView, { projectId: project.id }))).not.toContain("Project unavailable");
  });
  it("offers quick date choices with time preservation and preselects projects for new tasks", () => {
    const html = renderToStaticMarkup(createElement(TaskRescheduleForm, { task, onSaving: () => {}, onSaved: () => {} }));
    expect(html).toContain("Tomorrow"); expect(html).toContain("Next week"); expect(html).toContain("3:30 PM"); expect(html).toContain("reminders are separate");
    expect(html).not.toContain("Invented task notes"); expect(html).not.toContain('type="time"');
    const form = renderToStaticMarkup(createElement(TaskFormDialog, { open: true, onClose: () => {}, defaultProjectId: project.id }));
    expect(form).toContain(`value="${project.id}" selected=""`);
  });
});
