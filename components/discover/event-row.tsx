"use client";

import { parseISODate } from "@/lib/dates";
import type { LocalEvent } from "@/lib/types";
import { eventWhen, SaveEventButton } from "./event-card";

/** Compact event list item with a date tile and save toggle. */
export function EventRow({ event }: { event: LocalEvent }) {
  const date = parseISODate(event.startsAt);
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-raised text-center leading-none" aria-hidden="true">
        <div>
          <p className="text-[10px] font-medium uppercase text-accent-strong">{date.toLocaleDateString("en-US", { month: "short" })}</p>
          <p className="mt-0.5 text-sm font-semibold">{date.getDate()}</p>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{event.title}</p>
        <p className="truncate text-xs text-subtle">
          {eventWhen(event)} · {event.neighborhood}
        </p>
      </div>
      <SaveEventButton event={event} size="sm" />
    </li>
  );
}
