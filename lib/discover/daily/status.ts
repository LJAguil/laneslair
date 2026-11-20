import type { DailySourceId } from "./policy";

/** Serializable public update state only; no storage credentials or parser dependencies. */
export interface DailyUpdateStatus {
  enabled: boolean;
  available: boolean;
  sources: { id: DailySourceId; name: string; kind: "news" | "event"; checkedAt: string | null; failed: boolean }[];
}
export const dailyUpdatesOff: DailyUpdateStatus = { enabled: false, available: false, sources: [] };
