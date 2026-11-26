import type { DiscoverItem } from "../types";
import { DAILY_ITEMS_PER_SOURCE, DAILY_SNAPSHOT_BYTES, dailyArticleUrl, dailySourceIds, dailySources, type DailySourceId } from "./policy";
import { instant, plain, type DailyRecord } from "./parsers";

export interface DailySourceState {
  id: DailySourceId; attempts: string[]; checkedAt: string | null; fetchedAt: string | null;
  etag: string | null; lastModified: string | null; error: "pending" | "request-failed" | "parse-failed" | null;
  retryAfterAt: string | null;
  items: DailyRecord[];
}
export interface DailySnapshot { version: 1; updatedAt: string; sources: DailySourceState[] }
export function emptyDailySnapshot(now: number): DailySnapshot {
  return { version: 1, updatedAt: new Date(now).toISOString(), sources: dailySourceIds.map(id => ({ id, attempts: [], checkedAt: null, fetchedAt: null, etag: null, lastModified: null, retryAfterAt: null, error: null, items: [] })) };
}
/** Carry known earlier captures into the first durable ledger; never invent a feed check. */
export function bootstrapDailySnapshot(now: number): DailySnapshot {
  const previousAttempts: Record<DailySourceId, string> = {
    "nasa-daily": "2026-11-13T19:30:14.739Z",
    "illuminator-daily": "2026-11-20T05:18:28.000Z",
    "ruston-athletics": "2026-11-20T05:17:54.000Z",
  };
  const snapshot = emptyDailySnapshot(now);
  for (const source of snapshot.sources) source.attempts = [previousAttempts[source.id]];
  return decodeDailySnapshot(JSON.stringify(snapshot), now);
}
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
function keys(value: Record<string, unknown>, allowed: string[]) { return Object.keys(value).sort().join() === [...allowed].sort().join(); }
function recordValid(value: unknown, id: DailySourceId, now: number): value is DailyRecord {
  if (!object(value) || !plain(value.id, 300) || !plain(value.title, 300) || typeof value.url !== "string" || dailyArticleUrl(id, value.url) !== value.url) return false;
  if (id === "ruston-athletics") return keys(value, ["kind", "id", "title", "url", "startsAt", "endsAt", "venue", "city", "status"]) && value.kind === "event" &&
    instant(value.startsAt) && (value.endsAt === null || instant(value.endsAt) && Date.parse(value.endsAt) > Date.parse(value.startsAt)) &&
    value.venue === "Ruston High School" && value.city === "Ruston" && (value.status === "scheduled" || value.status === "canceled");
  return keys(value, ["kind", "id", "title", "url", "publishedAt", "author", "topics", "format"]) && value.kind === "news" && value.id === value.url &&
    instant(value.publishedAt) && Date.parse(value.publishedAt) <= now && (value.author === null || plain(value.author, 200)) &&
    Array.isArray(value.topics) && value.topics.length > 0 && value.topics.length <= 3 && value.topics.every(topic => typeof topic === "string" && ["louisiana", "national", "science", "discovery"].includes(topic)) &&
    (id === "nasa-daily" ? value.format === "institutional-update" : value.format === "opinion" || value.format === "unclassified");
}
/** Untrusted storage boundary. No type cast substitutes for field validation. */
export function decodeDailySnapshot(text: string, now: number): DailySnapshot {
  if (!Number.isFinite(now) || new TextEncoder().encode(text).length > DAILY_SNAPSHOT_BYTES) throw Error("invalid-snapshot");
  const value: unknown = JSON.parse(text);
  const clock = (time: unknown) => instant(time) && Date.parse(time) <= now;
  if (!object(value) || !keys(value, ["version", "updatedAt", "sources"]) || value.version !== 1 || !clock(value.updatedAt) || !Array.isArray(value.sources) || value.sources.length !== dailySourceIds.length) throw Error("invalid-snapshot");
  const seen = new Set<string>();
  for (const source of value.sources) {
    if (!object(source) || !keys(source, ["id", "attempts", "checkedAt", "fetchedAt", "etag", "lastModified", "retryAfterAt", "error", "items"]) || !dailySourceIds.includes(source.id as DailySourceId) || seen.has(String(source.id))) throw Error("invalid-source");
    seen.add(String(source.id));
    const attempts = source.attempts;
    if (!Array.isArray(attempts) || attempts.length > 4 || attempts.some((time, index) => !clock(time) || Date.parse(time) > Date.parse(String(value.updatedAt)) || index > 0 && time <= attempts[index - 1])) throw Error("invalid-attempts");
    if ((source.checkedAt === null) !== (source.fetchedAt === null) || source.checkedAt !== null && (!clock(source.checkedAt) || !clock(source.fetchedAt) || Date.parse(String(source.fetchedAt)) > Date.parse(String(source.checkedAt)) || Date.parse(String(source.checkedAt)) > Date.parse(String(value.updatedAt)))) throw Error("invalid-check");
    if (source.checkedAt !== null && attempts.length === 0) throw Error("missing-attempt-history");
    if (source.etag !== null && (typeof source.etag !== "string" || source.etag.length > 256 || !/^(W\/)?"[\x21\x23-\x7e\x80-\xff]*"$/.test(source.etag))) throw Error("invalid-validator");
    if (source.lastModified !== null && (typeof source.lastModified !== "string" || source.lastModified.length > 64 || /[\r\n]/.test(source.lastModified) || !Number.isFinite(Date.parse(source.lastModified)) || Date.parse(source.lastModified) > now)) throw Error("invalid-validator");
    if (source.retryAfterAt !== null && (!instant(source.retryAfterAt) || Date.parse(source.retryAfterAt) > now + 30 * 86_400_000)) throw Error("invalid-retry-time");
    if (![null, "pending", "request-failed", "parse-failed"].includes(source.error as null) || !Array.isArray(source.items) || source.items.length > DAILY_ITEMS_PER_SOURCE || source.checkedAt === null && source.items.length || source.items.some(item => !recordValid(item, source.id as DailySourceId, now) || item.kind === "news" && Date.parse(item.publishedAt) > Date.parse(String(source.fetchedAt)))) throw Error("invalid-items");
    if (new Set(source.items.map(item => item.id)).size !== source.items.length) throw Error("duplicate-items");
  }
  return value as unknown as DailySnapshot;
}
/** Persist this reservation before any publisher request, including failed attempts. */
export function reserveDaily(snapshot: DailySnapshot, now: number): { snapshot: DailySnapshot; ids: DailySourceId[]; at: string } {
  const at = new Date(now).toISOString(), ids: DailySourceId[] = [];
  const sources = snapshot.sources.map(source => {
    const last = source.attempts.at(-1);
    if (source.retryAfterAt && now < Date.parse(source.retryAfterAt) || last && (at.slice(0, 10) <= last.slice(0, 10) || now - Date.parse(last) < 6 * 3_600_000)) return source;
    ids.push(source.id);
    return { ...source, attempts: [...source.attempts, at].slice(-4), error: "pending" as const };
  });
  // A no-op is not persisted by prepare. Preserve the exact durable representation
  // so fetch can verify it and report the cooldown without a false state conflict.
  return { snapshot: ids.length ? { ...snapshot, updatedAt: at, sources } : snapshot, ids, at };
}
export function dailySnapshotItems(snapshot: DailySnapshot): DiscoverItem[] {
  return snapshot.sources.flatMap(source => source.items.map((item): DiscoverItem => {
    const evidence = { level: "subscription-feed" as const, sourceId: source.id, sourceItemId: item.id, url: item.url,
      feedUrl: dailySources[source.id].url, verifiedAt: null, sourceUpdatedAt: null,
      fetchedAt: source.fetchedAt!, representationCheckedAt: source.checkedAt! };
    return item.kind === "news" ? { id: `${source.id}:${item.id}`, kind: "news", status: "scheduled", title: item.title, evidence,
      publishedAt: item.publishedAt, author: item.author, topics: item.topics, format: item.format, access: "unknown",
      summary: { kind: "unavailable", reason: "Automatically imported headline metadata; open the publisher's article." } }
      : { id: `${source.id}:${item.id}`, kind: "event", status: item.status, title: item.title, evidence,
        window: item.endsAt ? { kind: "timed", startsAt: item.startsAt, endsAt: item.endsAt, timeZone: "America/Chicago" } : { kind: "start-only", startsAt: item.startsAt, timeZone: "America/Chicago" },
        venue: item.venue, city: item.city, category: "community", travel: "nearby", price: { kind: "unknown" }, admission: "unknown", registrationUrl: null,
        description: "School athletics calendar subscription. Admission, ticket prices and spectator requirements are not supplied; check the official schedule before going." };
  }));
}
