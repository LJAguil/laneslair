"use client";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Notice } from "@/lib/store/app-store";
export function NoticeMessage({ notice, dismiss }: { notice: Notice; dismiss: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  useEffect(() => {
    if (busy || error) return;
    const timer = setTimeout(dismiss, notice.undo ? Math.max(0, notice.undo.expiresAt - Date.now()) : notice.kind === "error" ? 8000 : 3000);
    return () => clearTimeout(timer);
  }, [notice, dismiss, busy, error]);
  async function undo() {
    if (pending.current || !notice.undo) return;
    pending.current = true; setBusy(true); setError(null);
    try { await notice.undo.run(); dismiss(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't undo. Reload the affected list before trying again."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <div role={error || notice.kind === "error" ? "alert" : "status"} className="pointer-events-auto flex max-w-md items-center gap-2 rounded-xl border border-line bg-raised py-2 pl-4 pr-2 text-sm text-fg shadow-xl shadow-black/40">
    {error || notice.kind === "error" ? <AlertCircle className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />}
    <span className="min-w-0 break-words py-0.5">{error ?? notice.message}</span>
    {notice.undo && !error && <Button className="min-h-11" disabled={busy} onClick={() => void undo()}>{busy ? "Undoing…" : "Undo"}</Button>}
    <Button variant="ghost" size="icon" className="min-h-11 min-w-11" disabled={busy} onClick={dismiss} aria-label="Dismiss message"><X className="h-4 w-4" aria-hidden="true" /></Button>
  </div>;
}
