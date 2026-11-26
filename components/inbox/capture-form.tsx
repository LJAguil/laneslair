"use client";

import { ArrowDownToLine, Loader2 } from "lucide-react";
import { useId, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import type { InboxNote } from "@/lib/types";
import { emptyCaptureDraft } from "@/lib/store/capture-drafts";
import { useCaptureDrafts } from "./capture-draft-provider";

export function CaptureForm({ note, onSaved, onSaving, autoFocus = false, compact = false }: {
  note?: InboxNote; onSaved?: () => void; onSaving?: (saving: boolean) => void; autoFocus?: boolean; compact?: boolean;
}) {
  const id = useId();
  const { store, snapshot } = useCaptureDrafts();
  const key = note ? `edit/${note.id}` : "new", base = note?.body ?? "";
  const draft = snapshot.drafts[key] ?? emptyCaptureDraft(base);
  const ready = snapshot.ready && !!snapshot.accountId && !snapshot.needsReload;
  const { body, error, conflict } = draft, saving = draft.status === "saving";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready || saving) return;
    onSaving?.(true);
    try {
      if (await store.save(key, base, snapshot.epoch, note?.id)) onSaved?.();
    } finally { onSaving?.(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-3" aria-busy={saving}>
      <label htmlFor={id} className="sr-only">{note ? "Edit capture" : "Capture an idea or note"}</label>
      <Textarea id={id} value={ready ? body : ""} onChange={(e) => store.change(key, e.target.value, base, snapshot.epoch)} maxLength={20000}
        disabled={!ready || saving} autoCapitalize="sentences" spellCheck enterKeyHint="enter" autoFocus={autoFocus} rows={note ? 6 : compact ? 2 : 3}
        placeholder="An idea, a reminder, a thought… just get it down."
        aria-describedby={error ? `${id}-error ${id}-status` : `${id}-status`}
        className={`${compact ? "min-h-20" : "min-h-28"} resize-y text-base`} />
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-danger">{error}</p>}
      {conflict && <Button onClick={() => store.fork(key, snapshot.epoch)}>Keep edits as a new capture</Button>}
      <p id={`${id}-status`} role="status" className={`text-xs ${draft.status === "saved" ? "text-success" : "text-subtle"}`}>
        {snapshot.needsReload ? "Your account changed. Reload the app before capturing." : !snapshot.ready ? "Checking your capture session…" : !snapshot.accountId ? "Sign in again to capture." : saving ? "Saving to Inbox…" : draft.status === "saved" ? note ? "Capture updated." : "Saved to Inbox." : draft.body !== draft.baseBody ? "Unsaved draft · kept while moving around this app" : "Ready to capture."}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-subtle">{note ? "Editing this note won’t change its task or journal copies." : "Save it now. Organize it when you’re ready."}</p>
        <div className="flex flex-wrap gap-2">{draft.body !== draft.baseBody && <Button disabled={!ready || saving} onClick={() => store.discard(key, base, snapshot.epoch)}>Discard draft</Button>}
        <Button type="submit" variant="primary" disabled={!ready || saving || !body.trim() || (!!note && body === draft.baseBody)} className="h-11">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />}
          {saving ? "Saving…" : note ? "Save changes" : "Save to Inbox"}
        </Button>
        </div>
      </div>
      <p className="text-xs text-subtle">Drafts stay in app memory only. Save before closing or refreshing; iPhone may close the app without warning.</p>
    </form>
  );
}

export function CaptureDialog({ open, note, onClose }: { open: boolean; note?: InboxNote; onClose: () => void }) {
  const { snapshot } = useCaptureDrafts();
  const saving = snapshot.drafts[note ? `edit/${note.id}` : "new"]?.status === "saving";
  return (
    <Dialog open={open} onClose={onClose} dismissible={!saving} title={note ? "Edit capture" : "Quick capture"}
      description="No categories or decisions needed.">
      <CaptureForm key={note?.id ?? "new"} note={note} onSaved={onClose} autoFocus />
    </Dialog>
  );
}
