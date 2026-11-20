import type { DiscoverItem } from "../types";
import { decodeDailySnapshot, dailySnapshotItems } from "./snapshot";
import { dailySources } from "./policy";
import { dailyUpdatesOff, type DailyUpdateStatus } from "./status";

/** Reading stored data never fetches a publisher or changes editorial checks. */
export async function readDailyCatalog({ enabled, read, now }: { enabled: boolean; read: () => Promise<string | null>; now: number | (() => number) }): Promise<{ items: DiscoverItem[]; updates: DailyUpdateStatus }> {
  if (!enabled) return { items: [], updates: dailyUpdatesOff };
  try {
    const text = await read(); if (text === null) throw Error("missing");
    const snapshot = decodeDailySnapshot(text, typeof now === "function" ? now() : now);
    return { items: dailySnapshotItems(snapshot), updates: { enabled: true, available: true, sources: snapshot.sources.map(source => ({
      id: source.id, name: dailySources[source.id].name, kind: dailySources[source.id].kind, checkedAt: source.checkedAt, failed: source.error !== null,
    })) } };
  } catch { return { items: [], updates: { enabled: true, available: false, sources: [] } }; }
}

export function mergeDailyItems(saved: readonly DiscoverItem[], daily: { items: readonly DiscoverItem[]; updates: DailyUpdateStatus }): DiscoverItem[] {
  const hasDailyNasa = daily.updates.sources.some(source => source.id === "nasa-daily" && source.checkedAt !== null);
  return [...saved.filter(item => !hasDailyNasa || item.evidence.level !== "publisher-feed"), ...daily.items];
}
