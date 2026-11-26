"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { emptyInput, filterLibrary, groupLibrary, MEDIA, STATUSES, statusLabels, normalize, type EntertainmentInput, type EntertainmentItem, type Media, type Status } from "@/lib/entertainment/model";
import { repository } from "@/lib/entertainment/repository";
import { LibrarySession } from "@/lib/entertainment/session";
import { EntertainmentPicker } from "./picker";

export function EntertainmentView({ userId }: { userId: string }) {
  const [session] = useState(() => new LibrarySession(repository(userId), userId));
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const [media, setMedia] = useState("all");
  const [status, setStatus] = useState("unfinished");
  const [archived, setArchived] = useState(false);
  const [editor, setEditor] = useState<{ id: string; input: EntertainmentInput } | null>(null);
  const [deleting, setDeleting] = useState<EntertainmentItem | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    session.activate();
    const client = createClient();
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      if (next?.user.id !== userId) { session.expire(); setEditor(null); setDeleting(null); setNotice(""); }
    });
    void session.load();
    return () => { data.subscription.unsubscribe(); session.expire(); };
  }, [session, userId]);
  const items = filterLibrary(state.items, media, status, archived);
  return <section className="mx-auto max-w-3xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">Entertainment</h1><p className="mt-1 text-sm text-muted">Your movies, shows and games. Something to enjoy, at your pace.</p></div><Button variant="primary" disabled={state.status !== "ready" || state.busy} onClick={() => setEditor({ id: crypto.randomUUID(), input: { ...emptyInput } })}>Add a title</Button></header>
    <p className="text-xs text-subtle">Manual library · account-owned cloud storage · no artwork, availability lookup or AI service</p>
    {state.status === "loading" && <p role="status">Loading your library…</p>}
    {state.error && <div role="alert" className="rounded-xl border border-danger/40 p-4"><p>{state.error}</p>{state.status === "error" && <Button className="mt-2" onClick={() => void session.load()}>Retry loading</Button>}{state.status === "expired" && <Button onClick={() => window.location.reload()}>Reload account</Button>}</div>}
    {notice && <p role="status">{notice}</p>}
    {state.status === "ready" && <>
      <EntertainmentPicker items={state.items} onOpen={item => setEditor({ id: item.id, input: item })} />
      <div className="grid grid-cols-2 gap-3"><Field label="Media type" htmlFor="library-media"><Select id="library-media" value={media} onChange={e => setMedia(e.target.value)}><option value="all">All types</option>{MEDIA.map(m => <option key={m} value={m}>{m}</option>)}</Select></Field><Field label="Status" htmlFor="library-status"><Select id="library-status" value={status} onChange={e => setStatus(e.target.value)}><option value="unfinished">Unfinished</option><option value="all">All statuses</option>{STATUSES.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</Select></Field></div>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={archived} onChange={e => setArchived(e.target.checked)} />Show archive instead</label>
      {!items.length && <p className="rounded-xl border border-line p-6 text-muted">{!state.items.length ? "Your library is empty. Add a title to get started." : "No titles match these filters. Try another status, type or archive view."}</p>}
      <p className="text-xs text-subtle">Grouped by type · in-progress titles first in each group</p>
      {groupLibrary(items).map(group => <section key={group.media} className="space-y-3"><h2 className="text-lg font-semibold">{{ movie: "Movies", show: "Shows", game: "Games" }[group.media]}</h2><ul className="space-y-3">{group.items.map(item => <li key={item.id} className="min-w-0 space-y-3 rounded-xl border border-line bg-panel p-4">
        <div><h3 className="break-words text-lg font-medium">{item.title}</h3><p className="text-sm text-muted">{item.media} · {statusLabels[item.status]} · {["Low", "Normal", "High"][item.priority]} priority</p></div>
        {(item.platform || item.minutes) && <p className="break-words text-sm text-muted">{[item.platform, item.minutes ? `${item.minutes} min / session` : ""].filter(Boolean).join(" · ")}</p>}
        {item.media === "show" && (item.season || item.episode) && <p className="text-sm">Last watched: season {item.season ?? "—"}, episode {item.episode ?? "—"}</p>}
        {item.progress && <p className="whitespace-pre-wrap break-words text-sm">{item.progress}</p>}
        {!!item.tags.length && <p className="break-words text-xs text-accent-strong">{item.tags.join(" · ")}</p>}
        {item.note && <p className="whitespace-pre-wrap break-words text-sm text-muted">{item.note}</p>}
        <div className="flex flex-wrap gap-2"><Button disabled={state.busy} onClick={() => setEditor({ id: item.id, input: item })}>Edit / progress</Button><Button disabled={state.busy} onClick={async () => { if (await session.save(item.id, { ...item, archived: !item.archived })) setNotice(item.archived ? "Restored to library." : "Archived. You can restore it from the archive."); }}>{item.archived ? "Restore" : "Archive"}</Button>{item.archived && <Button variant="danger" disabled={state.busy} onClick={() => setDeleting(item)}>Delete</Button>}</div>
      </li>)}</ul></section>)}
    </>}
    <Dialog open={!!editor && state.status !== "expired"} onClose={() => setEditor(null)} dismissible={!state.busy} title="Title details" description="Only title and type are needed. Everything else is optional.">
      {editor && <EntertainmentEditor key={editor.id} initial={editor.input} busy={state.busy} error={state.error} onCancel={() => setEditor(null)} onSave={async input => { const saved = await session.save(editor.id, input); if (saved) { setEditor(null); setNotice("Saved to your library."); } }} />}
    </Dialog>
    <Dialog open={!!deleting} onClose={() => setDeleting(null)} dismissible={!state.busy} title="Delete archived title?" description="This permanently removes the title and its progress."><p className="mb-3 break-words">{deleting?.title}</p>{state.error && <p role="alert">{state.error}</p>}<div className="flex gap-2"><Button onClick={() => setDeleting(null)} disabled={state.busy}>Cancel</Button><Button variant="danger" disabled={state.busy} onClick={async () => { if (deleting && await session.remove(deleting.id)) { setDeleting(null); setNotice("Title deleted."); } }}>Delete permanently</Button></div></Dialog>
  </section>;
}

function EntertainmentEditor({ initial, busy, error, onSave, onCancel }: { initial: EntertainmentInput; busy: boolean; error: string; onSave: (input: EntertainmentInput) => Promise<void>; onCancel: () => void }) {
  const [draft, setDraft] = useState(initial);
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [validation, setValidation] = useState("");
  function set<K extends keyof EntertainmentInput>(key: K, value: EntertainmentInput[K]) { setDraft(d => ({ ...d, [key]: value })); }
  return <form className="space-y-4" onSubmit={async e => { e.preventDefault(); try { const input = normalize({ ...draft, tags: tags.split(",") }); setValidation(""); await onSave(input); } catch (cause) { setValidation(cause instanceof Error ? cause.message : "Check the details."); } }}>
    <fieldset disabled={busy} className="space-y-4">
      <Field label="Title" htmlFor="ent-title"><Input id="ent-title" required maxLength={200} value={draft.title} onChange={e => set("title", e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Type" htmlFor="ent-media"><Select id="ent-media" value={draft.media} onChange={e => set("media", e.target.value as Media)}>{MEDIA.map(m => <option key={m}>{m}</option>)}</Select></Field><Field label="Status" htmlFor="ent-status"><Select id="ent-status" value={draft.status} onChange={e => set("status", e.target.value as Status)}>{STATUSES.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</Select></Field></div>
      <details><summary className="min-h-11 cursor-pointer py-2 text-sm text-accent-strong">Optional details & progress</summary><div className="space-y-4 pt-2">
        <Field label="Genre / mood tags" htmlFor="ent-tags" hint="Comma-separated, e.g. cozy, mystery. You choose these labels."><Input id="ent-tags" value={tags} onChange={e => setTags(e.target.value)} /></Field>
        <Field label="Priority" htmlFor="ent-priority"><Select id="ent-priority" value={draft.priority} onChange={e => set("priority", Number(e.target.value))}><option value={0}>Low</option><option value={1}>Normal</option><option value={2}>High</option></Select></Field>
        <Field label="Platform / service" htmlFor="ent-platform" hint="Your own note; access is not verified."><Input id="ent-platform" maxLength={120} value={draft.platform} onChange={e => set("platform", e.target.value)} /></Field>
        <Field label="Estimated session minutes" htmlFor="ent-minutes" hint="Movie runtime, one episode, or one play session."><Input id="ent-minutes" type="number" inputMode="numeric" min={1} max={10000} value={draft.minutes ?? ""} onChange={e => set("minutes", e.target.value ? Number(e.target.value) : null)} /></Field>
        {draft.media === "show" && <div className="grid grid-cols-2 gap-3">{(["season", "episode"] as const).map(key => <Field key={key} label={`Last watched ${key}`} htmlFor={`ent-${key}`}><Input id={`ent-${key}`} type="number" inputMode="numeric" min={1} max={10000} value={draft[key] ?? ""} onChange={e => set(key, e.target.value ? Number(e.target.value) : null)} /></Field>)}</div>}
        {draft.media === "game" && <Field label="Game progress" htmlFor="ent-progress"><Textarea id="ent-progress" maxLength={500} value={draft.progress} onChange={e => set("progress", e.target.value)} /></Field>}
        <Field label="Short note" htmlFor="ent-note"><Textarea id="ent-note" maxLength={1000} value={draft.note} onChange={e => set("note", e.target.value)} /></Field>
      </div></details>
    </fieldset>
    {(validation || error) && <p role="alert" className="text-sm text-danger">{validation || error}</p>}
    <div className="task-form-actions flex gap-2"><Button type="submit" variant="primary" disabled={busy}>{busy ? "Saving…" : "Save title"}</Button><Button disabled={busy} onClick={onCancel}>Cancel</Button></div>
  </form>;
}
