"use client";
import { useRef, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { useCaptureDrafts } from "@/components/inbox/capture-draft-provider";
import { fetchExport } from "@/lib/data/export";
import { exportDocument, type ExportCollection } from "@/lib/data-export";
import { TaskDataError } from "@/lib/data/tasks";
export function DataExport() {
  const { store, snapshot } = useCaptureDrafts();
  const [collection, setCollection] = useState<ExportCollection>("tasks"), [format, setFormat] = useState<"json" | "csv">("json"), [notes, setNotes] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState<string | null>(null), [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  async function download() {
    if (pending.current || !snapshot.ready || !snapshot.accountId || snapshot.needsReload) return;
    pending.current = true; setBusy(true); setError(null); setMessage(null);
    const epoch = snapshot.epoch, account = snapshot.accountId;
    const current = () => { const state = store.getSnapshot(); return state.epoch === epoch && state.accountId === account && !state.needsReload; };
    try {
      const data = await fetchExport(collection, notes, account, current);
      if (!current()) return;
      const now = new Date(), body = exportDocument(collection, data.rows, data.columns, format, now);
      const url = URL.createObjectURL(new Blob([body], { type: format === "json" ? "application/json" : "text/csv;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = `lanes-lair-${collection}-${now.toISOString().slice(0, 10)}.${format}`;
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMessage(`Download requested for ${data.rows.length} saved ${collection}. Check Downloads or use Safari’s save/share controls. This export is unencrypted; store it somewhere private.`);
    } catch (cause) { if (current()) setError(cause instanceof TaskDataError ? cause.message : "Couldn't create the file. No complete download was confirmed; retry."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <Card id="export"><CardHeader title="Export your data" description="Download one selected collection as JSON or spreadsheet-friendly CSV. Saved records only; not a complete backup or an import tool." />
    <div className="space-y-4"><p className="text-sm text-muted">Journal and Inbox writing, habit logs, credentials and recovery material are excluded. Habit exports contain definitions and targets only. Task titles and project/habit names are included; descriptions require a separate choice. Files are unencrypted.</p>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2"><Field label="Collection" htmlFor="export-collection"><Select id="export-collection" value={collection} onChange={event => { setCollection(event.target.value as ExportCollection); setNotes(false); setMessage(null); setError(null); }}><option value="tasks">Tasks</option><option value="projects">Projects</option><option value="habits">Habit definitions (no logs)</option></Select></Field><Field label="File format" htmlFor="export-format"><Select id="export-format" value={format} onChange={event => { setFormat(event.target.value as "json" | "csv"); setMessage(null); }}><option value="json">JSON</option><option value="csv">CSV</option></Select></Field>
      {collection !== "habits" && <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={notes} onChange={event => setNotes(event.target.checked)} />Also include task notes or project descriptions, which may contain private writing</label>}</fieldset>
      <p className="text-xs text-subtle">Avoid editing this collection while it downloads. Separate pages are read in order, rather than as one database snapshot. CSV text starting with spreadsheet formulas is prefixed with an apostrophe; JSON keeps the original text.</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}{message && <p role="status" className="text-sm text-muted">{message}</p>}
      <Button variant="primary" className="min-h-11" disabled={busy || !snapshot.ready || !snapshot.accountId || snapshot.needsReload} onClick={() => void download()}>{busy ? "Preparing file…" : "Download selected data"}</Button>
    </div>
  </Card>;
}
