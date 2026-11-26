"use client";
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { createCaptureDrafts, hasCaptureDrafts, initialCaptureDrafts, type CaptureDraftStore } from "@/lib/store/capture-drafts";
import { useAppActions } from "@/lib/store/app-store";
import { createClient } from "@/lib/supabase/client";
import { TaskDataError } from "@/lib/data/tasks";
import { CaptureConflictError } from "@/lib/data/inbox";
export const CaptureDraftContext = createContext<CaptureDraftStore | null>(null);
const serverSnapshot = () => initialCaptureDrafts;
export function CaptureDraftProvider({ children }: { children: ReactNode }) {
  const actions = useAppActions();
  const store = useMemo(() => createCaptureDrafts(
    (request, scope) => request.noteId ? actions.editCapture(request.noteId, request.body, scope) : actions.addCapture(request.requestId, request.body, scope),
    error => ({ message: error instanceof TaskDataError ? error.message : "Couldn't save. Your text is still here — please try again.", conflict: error instanceof CaptureConflictError }),
  ), [actions]);
  useEffect(() => {
    const { data: { subscription } } = createClient().auth.onAuthStateChange((_event, session) => store.setAccount(session?.user.id ?? null));
    return () => { subscription.unsubscribe(); store.clear(); };
  }, [store]);
  return <CaptureDraftContext.Provider value={store}><CaptureDraftGuard />{children}</CaptureDraftContext.Provider>;
}
export function useCaptureDrafts() {
  const store = useContext(CaptureDraftContext);
  if (!store) throw new Error("Captures need CaptureDraftProvider");
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, serverSnapshot);
  return { store, snapshot };
}
function CaptureDraftGuard() {
  const { snapshot } = useCaptureDrafts(), dirty = hasCaptureDrafts(snapshot);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return null;
}
