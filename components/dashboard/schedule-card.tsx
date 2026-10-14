"use client";

import { CalendarDays, MapPin } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { formatDueLabel, formatTime } from "@/lib/dates";
import { useAppState } from "@/lib/store/app-store";
import type { ScheduleItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const kindColor: Record<ScheduleItem["kind"], string> = {
  class: "bg-sky-400",
  meeting: "bg-violet-400",
  personal: "bg-emerald-400",
  event: "bg-amber-400",
};

export function ScheduleCard() {
  const { schedule } = useAppState();
  const sorted = [...schedule].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const groups = Map.groupBy(sorted, (item) => item.startsAt.slice(0, 10));

  return (
    <Card>
      <CardHeader title="Upcoming schedule" icon={<CalendarDays className="h-[18px] w-[18px]" />} />
      <div className="space-y-4">
        {[...groups.entries()].map(([date, items]) => (
          <div key={date}>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">{formatDueLabel(date)}</h3>
            <ol className="space-y-1">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-raised/60">
                  <span className={cn("mt-1 w-1 shrink-0 self-stretch rounded-full", kindColor[item.kind])} aria-hidden="true" />
                  <div className="w-16 shrink-0 text-xs tabular-nums text-muted">
                    <time dateTime={item.startsAt}>{formatTime(item.startsAt)}</time>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    {item.location && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-subtle">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                        {item.location}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </Card>
  );
}
