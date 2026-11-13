import { NASA_FEED_URL, NASA_LIMITS, nasaArticleUrl } from "./policy";
import { nasaPublicationDate, validFeedClock } from "./nasa";
import type { NasaCandidate, NasaSnapshot, RejectedNasaItem, RejectionReason } from "./types";

export const NASA_SNAPSHOT_BYTES = 262_144;
const SUMMARY = "Feed metadata only; open the publisher's article.";
const reasons: readonly RejectionReason[] = ["missing-field", "ambiguous-field", "invalid-field", "invalid-url", "invalid-date", "future-date", "duplicate-conflict"];
const invalid = () => new Error("invalid-snapshot");
function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw invalid();
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw invalid();
  return value;
}
function instant(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw invalid();
  return value;
}
function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > NASA_LIMITS.items) throw invalid();
  return value;
}

/** Structural validation only, not provenance/authentication or rollback protection.
 * Rebuilds allowlisted metadata from bounded serialized storage; never freshens it.
 * The transport alone promotes this result to a frozen baseline capability.
 */
export function decodeNasaSnapshot(serialized: string, now: number): NasaSnapshot {
  if (!validFeedClock(now) || typeof serialized !== "string" || serialized.length > NASA_SNAPSHOT_BYTES || new TextEncoder().encode(serialized).byteLength > NASA_SNAPSHOT_BYTES) throw invalid();
  let json: unknown;
  try { json = JSON.parse(serialized); } catch { throw invalid(); }
  const data = record(json, ["schemaVersion", "feedUrl", "bodyFetchedAt", "representationCheckedAt", "etag", "lastModified", "candidates", "rejected", "inputCount", "duplicateCount", "omittedCount"]);
  if (data.schemaVersion !== 1 || data.feedUrl !== NASA_FEED_URL) throw invalid();
  const bodyFetchedAt = instant(data.bodyFetchedAt), representationCheckedAt = instant(data.representationCheckedAt);
  if (bodyFetchedAt > representationCheckedAt || Date.parse(representationCheckedAt) > now) throw invalid();
  const etag = data.etag;
  if (etag !== null && (typeof etag !== "string" || etag.length > 256 || !/^(W\/)?"[\x21\x23-\x7e\x80-\xff]*"$/.test(etag))) throw invalid();
  const lastModified = data.lastModified;
  if (lastModified !== null && (typeof lastModified !== "string" || !nasaPublicationDate(lastModified) || new Date(nasaPublicationDate(lastModified)!).toUTCString() !== lastModified)) throw invalid();
  const inputCount = count(data.inputCount), duplicateCount = count(data.duplicateCount), omittedCount = count(data.omittedCount);
  if (!Array.isArray(data.candidates) || data.candidates.length > NASA_LIMITS.output || !Array.isArray(data.rejected) || data.rejected.length > NASA_LIMITS.items) throw invalid();
  const urls = new Set<string>(), identities = new Set<string>();
  const candidates: NasaCandidate[] = data.candidates.map(value => {
    const row = record(value, ["sourceId", "sourceItemIds", "title", "url", "publishedAt", "author", "format", "access", "summary"]);
    if (row.sourceId !== "nasa" || row.format !== "institutional-update" || row.access !== "unknown") throw invalid();
    const title = text(row.title, NASA_LIMITS.title), url = text(row.url, NASA_LIMITS.url), publishedAt = instant(row.publishedAt);
    if (nasaArticleUrl(url) !== url || urls.has(url) || publishedAt < "1970-01-01T00:00:00.000Z" || publishedAt > bodyFetchedAt) throw invalid();
    urls.add(url);
    const author = row.author === null ? null : text(row.author, NASA_LIMITS.author);
    const summary = record(row.summary, ["kind", "reason"]);
    if (summary.kind !== "unavailable" || summary.reason !== SUMMARY) throw invalid();
    if (!Array.isArray(row.sourceItemIds) || !row.sourceItemIds.length || row.sourceItemIds.length > NASA_LIMITS.items) throw invalid();
    const sourceItemIds = row.sourceItemIds.map(value => {
      const id = text(value, NASA_LIMITS.guid);
      if (identities.has(id)) throw invalid();
      identities.add(id); return id;
    });
    return { sourceId: "nasa", sourceItemIds, title, url, publishedAt, author, format: "institutional-update", access: "unknown", summary: { kind: "unavailable", reason: SUMMARY } };
  });
  let lastIndex = -1;
  const rejected: RejectedNasaItem[] = data.rejected.map(value => {
    const row = record(value, ["index", "reason"]), index = count(row.index);
    if (index <= lastIndex || index >= inputCount || !reasons.includes(row.reason as RejectionReason)) throw invalid();
    lastIndex = index; return { index, reason: row.reason as RejectionReason };
  });
  if (candidates.length + rejected.length + duplicateCount + omittedCount !== inputCount || identities.size > candidates.length + duplicateCount || (omittedCount > 0 && candidates.length !== NASA_LIMITS.output)) throw invalid();
  return { schemaVersion: 1, feedUrl: NASA_FEED_URL, bodyFetchedAt, representationCheckedAt, etag, lastModified, candidates, rejected, inputCount, duplicateCount, omittedCount };
}
