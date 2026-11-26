import * as data from "@/lib/data/inbox";
import { getVerifiedUserId, TaskDataError } from "@/lib/data/tasks";
import type { DailyFocus, InboxNote, NewTaskInput, Task } from "@/lib/types";
import type { CaptureWriteScope } from "./capture-drafts";
import { undoAction, type Notify } from "@/lib/undo";

type Status = "loading" | "ready" | "error";
export interface InboxSlice {
  inboxNotes: InboxNote[];
  inboxStatus: Status;
  inboxError: string | null;
  pendingNoteIds: string[];
  focus: DailyFocus | null;
  focusStatus: Status;
  focusError: string | null;
  savingFocus: boolean;
}
export const initialInboxState: InboxSlice = {
  inboxNotes: [], inboxStatus: "loading", inboxError: null, pendingNoteIds: [],
  focus: null, focusStatus: "loading", focusError: null, savingFocus: false,
};
export type InboxAction =
  | { type: "inbox/loading" }
  | { type: "inbox/loaded"; notes: InboxNote[] }
  | { type: "inbox/failed"; message: string }
  | { type: "inbox/saved"; note: InboxNote }
  | { type: "inbox/pending"; id: string; pending: boolean }
  | { type: "focus/loading" }
  | { type: "focus/loaded"; focus: DailyFocus | null }
  | { type: "focus/failed"; message: string }
  | { type: "focus/saving"; saving: boolean };

export function reduceInbox(state: InboxSlice, action: InboxAction): InboxSlice {
  switch (action.type) {
    case "inbox/loading": return { ...state, inboxStatus: "loading", inboxError: null };
    case "inbox/loaded": return { ...state, inboxNotes: action.notes, inboxStatus: "ready", inboxError: null };
    case "inbox/failed": return { ...state, inboxStatus: "error", inboxError: action.message };
    case "inbox/saved": return { ...state, inboxNotes: [action.note, ...state.inboxNotes.filter((n) => n.id !== action.note.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
    case "inbox/pending": return { ...state, pendingNoteIds: action.pending ? [...state.pendingNoteIds, action.id] : state.pendingNoteIds.filter((id) => id !== action.id) };
    case "focus/loading": return { ...state, focusStatus: "loading", focusError: null };
    case "focus/loaded": return { ...state, focus: action.focus, focusStatus: "ready", focusError: null };
    case "focus/failed": return { ...state, focusStatus: "error", focusError: action.message };
    case "focus/saving": return { ...state, savingFocus: action.saving };
  }
}

const messageOf = (err: unknown) => err instanceof TaskDataError ? err.message : "Couldn't reach your account. Please try again.";
type Dispatch = (action: InboxAction | { type: "task/add"; task: Task }) => void;

export function createInboxActions(dispatch: Dispatch, notify: Notify) {
  let readSeq = 0;
  let focusReadSeq = 0;
  let revision = 0;
  let focusSaving = false;
  const writes = new Map<string, { revision: number; note: InboxNote }>();
  const inFlight = new Set<string>();
  function saved(note: InboxNote) {
    writes.set(note.id, { revision: ++revision, note });
    dispatch({ type: "inbox/saved", note });
  }
  async function withNote<T>(id: string, work: () => Promise<T>): Promise<T> {
    if (inFlight.has(id)) throw new TaskDataError("This capture is still saving. Try again in a moment.");
    inFlight.add(id);
    dispatch({ type: "inbox/pending", id, pending: true });
    try { return await work(); }
    finally { inFlight.delete(id); dispatch({ type: "inbox/pending", id, pending: false }); }
  }
  async function captureOwner(scope?: CaptureWriteScope) {
    if (scope && !scope.current()) throw new TaskDataError("Your capture account changed. Reload before saving.");
    const userId = await getVerifiedUserId();
    if (scope && (!scope.current() || scope.accountId !== userId)) throw new TaskDataError("Your capture account changed. Reload before saving.");
    return userId;
  }
  function currentCapture(scope?: CaptureWriteScope) {
    if (scope && !scope.current()) throw new TaskDataError("Your capture account changed. Reload before saving.");
  }
  return {
    async loadInbox({ showLoading = true } = {}) {
      const seq = ++readSeq;
      const startedAt = revision;
      if (showLoading) dispatch({ type: "inbox/loading" });
      try {
        const notes = await data.fetchNotes(await getVerifiedUserId());
        if (seq !== readSeq) return;
        // A slow initial read must not erase a capture saved while it was in flight.
        const merged = new Map(notes.map((n) => [n.id, n]));
        writes.forEach((w) => { if (w.revision > startedAt) merged.set(w.note.id, w.note); });
        dispatch({ type: "inbox/loaded", notes: Array.from(merged.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
      } catch (err) { if (seq === readSeq) dispatch({ type: "inbox/failed", message: messageOf(err) }); }
    },
    async addCapture(id: string, body: string, scope?: CaptureWriteScope) {
      return withNote(id, async () => {
        const note = await data.createNote(await captureOwner(scope), id, body);
        currentCapture(scope);
        saved(note);
        notify("success", "Saved to Inbox");
        return note;
      });
    },
    async editCapture(id: string, body: string, scope?: CaptureWriteScope) {
      return withNote(id, async () => {
        const note = await data.updateNote(await captureOwner(scope), id, { body });
        currentCapture(scope);
        saved(note);
        notify("success", "Capture updated");
      });
    },
    async archiveCapture(note: InboxNote, archived: boolean) {
      return withNote(note.id, async () => {
        const owner = await getVerifiedUserId();
        const updated = await data.updateNote(owner, note.id, { archived });
        saved(updated);
        notify("success", archived ? "Capture archived" : "Capture restored", archived ? undoAction(async () => {
          if (writes.get(note.id)?.note !== updated) throw new TaskDataError("This capture changed. Reload Inbox before undoing.");
          await withNote(note.id, async () => {
            if (await getVerifiedUserId() !== owner) throw new TaskDataError("Sign in to the original account before undoing.");
            saved(await data.undoCaptureArchive(owner, updated));
          });
        }) : undefined);
      });
    },
    async convertCapture(note: InboxNote, input: NewTaskInput) {
      return withNote(note.id, async () => {
        const result = await data.convertNote(await getVerifiedUserId(), note.id, input);
        saved(result.note);
        if (result.task) dispatch({ type: "task/add", task: result.task });
        notify("success", result.task ? "Task saved — original capture kept in Inbox" : "This capture was already converted; its task has since been removed.");
        return result.task;
      });
    },
    async loadFocus({ showLoading = true } = {}) {
      const seq = ++focusReadSeq;
      if (showLoading) dispatch({ type: "focus/loading" });
      try {
        const focus = await data.fetchFocus(await getVerifiedUserId());
        if (seq === focusReadSeq) dispatch({ type: "focus/loaded", focus });
      } catch (err) { if (seq === focusReadSeq) dispatch({ type: "focus/failed", message: messageOf(err) }); }
    },
    async setFocus(taskId: string | null, date: string) {
      if (focusSaving) throw new TaskDataError("Your focus is still saving. Try again in a moment.");
      focusSaving = true;
      dispatch({ type: "focus/saving", saving: true });
      ++focusReadSeq;
      try {
        const focus = await data.saveFocus(await getVerifiedUserId(), taskId, date);
        dispatch({ type: "focus/loaded", focus });
        notify("success", taskId ? "Today's focus saved" : "Today's focus cleared");
      } finally { focusSaving = false; dispatch({ type: "focus/saving", saving: false }); }
    },
  };
}
