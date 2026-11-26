"use client";
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useCaptureDrafts } from "@/components/inbox/capture-draft-provider";
import { useAppState } from "@/lib/store/app-store";
import { createDailyPreferences, defaultPreferences, type DailyPreferences } from "@/lib/daily-preferences";
export interface DailyPreferenceContext { value: DailyPreferences; ready: boolean; durable: boolean; update: (patch: Partial<DailyPreferences>) => void }
export const DailyContext = createContext<DailyPreferenceContext | null>(null);
export function DailyPreferencesProvider({ children }: { children: ReactNode }) {
  const { today } = useAppState();
  const { store: captures, snapshot } = useCaptureDrafts();
  const enabled = snapshot.ready && !!snapshot.accountId && !snapshot.needsReload;
  const store = useMemo(() => {
    const epoch = snapshot.epoch;
    return createDailyPreferences(today, `lanes-lair.daily.v1/${snapshot.accountId}`, () => window.localStorage,
      () => { const now = captures.getSnapshot(); return enabled && now.epoch === epoch && !now.needsReload && !!now.accountId; });
  }, [today, snapshot.accountId, snapshot.epoch, captures, enabled]);
  const fallback = useMemo(() => ({ value: defaultPreferences(today), ready: false, durable: true }), [today]);
  const prefs = useSyncExternalStore(store.subscribe, store.getSnapshot, () => fallback);
  useEffect(() => { store.load(); }, [store]);
  return <DailyContext.Provider value={{ ...(enabled ? prefs : fallback), update: store.update }}>{children}</DailyContext.Provider>;
}
export function useDailyPreferences() { const context = useContext(DailyContext); if (!context) throw new Error("Daily preferences need DailyPreferencesProvider"); return context; }
