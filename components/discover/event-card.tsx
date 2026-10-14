"use client";

import { Bookmark, BookmarkCheck, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDueLabel, formatTime } from "@/lib/dates";
import { useAppActions } from "@/lib/store/app-store";
import type { EventCategory, LocalEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

export const categoryLabel: Record<EventCategory, string> = {
  music: "Music",
  food: "Food & drink",
  tech: "Tech",
  outdoors: "Outdoors",
  arts: "Arts",
  community: "Community",
};

export function SaveEventButton({ event, size = "md" }: { event: LocalEvent; size?: "sm" | "md" }) {
  const { toggleEventSaved } = useAppActions();
  const Icon = event.saved ? BookmarkCheck : Bookmark;
  return (
    <button
      type="button"
      onClick={() => toggleEventSaved(event.id)}
      aria-pressed={event.saved}
      aria-label={`${event.saved ? "Unsave" : "Save"} ${event.title}`}
      className={cn(
        "grid shrink-0 place-items-center rounded-lg border transition-colors",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        event.saved ? "border-accent/40 bg-accent-soft text-accent-strong" : "border-line text-subtle hover:border-line-strong hover:text-fg",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

/** Date + time label, e.g. "Tomorrow · 8 PM". */
export function eventWhen(event: LocalEvent) {
  return `${formatDueLabel(event.startsAt.slice(0, 10))} · ${formatTime(event.startsAt)}`;
}

export function EventCard({ event }: { event: LocalEvent }) {
  return (
    <article className="flex flex-col rounded-2xl border border-line bg-panel p-5 transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <Badge tone="accent">{categoryLabel[event.category]}</Badge>
        <SaveEventButton event={event} />
      </div>
      <h3 className="mt-3 text-[15px] font-semibold leading-snug">{event.title}</h3>
      <p className="mt-1 text-sm font-medium text-accent-strong">{eventWhen(event)}</p>
      <p className="mt-2 flex-1 text-sm text-muted">{event.description}</p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-subtle">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {event.venue} · {event.neighborhood}
          </span>
        </span>
        <span className="shrink-0 font-medium text-fg">{event.price}</span>
      </div>
    </article>
  );
}
