// Domain types for Lane's Lair.
// These mirror the shape future database tables (e.g. Supabase) are expected to have,
// so UI components can stay the same when sample data is swapped for real queries.

/** ISO date string, e.g. "2026-10-14". */
export type ISODate = string;
/** ISO date-time string, e.g. "2026-10-14T09:30:00". */
export type ISODateTime = string;

export type Priority = "high" | "medium" | "low";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: string;
  title: string;
  notes?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: ISODate;
  projectId?: string;
  createdAt: ISODateTime;
  completedAt?: ISODateTime;
}

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  dueDate?: ISODate;
  /** Tailwind-safe color key used for the project's accent dot. */
  color: AccentColor;
}

export type AccentColor = "violet" | "blue" | "emerald" | "amber" | "rose" | "cyan";

export type HabitFrequency = "daily" | "weekdays" | "weekly";

export interface Habit {
  id: string;
  name: string;
  frequency: HabitFrequency;
  /** Dates (ISO) on which the habit was checked in. */
  checkIns: ISODate[];
  color: AccentColor;
}

export interface Goal {
  id: string;
  title: string;
  /** Unit label such as "books", "miles", "%". */
  unit: string;
  current: number;
  target: number;
  targetDate?: ISODate;
  color: AccentColor;
}

export type EventCategory = "music" | "food" | "tech" | "outdoors" | "arts" | "community";

export interface LocalEvent {
  id: string;
  title: string;
  category: EventCategory;
  startsAt: ISODateTime;
  venue: string;
  neighborhood: string;
  price: string;
  description: string;
  saved: boolean;
}

export interface ScheduleItem {
  id: string;
  title: string;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  location?: string;
  kind: "meeting" | "class" | "personal" | "event";
}

export type NotificationKind = "reminder" | "habit" | "event" | "project" | "system";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: ISODateTime;
  read: boolean;
  href?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
}

export interface UserProfile {
  name: string;
  email: string;
  timeZone: string;
}

/** Input used when creating a task from a form. */
export type NewTaskInput = Pick<Task, "title" | "priority"> &
  Partial<Pick<Task, "dueDate" | "projectId" | "notes">>;
