"use client";

import { ArrowDownToLine, Loader2 } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { CaptureConflictError } from "@/lib/data/inbox";
import { TaskDataError } from "@/lib/data/tasks";
import { useAppActions } from "@/lib/store/app-store";
import type { InboxNote } from "@/lib/types";

export function CaptureForm({ note, onSaved, onSaving, autoFocus = false, compact = false }: {
  note?: InboxNote; onSaved?: () => void; onSaving?: (saving: boolean) => void; autoFocus?: boolean; compact?: boolean;
}) {
  const { addCapture, editCapture } = useAppActions();
  const id = useId();
  const [body, setBody] = useState(note?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const draftId = useRef<string | null>(null);
  const inFlight = useRef(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    if (!body.trim()) { setError("Write something to capture."); return; }
    inFlight.current = true;
    setSaving(true);
    onSaving?.(true);
    setError(null);
    setConflict(false);
    try {
      if (note) await editCapture(note.id, body);
      else {
        draftId.current ??= crypto.randomUUID();
        await addCapture(draftId.current, body);
      }
      if (!note) { setBody(""); draftId.current = null; }
      setSaving(false);
      onSaving?.(false);
      onSaved?.();
    } catch (err) {
      setError(err instanceof TaskDataError ? err.message : "Couldn't save. Your text is still here — please try again.");
      setConflict(err instanceof CaptureConflictError);
      setSaving(false);
      onSaving?.(false);
    } finally { inFlight.current = false; }
  }

  return (
    <form onSubmit={submit} className="space-y-3" aria-busy={saving}>
      <label htmlFor={id} className="sr-only">{note ? "Edit capture" : "Capture an idea or note"}</label>
      <Textarea id={id} value={body} onChange={(e) => setBody(e.target.value)} maxLength={20000}
        disabled={saving} autoCapitalize="sentences" spellCheck enterKeyHint="enter" autoFocus={autoFocus} rows={note ? 6 : compact ? 2 : 3}
        placeholder="An idea, a reminder, a thought… just get it down."
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${compact ? "min-h-20" : "min-h-28"} resize-y text-base`} />
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-danger">{error}</p>}
      {conflict && <Button onClick={() => { draftId.current = null; setConflict(false); setError(null); }}>Keep edits as a new capture</Button>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-subtle">{note ? "Editing this note won’t change its task or journal copies." : "Save it now. Organize it when you’re ready."}</p>
        <Button type="submit" variant="primary" disabled={saving || !body.trim()} className="h-11">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />}
          {saving ? "Saving…" : note ? "Save changes" : "Save to Inbox"}
        </Button>
      </div>
    </form>
  );
}

export function CaptureDialog({ open, note, onClose }: { open: boolean; note?: InboxNote; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  return (
    <Dialog open={open} onClose={onClose} dismissible={!saving} title={note ? "Edit capture" : "Quick capture"}
      description="No categories or decisions needed.">
      <CaptureForm key={note?.id ?? "new"} note={note} onSaved={onClose} onSaving={setSaving} autoFocus />
    </Dialog>
  );
}
