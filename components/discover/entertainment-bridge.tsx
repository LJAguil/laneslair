"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { repository } from "@/lib/entertainment/repository";
import { createClient } from "@/lib/supabase/client";
import { DiscoverLibrarySession, type DiscoverLibraryState } from "@/lib/discover/entertainment";
import type { DiscoverTitle } from "@/lib/discover/types";

export function DiscoverEntertainmentBridge({ userId, children }: { userId: string; children: (add: (title: DiscoverTitle, url: string) => void) => ReactNode }) {
  const [session] = useState(() => new DiscoverLibrarySession(repository(userId), userId, () => crypto.randomUUID()));
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const [selected, setSelected] = useState<{ title: DiscoverTitle; url: string } | null>(null);
  useEffect(() => {
    session.activate();
    const client = createClient();
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      if (next?.user.id !== userId) { session.expire(); setSelected(null); }
    });
    return () => { data.subscription.unsubscribe(); session.expire(); };
  }, [session, userId]);
  const add = (title: DiscoverTitle, url: string) => { setSelected({ title, url }); void session.open(title, url); };
  return <>{children(add)}<Dialog open={!["idle", "expired"].includes(state.phase)} onClose={() => session.close()} dismissible={state.phase !== "saving"} title="Add to Entertainment" description="Save this title to your Planned list. You can edit it later in Entertainment.">
    <EntertainmentImportDetails state={state} />
    <div className="mt-5 flex flex-wrap gap-2">
      {state.phase === "ready" && <Button className="min-h-11" variant="primary" onClick={() => void session.save()}>Save to Planned</Button>}
      {state.phase === "error" && selected && <Button className="min-h-11" onClick={() => void session.open(selected.title, selected.url)}>Retry check</Button>}
      {["saved", "exists"].includes(state.phase) && <Link className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-medium text-on-accent" href="/entertainment">Open Entertainment</Link>}
      <Button className="min-h-11" disabled={state.phase === "saving"} onClick={() => session.close()}>{["saved", "exists"].includes(state.phase) ? "Done" : "Cancel"}</Button>
    </div>
  </Dialog>{state.phase === "expired" && <p role="alert" className="mt-3 text-sm text-danger">{state.error}</p>}</>;
}
export function EntertainmentImportDetails({ state }: { state: DiscoverLibraryState }) {
  return <div className="space-y-3 text-sm">
    {state.draft && <><p className="text-lg font-semibold">{state.draft.title}</p><p className="text-muted">{state.draft.tags.includes("anime") ? "Anime · " : ""}{state.draft.media === "game" ? "Game" : state.draft.media === "show" ? "Show" : "Movie"}{state.draft.platform ? ` · ${state.draft.platform}` : ""}</p><p className="whitespace-pre-wrap text-xs text-subtle [overflow-wrap:anywhere]">{state.draft.note}</p></>}
    {state.phase === "checking" && <p role="status">Checking your Entertainment list…</p>}
    {state.phase === "saving" && <p role="status">Saving title…</p>}
    {state.phase === "saved" && <p role="status" className="text-accent-strong">Added to Entertainment · Planned.</p>}
    {state.phase === "exists" && <p role="status">Already in Entertainment{state.existing?.archived ? " (archived)" : ""}. Your existing status and notes were kept.</p>}
    {state.error && <p role="alert" className="text-danger">{state.error}</p>}
  </div>;
}
