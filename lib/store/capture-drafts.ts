/** App-memory drafts only. No browser storage, timers, personal fixtures or logging. */
export interface CaptureWriteScope { accountId: string; current: () => boolean }
export interface CaptureDraft {
  body: string; baseBody: string; requestId: string | null;
  status: "idle" | "unsaved" | "saving" | "saved" | "error";
  error: string | null; conflict: boolean;
}
export interface CaptureDraftSnapshot {
  ready: boolean; accountId: string | null; epoch: number; needsReload: boolean;
  drafts: Record<string, CaptureDraft>;
}
export const emptyCaptureDraft = (body = ""): CaptureDraft => ({ body, baseBody: body, requestId: null, status: "idle", error: null, conflict: false });
export const initialCaptureDrafts: CaptureDraftSnapshot = { ready: false, accountId: null, epoch: 0, needsReload: false, drafts: {} };
export interface CaptureRequest { noteId?: string; requestId: string; body: string }
export function createCaptureDrafts(
  write: (request: CaptureRequest, scope: CaptureWriteScope) => Promise<unknown>,
  describeError: (error: unknown) => { message: string; conflict: boolean },
  uuid: () => string = () => crypto.randomUUID(),
) {
  let snapshot = initialCaptureDrafts, firstAccount: string | null = null;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(fn => fn());
  function active(epoch: number) { return snapshot.ready && !!snapshot.accountId && !snapshot.needsReload && snapshot.epoch === epoch; }
  function put(key: string, draft: CaptureDraft) { snapshot = { ...snapshot, drafts: { ...snapshot.drafts, [key]: draft } }; emit(); }
  return {
    getSnapshot: () => snapshot,
    subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    setAccount(accountId: string | null) {
      if (snapshot.ready && snapshot.accountId === accountId) return;
      const needsReload = snapshot.needsReload || (!!firstAccount && !!accountId && accountId !== firstAccount);
      if (accountId && !firstAccount) firstAccount = accountId;
      snapshot = { ready: true, accountId, epoch: snapshot.epoch + 1, needsReload, drafts: {} }; emit();
    },
    change(key: string, body: string, baseBody: string, epoch: number) {
      if (!active(epoch) || snapshot.drafts[key]?.status === "saving") return;
      const draft = snapshot.drafts[key] ?? emptyCaptureDraft(baseBody);
      put(key, { ...draft, body, status: body === draft.baseBody ? "idle" : "unsaved", error: null, conflict: false });
    },
    discard(key: string, baseBody: string, epoch: number) {
      if (active(epoch) && snapshot.drafts[key]?.status !== "saving") put(key, emptyCaptureDraft(baseBody));
    },
    fork(key: string, epoch: number) {
      if (active(epoch) && snapshot.drafts[key]?.status === "error") put(key, { ...snapshot.drafts[key], requestId: null, status: "unsaved", error: null, conflict: false });
    },
    async save(key: string, baseBody: string, epoch: number, noteId?: string) {
      if (!active(epoch)) return false;
      const draft = snapshot.drafts[key] ?? emptyCaptureDraft(baseBody);
      if (draft.status === "saving") return false;
      if (!draft.body.trim()) { put(key, { ...draft, error: "Write something to capture.", status: "error" }); return false; }
      const requestId = draft.requestId ?? uuid(), body = draft.body;
      const scope: CaptureWriteScope = { accountId: snapshot.accountId!, current: () => active(epoch) };
      put(key, { ...draft, requestId, status: "saving", error: null, conflict: false });
      try {
        await write({ noteId, requestId, body }, scope);
        if (!scope.current()) return false;
        const current = snapshot.drafts[key];
        if (current?.body === body && current.requestId === requestId) put(key, { ...emptyCaptureDraft(noteId ? body : ""), status: "saved" });
        return true;
      } catch (error) {
        if (scope.current()) { const failure = describeError(error); put(key, { ...snapshot.drafts[key], status: "error", error: failure.message, conflict: failure.conflict }); }
        return false;
      }
    },
    clear() { firstAccount = null; snapshot = { ...initialCaptureDrafts, epoch: snapshot.epoch + 1 }; emit(); },
  };
}
export type CaptureDraftStore = ReturnType<typeof createCaptureDrafts>;
export const hasCaptureDrafts = (state: CaptureDraftSnapshot) => Object.values(state.drafts).some(draft => draft.body !== draft.baseBody || draft.status === "saving");
