"use client";

// A small client-side store built on React context + useReducer.
// Every mutation goes through `actions`, so components never talk to the
// database directly.
//
// Tasks, projects, habits, Inbox, daily focus, and Journal (after migration 004) persist in Supabase. Everything else
// (goals, events, schedule, notifications, chats) is still
// local sample data that resets on a full page reload.

import { createContext, useContext, useEffect, useMemo, useReducer, useSyncExternalStore, type ReactNode } from "react";
import { createHabitActions, initialHabitState, reduceHabits, type HabitAction, type HabitSlice } from "./habit-state";
import { mergeTaskRead, type TaskWrite } from "./task-read";
import { createInboxActions, initialInboxState, reduceInbox, type InboxAction, type InboxSlice } from "./inbox-state";
import { createJournalActions, initialJournalState, reduceJournal, type JournalAction, type JournalSlice } from "./journal-state";
import * as taskData from "@/lib/data/tasks";
import { localToday, timestampToLocalDateTime } from "@/lib/dates";
import { sampleEvents } from "@/lib/sample-data/events";
import { sampleGoals } from "@/lib/sample-data/habits-goals";
import { sampleConversations, sampleNotifications, sampleProfile, sampleSchedule } from "@/lib/sample-data/misc";
import * as projectData from "@/lib/data/projects";
import type {
  AppNotification,
  ChatMessage,
  Conversation,
  Goal,
  ISODate,
  LocalEvent,
  NewTaskInput,
  Project,
  ScheduleItem,
  Task,
  UserProfile,
} from "@/lib/types";

export type LoadStatus = "loading" | "ready" | "error";

export interface Notice {
  id: number;
  kind: "success" | "error";
  message: string;
}

export interface AppState extends InboxSlice, HabitSlice, JournalSlice {
  /** The user's local calendar day, read once in the browser. */
  today: ISODate;
  tasks: Task[];
  tasksStatus: LoadStatus;
  tasksError: string | null;
  /** Tasks with a save in flight; their controls are disabled meanwhile. */
  pendingTaskIds: string[];
  /** Latest toast message (success or error). */
  notice: Notice | null;
  projects: Project[];
  projectsStatus: LoadStatus;
  projectsError: string | null;
  pendingProjectIds: string[];
  goals: Goal[];
  events: LocalEvent[];
  schedule: ScheduleItem[];
  notifications: AppNotification[];
  conversations: Conversation[];
  profile: UserProfile;
}

function createInitialState(today: ISODate): AppState {
  return {
    ...initialInboxState,
    ...initialJournalState,
    ...initialHabitState,
    today,
    tasks: [],
    tasksStatus: "loading",
    tasksError: null,
    pendingTaskIds: [],
    notice: null,
    projects: [],
    projectsStatus: "loading",
    projectsError: null,
    pendingProjectIds: [],
    goals: sampleGoals(today),
    events: sampleEvents(today),
    schedule: sampleSchedule(today),
    notifications: sampleNotifications(today),
    conversations: sampleConversations,
    profile: sampleProfile,
  };
}

type Action = InboxAction | HabitAction | JournalAction
  | { type: "projects/loading" }
  | { type: "projects/loaded"; projects: Project[] }
  | { type: "projects/failed"; message: string }
  | { type: "project/saved"; project: Project }
  | { type: "project/pending"; id: string; pending: boolean }
  | { type: "tasks/loading" }
  | { type: "tasks/loaded"; tasks: Task[] }
  | { type: "tasks/failed"; message: string }
  | { type: "task/add"; task: Task }
  | { type: "task/replace"; task: Task }
  | { type: "task/remove"; id: string }
  | { type: "task/pending"; id: string; pending: boolean }
  | { type: "notice/show"; notice: Notice }
  | { type: "notice/dismiss"; id: number }
  | { type: "event/toggleSaved"; id: string }
  | { type: "notification/read"; id: string }
  | { type: "notification/readAll" }
  | { type: "chat/new"; conversation: Conversation }
  | { type: "chat/add"; conversationId: string; message: ChatMessage }
  | { type: "profile/update"; profile: Partial<UserProfile> };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "journal/index-loading":case "journal/index-error":case "journal/index":case "journal/day-loading":case "journal/day-error":case "journal/entry":case "journal/source":case "journal/draft":case "journal/reset":case "journal/merge":case "journal/pending":case "journal/note-pending":
      return {...state,...reduceJournal(state,action)};
    case "habits/loading": case "habits/loaded": case "habits/failed": case "habits/saved": case "habits/pending": case "habits/log-failed": case "habits/log-confirmed":
      return { ...state, ...reduceHabits(state, action) };
    case "inbox/loading": case "inbox/loaded": case "inbox/failed": case "inbox/saved": case "inbox/pending":
    case "focus/loading": case "focus/loaded": case "focus/failed": case "focus/saving":
      return { ...state, ...reduceInbox(state, action) };
    case "projects/loading":
      return { ...state, projectsStatus: "loading", projectsError: null };
    case "projects/loaded":
      return { ...state, projects: action.projects, projectsStatus: "ready", projectsError: null };
    case "projects/failed":
      return { ...state, projectsStatus: "error", projectsError: action.message };
    case "project/saved":
      return { ...state, projects: state.projects.some((p) => p.id === action.project.id)
        ? state.projects.map((p) => p.id === action.project.id ? action.project : p)
        : [action.project, ...state.projects] };
    case "project/pending":
      return { ...state, pendingProjectIds: action.pending
        ? [...state.pendingProjectIds, action.id]
        : state.pendingProjectIds.filter((id) => id !== action.id) };
    case "tasks/loading":
      return { ...state, tasksStatus: "loading", tasksError: null };
    case "tasks/loaded":
      return { ...state, tasks: action.tasks, tasksStatus: "ready", tasksError: null };
    case "tasks/failed":
      return { ...state, tasksStatus: "error", tasksError: action.message };
    case "task/add":
      return { ...state, tasks: [action.task, ...state.tasks.filter((t) => t.id !== action.task.id)] };
    case "task/replace":
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.task.id ? action.task : t)) };
    case "task/remove":
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id), focus: state.focus?.taskId === action.id ? { ...state.focus, taskId: null } : state.focus };
    case "task/pending":
      return {
        ...state,
        pendingTaskIds: action.pending
          ? [...state.pendingTaskIds, action.id]
          : state.pendingTaskIds.filter((id) => id !== action.id),
      };
    case "notice/show":
      return { ...state, notice: action.notice };
    case "notice/dismiss":
      return state.notice?.id === action.id ? { ...state, notice: null } : state;
    case "event/toggleSaved":
      return {
        ...state,
        events: state.events.map((e) => (e.id === action.id ? { ...e, saved: !e.saved } : e)),
      };
    case "notification/read":
      return {
        ...state,
        notifications: state.notifications.map((n) => (n.id === action.id ? { ...n, read: true } : n)),
      };
    case "notification/readAll":
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) };
    case "chat/new":
      return { ...state, conversations: [action.conversation, ...state.conversations] };
    case "chat/add":
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.conversationId ? { ...c, messages: [...c.messages, action.message] } : c,
        ),
      };
    case "profile/update":
      return { ...state, profile: { ...state.profile, ...action.profile } };
  }
}

const messageOf = (err: unknown) =>
  err instanceof taskData.TaskDataError ? err.message : "Something went wrong. Please try again.";

function createActions(dispatch: React.Dispatch<Action>) {
  let noticeId = 0;
  let loadSeq = 0;
  let taskRevision = 0;
  const taskWrites = new Map<string, TaskWrite>();
  let projectLoadSeq = 0;
  const projectInFlight = new Set<string>();
  // Ids with a save in flight, tracked here too so a double-click can't race
  // ahead of the next render.
  const inFlight = new Set<string>();

  const notify = (kind: Notice["kind"], message: string) =>
    dispatch({ type: "notice/show", notice: { id: ++noticeId, kind, message } });

  async function withPending<T>(id: string, work: () => Promise<T>): Promise<T> {
    inFlight.add(id);
    dispatch({ type: "task/pending", id, pending: true });
    try {
      return await work();
    } finally {
      inFlight.delete(id);
      dispatch({ type: "task/pending", id, pending: false });
    }
  }

  const recordTaskAction = (action: Extract<Action, { type: "task/add" | "task/replace" | "task/remove" }>) => {
    const task = action.type === "task/remove" ? null : action.task;
    const id = action.type === "task/remove" ? action.id : action.task.id;
    taskWrites.set(id, { revision: ++taskRevision, task });
    dispatch(action);
  };

  return {
    ...createJournalActions(dispatch,notify),
    ...createHabitActions(dispatch, notify),
    ...createInboxActions((action) => {
      if (action.type === "task/add") recordTaskAction(action);
      else dispatch(action);
    }, notify),
    async loadProjects({ showLoading = true }: { showLoading?: boolean } = {}) {
      const seq = ++projectLoadSeq;
      if (showLoading) dispatch({ type: "projects/loading" });
      try {
        const userId = await taskData.getVerifiedUserId();
        const projects = await projectData.fetchProjects(userId);
        if (seq === projectLoadSeq) dispatch({ type: "projects/loaded", projects });
      } catch (err) {
        if (seq === projectLoadSeq) dispatch({ type: "projects/failed", message: messageOf(err) });
      }
    },
    async addProject(input: projectData.ProjectInput) {
      const userId = await taskData.getVerifiedUserId();
      const project = await projectData.createProject(userId, input);
      dispatch({ type: "project/saved", project });
      notify("success", `Created “${project.name}”`);
    },
    async editProject(project: Project, input: projectData.ProjectInput) {
      if (projectInFlight.has(project.id)) throw new taskData.TaskDataError("This project is still saving. Try again in a moment.");
      projectInFlight.add(project.id);
      dispatch({ type: "project/pending", id: project.id, pending: true });
      try {
        const userId = await taskData.getVerifiedUserId();
        const saved = await projectData.updateProject(userId, project.id, input);
        dispatch({ type: "project/saved", project: saved });
        notify("success", `Saved changes to “${saved.name}”`);
      } finally {
        projectInFlight.delete(project.id);
        dispatch({ type: "project/pending", id: project.id, pending: false });
      }
    },
    /**
     * Loads the signed-in user's tasks. The session is verified first because
     * RLS returns an empty list (not an error) to a signed-out request, and an
     * expired session must not look like "you have no tasks".
     */
    async loadTasks({ showLoading = true }: { showLoading?: boolean } = {}) {
      const seq = ++loadSeq;
      const startedAt = taskRevision;
      if (showLoading) dispatch({ type: "tasks/loading" });
      try {
        await taskData.getVerifiedUserId();
        const tasks = await taskData.fetchTasks();
        if (seq === loadSeq) dispatch({ type: "tasks/loaded", tasks: mergeTaskRead(tasks, taskWrites, startedAt) });
      } catch (err) {
        if (seq === loadSeq) dispatch({ type: "tasks/failed", message: messageOf(err) });
      }
    },
    /** Saves a new task. Throws a TaskDataError (shown by the form) if saving fails. */
    async addTask(input: NewTaskInput) {
      const userId = await taskData.getVerifiedUserId();
      const task = await taskData.createTask(userId, input);
      recordTaskAction({ type: "task/add", task });
      return task;
    },
    /**
     * Saves edits to an existing task (by its id — never creates a new one).
     * Waits for the database, then updates the list. Throws a TaskDataError
     * (shown by the form, which stays open with the user's input) on failure.
     * Returns false if nothing changed, so no request is made.
     */
    async editTask(task: Task, changes: taskData.TaskChanges): Promise<boolean> {
      if (inFlight.has(task.id)) throw new taskData.TaskDataError("This task is still saving. Try again in a moment.");
      const update = taskData.buildTaskUpdate(task, changes);
      if (Object.keys(update).length === 1) return false; // only updated_at — no real change
      return withPending(task.id, async () => {
        const userId = await taskData.getVerifiedUserId();
        const saved = await taskData.updateTask(userId, task, changes);
        recordTaskAction({ type: "task/replace", task: saved });
        notify("success", `Saved changes to “${saved.title}”`);
        return true;
      });
    },
    /** Completes an open task or reopens a finished one. Updates instantly, reverts if the save fails. */
    async toggleTask(task: Task) {
      if (inFlight.has(task.id)) return;
      const nextStatus = task.status === "done" ? "todo" : "done";
      recordTaskAction({
        type: "task/replace",
        task: {
          ...task,
          status: nextStatus,
          completedAt: nextStatus === "done" ? timestampToLocalDateTime(new Date().toISOString()) : undefined,
        },
      });
      await withPending(task.id, async () => {
        try {
          const userId = await taskData.getVerifiedUserId();
          recordTaskAction({ type: "task/replace", task: await taskData.updateTaskStatus(userId, task.id, nextStatus) });
        } catch (err) {
          recordTaskAction({ type: "task/replace", task }); // restore exactly what was there before
          notify("error", messageOf(err));
        }
      });
    },
    /** Deletes a task after the database confirms it. Returns false (and shows an error) on failure. */
    async deleteTask(task: Task): Promise<boolean> {
      if (inFlight.has(task.id)) return false;
      return withPending(task.id, async () => {
        try {
          const userId = await taskData.getVerifiedUserId();
          await taskData.deleteTask(userId, task.id);
          recordTaskAction({ type: "task/remove", id: task.id });
          notify("success", `Deleted “${task.title}”`);
          return true;
        } catch (err) {
          notify("error", messageOf(err));
          return false;
        }
      });
    },
    notify,
    dismissNotice(id: number) {
      dispatch({ type: "notice/dismiss", id });
    },
    toggleEventSaved(id: string) {
      dispatch({ type: "event/toggleSaved", id });
    },
    markNotificationRead(id: string) {
      dispatch({ type: "notification/read", id });
    },
    markAllNotificationsRead() {
      dispatch({ type: "notification/readAll" });
    },
    /** Creates an empty conversation and returns its id. */
    newConversation(title = "New chat"): string {
      const id = crypto.randomUUID();
      dispatch({ type: "chat/new", conversation: { id, title, messages: [] } });
      return id;
    },
    addChatMessage(conversationId: string, role: ChatMessage["role"], content: string) {
      dispatch({ type: "chat/add", conversationId, message: { id: crypto.randomUUID(), role, content } });
    },
    updateProfile(profile: Partial<UserProfile>) {
      dispatch({ type: "profile/update", profile });
    },
  };
}

export type AppActions = ReturnType<typeof createActions>;

const StateContext = createContext<AppState | null>(null);
const ActionsContext = createContext<AppActions | null>(null);

// The local date is only known in the browser. On the server (and during the
// first hydration pass) this returns null, so nothing date-dependent is
// prerendered or cached, and the server and client HTML always match.
function subscribeDay(onChange: () => void) {
  const timer = window.setInterval(onChange, 60000);
  window.addEventListener("focus",onChange);
  document.addEventListener("visibilitychange",onChange);
  return () => { clearInterval(timer); window.removeEventListener("focus",onChange); document.removeEventListener("visibilitychange",onChange); };
}
const getServerToday = () => null;

/**
 * Provides app state to the signed-in app. Renders `fallback` until the
 * browser's local date is known (one quick pass after hydration).
 */
export function AppStoreProvider({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const today = useSyncExternalStore(subscribeDay, localToday, getServerToday);
  if (!today) return fallback;
  return <StoreProvider today={today}>{children}</StoreProvider>;
}

function StoreProvider({ today, children }: { today: ISODate; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, today, createInitialState);
  const actions = useMemo(() => createActions(dispatch), [dispatch]);

  useEffect(() => {
    // Initial state is already "loading", so no extra loading dispatch here.
    void actions.loadTasks({ showLoading: false });
    void actions.loadProjects({ showLoading: false });
    void actions.loadInbox({ showLoading: false });
    void actions.loadFocus({ showLoading: false });
    void actions.loadHabits({ showLoading: false });
    void actions.loadJournalIndex({ showLoading: false });
  }, [actions]);

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={{ ...state, today }}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}

export function useAppState(): AppState {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error("useAppState must be used inside <AppStoreProvider>");
  return ctx;
}

export function useAppActions(): AppActions {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error("useAppActions must be used inside <AppStoreProvider>");
  return ctx;
}
