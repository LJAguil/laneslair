import { describe, expect, it, vi } from "vitest";
import { FEED_NOW, fixtureFeed, fixtureItem } from "./nasa.fixtures";
import { NASA_SNAPSHOT_BYTES } from "./snapshot";
import { fetchNasaFeed, restoreNasaSnapshot, serializeNasaSnapshot } from "./transport";
import { nasaSnapshotToNews } from "./to-news";
import { assessItem } from "../catalog";
import { discoverSources } from "../sources";
import type { NasaSnapshot } from "./types";

async function baseline(headers: HeadersInit = { ETag: 'W/"invented"', "Last-Modified": "Thu, 12 Nov 2026 05:05:00 GMT" }, xml = fixtureFeed()) {
  const result = await fetchNasaFeed({ fetcher: async () => new Response(xml, { headers: { "content-type": "application/rss+xml", ...headers } }), now: () => FEED_NOW });
  if (result.status === "failed") throw new Error(result.reason);
  return result.snapshot;
}
async function stored() { return serializeNasaSnapshot(await baseline()); }
const failed = { status: "failed", reason: "invalid-snapshot" };

describe("offline NASA snapshot storage boundary", () => {
  it("restores across a module restart and permits a mocked conditional 304", async () => {
    const serialized = await stored();
    vi.resetModules();
    const restarted = await import("./transport");
    const restored = restarted.restoreNasaSnapshot(serialized, FEED_NOW + 3_600_000);
    expect(restored.status).toBe("restored");
    if (restored.status !== "restored") throw new Error("Expected restoration");
    expect(restored.snapshot).toEqual(JSON.parse(serialized));
    expect(Object.isFrozen(restored.snapshot)).toBe(true);
    expect(Object.isFrozen(restored.snapshot.candidates[0].summary)).toBe(true);
    expect(Object.isFrozen(restored.snapshot.candidates[0].sourceItemIds)).toBe(true);
    const fetcher = vi.fn<(_url: string, _init: RequestInit) => Promise<Response>>(async () => new Response(null, { status: 304 }));
    const result = await restarted.fetchNasaFeed({ fetcher, now: () => FEED_NOW + 3_600_000, previous: restored.snapshot });
    expect(result.status).toBe("not-modified");
    expect(new Headers(fetcher.mock.calls[0][1].headers).get("If-None-Match")).toBe('W/"invented"');
    if (result.status === "failed") throw new Error(result.reason);
    expect(result.snapshot.bodyFetchedAt).toBe(restored.snapshot.bodyFetchedAt);
    expect(result.snapshot.representationCheckedAt).toBe(new Date(FEED_NOW + 3_600_000).toISOString());
    expect(JSON.parse(restarted.serializeNasaSnapshot(restored.snapshot))).toEqual(JSON.parse(serialized));
  });

  it("keeps raw JSON and decoder-shaped copies outside the capability boundary", async () => {
    const previous = JSON.parse(await stored()) as NasaSnapshot;
    expect(() => serializeNasaSnapshot(previous)).toThrow("invalid-baseline");
    const fetcher = vi.fn();
    expect(await fetchNasaFeed({ fetcher, now: () => FEED_NOW, previous })).toEqual({ status: "failed", reason: "invalid-baseline" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Deliberately corrupt untrusted JSON fields with values outside the schema.
  const mutations: [string, (data: Record<string, any>) => void][] = [
    ["unsupported schema", d => { d.schemaVersion = 2; }],
    ["wrong endpoint", d => { d.feedUrl = "https://example.invalid/feed"; }],
    ["extra body field", d => { d.body = "discard me"; }],
    ["missing field", d => { delete d.etag; }],
    ["future check", d => { d.representationCheckedAt = "2026-11-13T18:00:00.000Z"; }],
    ["reversed timestamps", d => { d.bodyFetchedAt = "2026-11-12T19:00:00.000Z"; }],
    ["normalized calendar date", d => { d.bodyFetchedAt = "2026-02-30T18:00:00.000Z"; }],
    ["implicit time zone", d => { d.bodyFetchedAt = "2026-11-12T18:00:00"; }],
    ["header injection", d => { d.etag = '"x"\r\nInjected: yes'; }],
    ["oversized validator", d => { d.etag = '"' + "x".repeat(256) + '"'; }],
    ["invalid last modified", d => { d.lastModified = "yesterday"; }],
    ["wrong publisher", d => { d.candidates[0].sourceId = "other"; }],
    ["unsafe article", d => { d.candidates[0].url = "https://www.nasa.gov.evil.invalid/story"; }],
    ["noncanonical URL", d => { d.candidates[0].url += "#fragment"; }],
    ["overlong title", d => { d.candidates[0].title = "x".repeat(301); }],
    ["blank title", d => { d.candidates[0].title = " "; }],
    ["control character", d => { d.candidates[0].author = "author\u0000"; }],
    ["publication after retrieval", d => { d.candidates[0].publishedAt = "2026-11-12T19:00:00.000Z"; }],
    ["publication before supported epoch", d => { d.candidates[0].publishedAt = "1969-11-12T19:00:00.000Z"; }],
    ["summary injection", d => { d.candidates[0].summary = { kind: "original", text: "invented" }; }],
    ["unrecognized summary", d => { d.candidates[0].summary.reason = "arbitrary stored text"; }],
    ["editorial stamp", d => { d.candidates[0].verifiedAt = d.bodyFetchedAt; }],
    ["unsupported access claim", d => { d.candidates[0].access = "open"; }],
    ["reporting claim", d => { d.candidates[0].format = "reporting"; }],
    ["empty identities", d => { d.candidates[0].sourceItemIds = []; }],
    ["duplicate identity", d => { d.candidates[0].sourceItemIds.push(d.candidates[0].sourceItemIds[0]); }],
    ["too many identities", d => { d.candidates[0].sourceItemIds = Array.from({ length: 51 }, (_, i) => `id${i}`); }],
    ["duplicate article", d => { d.candidates.push({ ...d.candidates[0], sourceItemIds: ["another-id"] }); d.inputCount++; }],
    ["shared identity", d => { d.candidates.push({ ...d.candidates[0], url: "https://www.nasa.gov/another-invented/" }); d.inputCount++; }],
    ["fractional count", d => { d.inputCount = 1.5; }],
    ["negative count", d => { d.duplicateCount = -1; }],
    ["inconsistent total", d => { d.inputCount = 2; }],
    ["too many outputs", d => { d.candidates = Array(11).fill(d.candidates[0]); }],
    ["impossible omissions", d => { d.omittedCount = 1; d.inputCount = 2; }],
    ["unknown rejection", d => { d.rejected = [{ index: 0, reason: "raw error text" }]; d.inputCount++; }],
    ["rejection outside input", d => { d.rejected = [{ index: 2, reason: "invalid-field" }]; d.inputCount++; }],
  ];
  it.each(mutations)("rejects %s with a sanitized reason", async (_name, mutate) => {
    const original = await stored(); const data = JSON.parse(original); mutate(data);
    expect(restoreNasaSnapshot(JSON.stringify(data), FEED_NOW)).toEqual(failed);
    expect(restoreNasaSnapshot(original, FEED_NOW).status).toBe("restored");
  });

  it.each(["", "null", "[]", "{", '{"__proto__":{}}', " ".repeat(NASA_SNAPSHOT_BYTES + 1), "é".repeat(NASA_SNAPSHOT_BYTES / 2 + 1)])("rejects malformed or oversized serialized input %#", value => {
    expect(restoreNasaSnapshot(value, FEED_NOW)).toEqual(failed);
  });

  it("rejects invalid clocks and future baselines", async () => {
    const value = await stored();
    for (const now of [NaN, Infinity, FEED_NOW - 1]) expect(restoreNasaSnapshot(value, now)).toEqual(failed);
  });

  it("round-trips empty, duplicate, rejected and capped parse results", async () => {
    const feeds = [fixtureFeed(""), fixtureFeed(fixtureItem() + fixtureItem()), fixtureFeed("<item/>"), fixtureFeed(Array.from({ length: 12 }, (_, i) => fixtureItem({ guid: `id${i}`, url: `https://www.nasa.gov/invented-${i}/` })).join(""))];
    for (const xml of feeds) {
      const snapshot = await baseline({}, xml);
      const restored = restoreNasaSnapshot(serializeNasaSnapshot(snapshot), FEED_NOW);
      expect(restored).toEqual({ status: "restored", snapshot });
      if (restored.status === "restored") expect(Object.isFrozen(restored.snapshot.rejected)).toBe(true);
    }
  });

  it("restores Last-Modified-only and validator-free snapshots without inventing validators", async () => {
    const cases: HeadersInit[] = [{ "Last-Modified": "Thu, 12 Nov 2026 05:05:00 GMT" }, {}];
    for (const headers of cases) {
      const snapshot = await baseline(headers);
      const restored = restoreNasaSnapshot(serializeNasaSnapshot(snapshot), FEED_NOW);
      if (restored.status !== "restored") throw new Error("Expected restoration");
      const fetcher = vi.fn<(_url: string, _init: RequestInit) => Promise<Response>>(async () => new Response(null, { status: 304 }));
      const result = await fetchNasaFeed({ fetcher, now: () => FEED_NOW, previous: restored.snapshot });
      expect(new Headers(fetcher.mock.calls[0][1].headers).get("If-Modified-Since")).toBe(snapshot.lastModified);
      expect(result.status).toBe(snapshot.lastModified ? "not-modified" : "failed");
    }
  });

  it("restores stale and expired data without freshening it, and keeps it unchanged on refresh failure", async () => {
    const serialized = await stored();
    for (const age of [86_400_000, 8 * 86_400_000]) {
      const now = FEED_NOW + age;
      const restored = restoreNasaSnapshot(serialized, now);
      if (restored.status !== "restored") throw new Error("Expected restoration");
      expect(assessItem(nasaSnapshotToNews(restored.snapshot)[0], discoverSources, now).state).toBe(age === 86_400_000 ? "stale" : "expired");
      expect(await fetchNasaFeed({ fetcher: async () => new Response(null, { status: 503 }), now: () => now, previous: restored.snapshot })).toMatchObject({ status: "failed", reason: "http-error" });
      expect(JSON.parse(serializeNasaSnapshot(restored.snapshot))).toEqual(JSON.parse(serialized));
    }
  });

  it("does not revive a publication-expired article after restored-baseline revalidation", async () => {
    const now = FEED_NOW + 8 * 86_400_000;
    const restored = restoreNasaSnapshot(await stored(), now);
    if (restored.status !== "restored") throw new Error("Expected restoration");
    const result = await fetchNasaFeed({ fetcher: async () => new Response(null, { status: 304 }), now: () => now, previous: restored.snapshot });
    if (result.status === "failed") throw new Error(result.reason);
    expect(assessItem(nasaSnapshotToNews(result.snapshot)[0], discoverSources, now)).toMatchObject({ state: "expired", placement: "archive" });
  });

  it("round-trips merged source identities and rejects duplicate rejection indexes", async () => {
    const snapshot = await baseline({}, fixtureFeed(fixtureItem() + fixtureItem({ guid: "another-id" }) + "<item/><item/>"));
    const serialized = serializeNasaSnapshot(snapshot);
    expect(restoreNasaSnapshot(serialized, FEED_NOW)).toEqual({ status: "restored", snapshot });
    const data = JSON.parse(serialized); data.rejected[1].index = data.rejected[0].index;
    expect(restoreNasaSnapshot(JSON.stringify(data), FEED_NOW)).toEqual(failed);
  });
});
