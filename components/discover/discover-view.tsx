"use client";

import { Mail, MapPin } from "lucide-react";
import { useState } from "react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { FilterChips } from "@/components/ui/filter-chips";
import { daysBetween, PROTOTYPE_TODAY } from "@/lib/dates";
import { upcomingEvents } from "@/lib/selectors";
import { useAppState } from "@/lib/store/app-store";
import type { EventCategory } from "@/lib/types";
import { pluralize } from "@/lib/utils";
import { categoryLabel, EventCard, eventWhen } from "./event-card";

type Filter = "all" | "saved" | EventCategory;

export function DiscoverView() {
  const { events } = useAppState();
  const [filter, setFilter] = useState<Filter>("all");
  const upcoming = upcomingEvents(events);

  const matches = (f: Filter) =>
    upcoming.filter((e) => (f === "all" ? true : f === "saved" ? e.saved : e.category === f));
  const visible = matches(filter);

  const options: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: matches("all").length },
    { value: "saved", label: "Saved", count: matches("saved").length },
    ...(Object.keys(categoryLabel) as EventCategory[]).map((c) => ({ value: c, label: categoryLabel[c], count: matches(c).length })),
  ];

  const thisWeek = upcoming.filter((e) => daysBetween(PROTOTYPE_TODAY, e.startsAt.slice(0, 10)) < 7);
  const saved = upcoming.filter((e) => e.saved);

  return (
    <>
      <PageHeader
        title="Discover"
        description="Things to do around town this week. Sample events — live listings come later."
        actions={
          <span className="inline-flex items-center gap-1.5 text-sm text-muted">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Your city (sample)
          </span>
        }
      />

      <div className="mb-4">
        <FilterChips<Filter> label="Filter events" options={options} value={filter} onChange={setFilter} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          {visible.length === 0 ? (
            <EmptyState title={filter === "saved" ? "No saved events yet" : "No events in this category"} description="Use the bookmark button to save events you're interested in." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {visible.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </div>

        <Card className="h-fit xl:sticky xl:top-24" aria-label="Weekly digest preview">
          <CardHeader title="Weekly digest" description="Preview of your Sunday email" icon={<Mail className="h-[18px] w-[18px]" />} />
          <div className="rounded-xl border border-line bg-canvas/60 p-4">
            <p className="text-xs text-subtle">Subject</p>
            <p className="text-sm font-medium">Your week in town: {pluralize(thisWeek.length, "event")}, {saved.length} saved</p>
            <hr className="my-3 border-line" />
            <p className="text-sm text-muted">Hi Lane — here&apos;s what&apos;s coming up:</p>
            <ul className="mt-3 space-y-2.5">
              {thisWeek.slice(0, 5).map((e) => (
                <li key={e.id} className="text-sm">
                  <p className="font-medium">
                    {e.saved && (
                      <>
                        <span className="mr-1 text-accent-strong" aria-hidden="true">★</span>
                        <span className="sr-only">Saved: </span>
                      </>
                    )}
                    {e.title}
                  </p>
                  <p className="text-xs text-subtle">{eventWhen(e)} · {e.price}</p>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs text-subtle">Email delivery isn&apos;t connected in this prototype.</p>
        </Card>
      </div>
    </>
  );
}
