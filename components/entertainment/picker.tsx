"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { MEDIA, recommend, randomSuggestion, type EntertainmentItem, type RecommendationRequest } from "@/lib/entertainment/model";
export function EntertainmentPicker({ items, onOpen }: { items: EntertainmentItem[]; onOpen: (item: EntertainmentItem) => void }) {
  const [preferences, setPreferences] = useState<RecommendationRequest["preferences"]>({ media: "all", minutes: null, tags: [], favor: "variety", allowUnknown: true });
  const [tags, setTags] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const suitable = recommend({ items, preferences: { ...preferences, tags: tags.split(",") } });
  const selected = suitable.find(s => s.item.id === chosen) ?? suitable[0];
  return <details className="rounded-xl border border-line bg-panel p-4" onChange={() => { setShow(false); setChosen(null); }}><summary className="min-h-11 cursor-pointer py-2 font-medium">Help me choose</summary>
    <p className="mb-4 text-sm text-muted">Local rules, not AI. Picks only from your unfinished, unarchived library. Time and tags narrow the pool. Variety picks randomly; you can favor priority or continuing instead. Nothing is inferred from other pages.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Media" htmlFor="pick-media"><Select id="pick-media" value={preferences.media} onChange={e => setPreferences(p => ({ ...p, media: e.target.value as typeof p.media }))}><option value="all">Any type</option>{MEDIA.map(m => <option key={m}>{m}</option>)}</Select></Field>
      <Field label="Available minutes" htmlFor="pick-minutes"><Input id="pick-minutes" type="number" min={1} max={10000} inputMode="numeric" value={preferences.minutes ?? ""} onChange={e => setPreferences(p => ({ ...p, minutes: e.target.value ? Math.max(1, Number(e.target.value)) : null }))} /></Field>
      <Field label="Mood / tags" htmlFor="pick-tags" hint="Matches any exact tag you saved; comma-separated."><Input id="pick-tags" value={tags} onChange={e => setTags(e.target.value)} /></Field>
      <Field label="Favor" htmlFor="pick-favor"><Select id="pick-favor" value={preferences.favor} onChange={e => setPreferences(p => ({ ...p, favor: e.target.value as typeof p.favor }))}><option value="priority">High priority</option><option value="continue">Continue in progress</option><option value="variety">Variety (random)</option></Select></Field>
    </div>
    <label className="my-3 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={preferences.allowUnknown} onChange={e => setPreferences(p => ({ ...p, allowUnknown: e.target.checked }))} />Include unknown lengths with a time limit</label>
    <div className="flex flex-wrap gap-2"><Button onClick={() => { setChosen(preferences.favor === "variety" ? randomSuggestion(suitable)?.item.id ?? null : null); setShow(true); }}>Choose for me</Button><Button onClick={() => { setChosen(randomSuggestion(suitable)?.item.id ?? null); setShow(true); }}>Pick randomly</Button></div>
    {show && <div className="mt-4 space-y-3" aria-live="polite">{selected ? <><p className="break-words font-medium">{selected.item.title}</p><p className="text-sm text-muted">{selected.reasons.join(" · ")}</p><Button onClick={() => onOpen(selected.item)}>Open title</Button><p className="text-xs text-subtle">{suitable.length} suitable title{ suitable.length === 1 ? "" : "s"}. Random gives each suitable title an equal chance.</p>{suitable.filter(s => s.item.id !== selected.item.id).slice(0, 2).map(s => <div key={s.item.id}><Button className="max-w-full" onClick={() => setChosen(s.item.id)}><span className="truncate">{s.item.title}</span></Button><p className="text-xs text-muted">{s.reasons.join(" · ")}</p></div>)}</> : <p>No suitable titles. Try more time, fewer tags, or add a title with a session estimate.</p>}</div>}
  </details>;
}
