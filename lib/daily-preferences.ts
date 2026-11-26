import { weekStart } from "./habits";
import { addDays } from "./dates";
export const sections = ["capture", "habits", "reminders", "radar", "play", "wrap"] as const;
export const shortcuts = ["inbox", "water", "journal", "casebook", "tasks", "projects", "review"] as const;
export type Section = typeof sections[number];
export type Shortcut = typeof shortcuts[number];
export interface DailyPreferences {
  day: string; optional: string[]; week: string; priorities: string[];
  shortcuts: Shortcut[]; hidden: Section[];
}
export const defaultPreferences = (today: string): DailyPreferences => ({ day: today, optional: [], week: addDays(weekStart(today), 7), priorities: [], shortcuts: ["inbox", "journal", "casebook"], hidden: [] });
const ids = (value: unknown, max: number) => Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string" && /^[\w-]{1,100}$/.test(id)))].slice(0, max) : [];
export function parsePreferences(value: unknown, today: string): DailyPreferences {
  const base = defaultPreferences(today);
  if (!value || typeof value !== "object") return base;
  const raw = value as Partial<DailyPreferences>;
  const validWeek = raw.week === weekStart(today) || raw.week === base.week;
  return { ...base, optional: raw.day === today ? ids(raw.optional, 2) : [], week: validWeek ? raw.week! : base.week, priorities: validWeek ? ids(raw.priorities, 3) : [],
    shortcuts: Array.isArray(raw.shortcuts) ? shortcuts.filter(id => raw.shortcuts!.includes(id)) : base.shortcuts,
    hidden: Array.isArray(raw.hidden) ? sections.filter(id => raw.hidden!.includes(id)) : [] };
}
export interface PreferenceStorage { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void }
/** Only IDs and display choices, never writing, task titles or habit records. */
export function createDailyPreferences(today: string, key: string, storage: () => PreferenceStorage, current: () => boolean) {
  let snapshot = { value: defaultPreferences(today), ready: false, durable: true };
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(fn => fn());
  return {
    getSnapshot: () => snapshot,
    subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    load() {
      if (!current()) return;
      try { snapshot = { value: parsePreferences(JSON.parse(storage().getItem(key) ?? "null"), today), ready: true, durable: true }; }
      catch { snapshot = { value: defaultPreferences(today), ready: true, durable: false }; }
      emit();
    },
    update(patch: Partial<DailyPreferences>) {
      if (!current() || !snapshot.ready) return;
      const value = parsePreferences({ ...snapshot.value, ...patch, day: today }, today);
      let durable = true;
      try { storage().setItem(key, JSON.stringify(value)); } catch { durable = false; }
      snapshot = { value, ready: true, durable }; emit();
    },
  };
}
