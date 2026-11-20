import { DAILY_BODY_BYTES, dailySources, type DailySourceId } from "./policy";
import { decodeDailySnapshot, type DailySnapshot, type DailySourceState } from "./snapshot";
import { parseDailyFeed } from "./parsers";
import type { FeedFetcher } from "../feeds/types";

export async function boundedBody(response: Response, max: number): Promise<string> {
  if (!response.body || Number(response.headers.get("content-length") ?? 0) > max) throw Error("invalid-body");
  const reader = response.body.getReader(), decoder = new TextDecoder("utf-8", { fatal: true });
  const parts: string[] = []; let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      if ((bytes += value.byteLength) > max) throw Error("body-too-large");
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode()); return parts.join("");
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
/** No retry, no redirects, no article/detail fetching, no global fetch fallback. */
export async function completeDaily({ snapshot, ids, at, fetcher, now }: {
  snapshot: DailySnapshot; ids: DailySourceId[]; at: string; fetcher: FeedFetcher; now: () => number;
}): Promise<DailySnapshot> {
  decodeDailySnapshot(JSON.stringify(snapshot), now());
  const sources: DailySourceState[] = [];
  for (const previous of snapshot.sources) {
    if (!ids.includes(previous.id)) { sources.push(previous); continue; }
    if (previous.attempts.at(-1) !== at || previous.error !== "pending" || now() - Date.parse(at) > 5 * 60_000) throw Error("invalid-reservation");
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(Error("timeout")); }, 15_000); });
    let next: DailySourceState = { ...previous, error: "request-failed" };
    try {
      const headers = new Headers({ Accept: previous.id === "ruston-athletics" ? "text/calendar" : "application/rss+xml, application/xml;q=0.9", "User-Agent": "LanesLair-Discover-Daily/1.0 (+https://laneslair.vercel.app)" });
      if (previous.etag) headers.set("If-None-Match", previous.etag);
      else if (previous.lastModified) headers.set("If-Modified-Since", previous.lastModified);
      const response = await Promise.race([fetcher(dailySources[previous.id].url, { headers, redirect: "manual", credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store", signal: controller.signal }), deadline]);
      if (response.redirected || response.url && response.url !== dailySources[previous.id].url) throw Error("redirect");
      if (response.status === 304) {
        void response.body?.cancel().catch(() => {});
        if (!previous.checkedAt || !previous.etag && !previous.lastModified) throw Error("invalid-304");
        next = { ...previous, checkedAt: new Date(now()).toISOString(), error: null, retryAfterAt: null };
      } else if (response.status === 200 && (previous.id === "ruston-athletics" ? /^text\/calendar\b/i : /^(application\/(rss\+xml|xml)|text\/xml)\b/i).test(response.headers.get("content-type") ?? "")) {
        const body = await Promise.race([boundedBody(response, DAILY_BODY_BYTES), deadline]);
        next.error = "parse-failed";
        const checkedAt = new Date(now()).toISOString(), items = parseDailyFeed(previous.id, body, now());
        if (controller.signal.aborted) throw Error("timeout");
        const rawEtag = response.headers.get("etag"), rawModified = response.headers.get("last-modified");
        next = { ...previous, items, checkedAt, fetchedAt: checkedAt, error: null, retryAfterAt: null,
          etag: rawEtag && rawEtag.length <= 256 && /^(W\/)?"[\x21\x23-\x7e\x80-\xff]*"$/.test(rawEtag) ? rawEtag : null,
          lastModified: rawModified && rawModified.length <= 64 && !/[\r\n]/.test(rawModified) && Number.isFinite(Date.parse(rawModified)) && Date.parse(rawModified) <= now() ? rawModified : null };
      } else {
        void response.body?.cancel().catch(() => {});
        const retry = response.headers.get("retry-after") ?? "";
        const retryTime = /^\d{1,8}$/.test(retry) ? now() + Number(retry) * 1000 : Date.parse(retry);
        if (Number.isFinite(retryTime) && retryTime > now()) next.retryAfterAt = new Date(Math.min(retryTime, now() + 30 * 86_400_000)).toISOString();
      }
    } catch { /* Retain the previous successful items and clocks; reservation remains spent. */ }
    finally { clearTimeout(timer!); controller.abort(); }
    sources.push(next);
  }
  return decodeDailySnapshot(JSON.stringify({ ...snapshot, sources, updatedAt: new Date(now()).toISOString() }), now());
}
