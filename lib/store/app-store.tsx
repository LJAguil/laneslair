"use client";

// A small client-side store built on React context + useReducer.
// Every mutation goes through `actions`, so later each action can call
// Supabase (or an API route) without changing the components that use it.

import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import { PROTOTYPE_TODAY } from "@/lib/dates";
import { sampleEvents } from "@/lib/sample-data/events";
import { sampleGoals, sampleHabits } from "@/lib/sample-data/habits-goals";
import { sampleConversations, sampleNotifications, sampleProfile, sampleSchedule } from "@/lib/sample-data/misc";
import { sampleProjects } from "@/lib/sample-data/projects";
import { sampleTasks } from "@/lib/sample-data/tasks";
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

export interface AppState {
  tasks: Task[];
  projects: Project[];
  habits: Habit[];
  goals: Goal[];
  events: LocalEvent[];
  schedule: ScheduleItem[];
  notifications: AppNotification[];
  conversations: Conversation[];
  profile: UserProfile;
}

const initialState: AppState = {
  tasks: sampleTasks,
  projects: sampleProjects,
  habits: sampleHabits,
  goals: sampleGoals,
  events: sampleEvents,
  schedule: sampleSchedule,
  notifications: sampleNotifications,
  conversations: sampleConversations,
  profile: sampleProfile,
};

type Action =
  | { type: "task/add"; task: Task }
  | { type: "task/toggle"; id: string; completedAt: string }
  | { type: "habit/toggle"; id: string; date: ISODate }
  | { type: "event/toggleSaved"; id: string }
  | { type: "notification/read"; id: string }
  | { type: "notification/readAll" }
  | { type: "chat/new"; conversation: Conversation }
  | { type: "chat/add"; conversationId: string; message: ChatMessage }
  | { type: "profile/update"; profile: Partial<UserProfile> };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "task/add":
      return { ...state, tasks: [action.task, ...state.tasks] };
    case "task/toggle":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id !== action.id
            ? t
            : t.status === "done"
              ? { ...t, status: "todo", completedAt: undefined }
              : { ...t, status: "done", completedAt: action.completedAt },
        ),
      };
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

/** Current wall-clock time placed on the prototype's "today" so new activity counts as today. */
function nowOnPrototypeDay(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${PROTOTYPE_TODAY}T${hh}:${mm}:00`;
}

function createActions(dispatch: React.Dispatch<Action>) {
  return {
    addTask(input: NewTaskInput) {
      dispatch({
        type: "task/add",
        task: { id: crypto.randomUUID(), status: "todo", createdAt: nowOnPrototypeDay(), ...input },
      });
    },
    toggleTask(id: string) {
      dispatch({ type: "task/toggle", id, completedAt: nowOnPrototypeDay() });
    },
    toggleHabitCheckIn(id: string, date: ISODate = PROTOTYPE_TODAY) {
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

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const actions = useMemo(() => createActions(dispatch), []);
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
