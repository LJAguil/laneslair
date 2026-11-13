import { NASA_FEED_URL, NASA_LIMITS, NasaFeedError, nasaPublicationDate, parseNasaFeed, validFeedClock } from "./nasa";
import type { FeedFetcher, NasaFetchResult, NasaSnapshot } from "./types";
import { decodeNasaSnapshot } from "./snapshot";

// Only importer results or explicitly validated storage round trips become capabilities.
const baselines = new WeakSet<NasaSnapshot>();
function freezeSnapshot(snapshot: NasaSnapshot): NasaSnapshot {
  for (const candidate of snapshot.candidates) {
    Object.freeze(candidate.sourceItemIds); Object.freeze(candidate.summary); Object.freeze(candidate);
  }
  for (const rejection of snapshot.rejected) Object.freeze(rejection);
  Object.freeze(snapshot.candidates); Object.freeze(snapshot.rejected); Object.freeze(snapshot);
  baselines.add(snapshot);
  return snapshot;
}

/** Storage is supplied by a later caller; no filesystem, browser storage or network. */
export function serializeNasaSnapshot(snapshot: NasaSnapshot): string {
  if (!baselines.has(snapshot)) throw new Error("invalid-baseline");
  return JSON.stringify(snapshot);
}

export type NasaRestoreResult = { status: "restored"; snapshot: NasaSnapshot } | { status: "failed"; reason: "invalid-snapshot" };
export function restoreNasaSnapshot(serialized: string, now: number): NasaRestoreResult {
  try { return { status: "restored", snapshot: freezeSnapshot(decodeNasaSnapshot(serialized, now)) }; }
  catch { return { status: "failed", reason: "invalid-snapshot" }; }
}
function validators(headers: Headers, previous?: NasaSnapshot) {
  const value = headers.get("etag");
  const etag = value && value.length <= 256 && /^(W\/)?"[\x21\x23-\x7e\x80-\xff]*"$/.test(value) ? value : null;
  const lastModified = nasaPublicationDate(headers.get("last-modified") ?? "");
  return { etag: etag ?? previous?.etag ?? null, lastModified: lastModified ? new Date(lastModified).toUTCString() : previous?.lastModified ?? null };
}
function retryAfter(headers: Headers, now: number): string | undefined {
  const value = headers.get("retry-after") ?? "";
  const time = /^\d{1,6}$/.test(value) ? now + Number(value) * 1000 : Date.parse(nasaPublicationDate(value) ?? "");
  return Number.isFinite(time) && time >= now && time <= now + 7 * 86_400_000 ? new Date(time).toISOString() : undefined;
}

/** One explicitly injected request, no retries/global fetch/app wiring/persistence. */
export async function fetchNasaFeed({ fetcher, now, previous }: {
  fetcher: FeedFetcher; now: () => number; previous?: NasaSnapshot;
}): Promise<NasaFetchResult> {
  const started = now();
  if (!validFeedClock(started)) return { status: "failed", reason: "invalid-clock" };
  if (previous && (!baselines.has(previous) || Date.parse(previous.representationCheckedAt) > started)) return { status: "failed", reason: "invalid-baseline" };
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let response: Response | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const operation = async (): Promise<NasaFetchResult> => {
    const headers = new Headers({ Accept: "application/rss+xml, application/xml;q=0.9", "User-Agent": "LanesLair-Discover-Importer/0.1" });
    if (previous?.etag) headers.set("If-None-Match", previous.etag);
    else if (previous?.lastModified) headers.set("If-Modified-Since", previous.lastModified);
    response = await fetcher(NASA_FEED_URL, { method: "GET", headers, redirect: "manual", credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store", signal: controller.signal });
    if (controller.signal.aborted) {
      if (response.body) void response.body.cancel().catch(() => {});
      throw new NasaFeedError("timeout");
    }
    if (response.redirected || (response.url && response.url !== NASA_FEED_URL) || (response.status >= 300 && response.status < 400 && response.status !== 304)) throw new NasaFeedError("redirect");
    const checked = now();
    if (!validFeedClock(checked) || checked < started) throw new NasaFeedError("invalid-clock");
    if (response.status === 304) {
      if (!previous) throw new NasaFeedError("not-modified-without-baseline");
      if (!previous.etag && !previous.lastModified) throw new NasaFeedError("not-modified-without-validator");
      return { status: "not-modified", snapshot: freezeSnapshot({ ...previous, representationCheckedAt: new Date(checked).toISOString(), ...validators(response.headers, previous) }) };
    }
    if (response.status !== 200) return { status: "failed", reason: "http-error", httpStatus: response.status, retryAfterAt: retryAfter(response.headers, checked) };
    const contentType = response.headers.get("content-type") ?? "";
    if (!/^(application\/(rss\+xml|xml)|text\/xml)(\s*;\s*charset\s*=\s*"?(utf-8|us-ascii)"?)?\s*$/i.test(contentType)) throw new NasaFeedError("unsupported-content-type");
    const length = response.headers.get("content-length");
    if (length && /^\d+$/.test(length) && Number(length) > NASA_LIMITS.bytes) throw new NasaFeedError("too-large");
    if (!response.body) throw new NasaFeedError("missing-body");
    reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    const parts: string[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (controller.signal.aborted) throw new NasaFeedError("timeout");
      if (done) break;
      size += value.byteLength;
      if (size > NASA_LIMITS.bytes) throw new NasaFeedError("too-large");
      try { parts.push(decoder.decode(value, { stream: true })); } catch { throw new NasaFeedError("invalid-encoding"); }
    }
    try { parts.push(decoder.decode()); } catch { throw new NasaFeedError("invalid-encoding"); }
    const finished = now();
    if (!validFeedClock(finished) || finished < checked) throw new NasaFeedError("invalid-clock");
    if (controller.signal.aborted) throw new NasaFeedError("timeout");
    const parsed = parseNasaFeed(parts.join(""), finished);
    if (controller.signal.aborted) throw new NasaFeedError("timeout");
    return { status: "updated", snapshot: freezeSnapshot({ ...parsed, schemaVersion: 1, feedUrl: NASA_FEED_URL, bodyFetchedAt: new Date(finished).toISOString(), representationCheckedAt: new Date(finished).toISOString(), ...validators(response.headers) }) };
  };
  try {
    return await Promise.race([operation(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new NasaFeedError("timeout")); }, NASA_LIMITS.deadlineMs);
    })]);
  } catch (error) {
    return { status: "failed", reason: controller.signal.aborted ? "timeout" : error instanceof NasaFeedError ? error.code : "network-error" };
  } finally {
    clearTimeout(timer);
    // Never wait on an uncooperative network stream during cleanup.
    if (reader) { void reader.cancel().catch(() => {}); try { reader.releaseLock(); } catch { /* pending read is canceled */ } }
    else if (response?.body) { void response.body.cancel().catch(() => {}); }
  }
}
