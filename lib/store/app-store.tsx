"use client";

// A small client-side store built on React context + useReducer.
// Every mutation goes through `actions`, so components never talk to the
// database directly.
//
// Tasks are persisted in Supabase (lib/data/tasks.ts). Everything else
// (projects, habits, goals, events, schedule, notifications, chats) is still
// local sample data that resets on a full page reload.

import { createContext, useContext, useEffect, useMemo, useReducer, useSyncExternalStore, type ReactNode } from "react";
import * as taskData from "@/lib/data/tasks";
import { localToday, timestampToLocalDateTime } from "@/lib/dates";
import { sampleEvents } from "@/lib/sample-data/events";
import { sampleGoals, sampleHabits } from "@/lib/sample-data/habits-goals";
import { sampleConversations, sampleNotifications, sampleProfile, sampleSchedule } from "@/lib/sample-data/misc";
import { sampleProjects } from "@/lib/sample-data/projects";
import type {
  AppNotification,
  ChatMessage,
  Conversation,
  Goal,
  Habit,
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

export interface AppState {
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
  habits: Habit[];
  goals: Goal[];
  events: LocalEvent[];
  schedule: ScheduleItem[];
  notifications: AppNotification[];
  conversations: Conversation[];
  profile: UserProfile;
}

function createInitialState(today: ISODate): AppState {
  return {
    today,
    tasks: [],
    tasksStatus: "loading",
    tasksError: null,
    pendingTaskIds: [],
    notice: null,
    projects: sampleProjects(today),
    habits: sampleHabits(today),
    goals: sampleGoals(today),
    events: sampleEvents(today),
    schedule: sampleSchedule(today),
    notifications: sampleNotifications(today),
    conversations: sampleConversations,
    profile: sampleProfile,
  };
}

type Action =
  | { type: "tasks/loading" }
  | { type: "tasks/loaded"; tasks: Task[] }
  | { type: "tasks/failed"; message: string }
  | { type: "task/add"; task: Task }
  | { type: "task/replace"; task: Task }
  | { type: "task/remove"; id: string }
  | { type: "task/pending"; id: string; pending: boolean }
  | { type: "notice/show"; notice: Notice }
  | { type: "notice/dismiss"; id: number }
  | { type: "habit/toggle"; id: string; date: ISODate }
  | { type: "event/toggleSaved"; id: string }
  | { type: "notification/read"; id: string }
  | { type: "notification/readAll" }
  | { type: "chat/new"; conversation: Conversation }
  | { type: "chat/add"; conversationId: string; message: ChatMessage }
  | { type: "profile/update"; profile: Partial<UserProfile> };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
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
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
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
    case "habit/toggle":
      return {
        ...state,
        habits: state.habits.map((h) =>
          h.id !== action.id
            ? h
            : {
                ...h,
                checkIns: h.checkIns.includes(action.date)
                  ? h.checkIns.filter((d) => d !== action.date)
                  : [...h.checkIns, action.date],
              },
        ),
      };
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

function createActions(dispatch: React.Dispatch<Action>, today: ISODate) {
  let noticeId = 0;
  let loadSeq = 0;
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

  return {
    /**
     * Loads the signed-in user's tasks. The session is verified first because
     * RLS returns an empty list (not an error) to a signed-out request, and an
     * expired session must not look like "you have no tasks".
     */
    async loadTasks({ showLoading = true }: { showLoading?: boolean } = {}) {
      const seq = ++loadSeq;
      if (showLoading) dispatch({ type: "tasks/loading" });
      try {
        await taskData.getVerifiedUserId();
        const tasks = await taskData.fetchTasks();
        if (seq === loadSeq) dispatch({ type: "tasks/loaded", tasks });
      } catch (err) {
        if (seq === loadSeq) dispatch({ type: "tasks/failed", message: messageOf(err) });
      }
    },
    /** Saves a new task. Throws a TaskDataError (shown by the form) if saving fails. */
    async addTask(input: NewTaskInput) {
      const userId = await taskData.getVerifiedUserId();
      const task = await taskData.createTask(userId, input);
      dispatch({ type: "task/add", task });
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
        dispatch({ type: "task/replace", task: saved });
        notify("success", `Saved changes to “${saved.title}”`);
        return true;
      });
    },
    /** Completes an open task or reopens a finished one. Updates instantly, reverts if the save fails. */
    async toggleTask(task: Task) {
      if (inFlight.has(task.id)) return;
      const nextStatus = task.status === "done" ? "todo" : "done";
      dispatch({
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
          dispatch({ type: "task/replace", task: await taskData.updateTaskStatus(userId, task.id, nextStatus) });
        } catch (err) {
          dispatch({ type: "task/replace", task }); // restore exactly what was there before
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
          dispatch({ type: "task/remove", id: task.id });
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
    toggleHabitCheckIn(id: string, date: ISODate = today) {
      dispatch({ type: "habit/toggle", id, date });
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
const noSubscribe = () => () => {};
const getServerToday = () => null;

/**
 * Provides app state to the signed-in app. Renders `fallback` until the
 * browser's local date is known (one quick pass after hydration).
 */
export function AppStoreProvider({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const today = useSyncExternalStore(noSubscribe, localToday, getServerToday);
  if (!today) return fallback;
  return <StoreProvider today={today}>{children}</StoreProvider>;
}

function StoreProvider({ today, children }: { today: ISODate; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, today, createInitialState);
  const actions = useMemo(() => createActions(dispatch, today), [today]);

  useEffect(() => {
    // Initial state is already "loading", so no extra loading dispatch here.
    void actions.loadTasks({ showLoading: false });
  }, [actions]);

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
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
