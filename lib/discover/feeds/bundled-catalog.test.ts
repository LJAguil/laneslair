import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiscoverScreen } from "@/components/discover/discover-view";
import { FEED_NOW, fixtureFeed, fixtureItem } from "./nasa.fixtures";
import { fetchNasaFeed } from "./transport";
import { prepareReviewBundle, reviewDigest } from "./review-bundle";
import { loadBundledCatalog, type BundledFeedSelection } from "./bundled-catalog";
import { catalogEntries } from "../presentation";
import { curatedCatalog } from "../curated";
import { candidateCatalog } from "../candidate";
import DiscoverPage from "@/app/(app)/discover/page";
import { discoverSources } from "../sources";
import { editorialNewsFixture } from "../feed-evidence.fixtures";
import type { DiscoverItem } from "../types";

// The Next compiler resolves this guard internally; no extra runtime dependency.
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ io: vi.fn(async () => {}) }));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function selected({ synthetic = false, xml = fixtureFeed(), now = FEED_NOW } = {}): Promise<BundledFeedSelection> {
  const imported = await fetchNasaFeed({ fetcher: async () => new Response(xml, { headers: { "content-type": "application/rss+xml" } }), now: () => now });
  if (imported.status === "failed") throw new Error(imported.reason);
  // Invented test input exercises the operator-supplied path; never an app release.
  const bundle = prepareReviewBundle(imported.snapshot, now, synthetic ? "synthetic" : "local-snapshot");
  return { bytes: bundle.bytes, expectedDigest: bundle.digest };
}
const load = (selection: BundledFeedSelection | null, now = FEED_NOW, curated: readonly DiscoverItem[] = curatedCatalog) => loadBundledCatalog({ curated, sources: discoverSources, selection, now });
const render = (catalog: ReturnType<typeof load>, now: number | null = FEED_NOW, initialTab: "news" | "event" = "news") => renderToStaticMarkup(createElement(DiscoverScreen, { ...catalog, sources: discoverSources, now, initialTab }));

describe("bundled catalog fallback and validation", () => {
  it("preserves every curated record and its timestamps when no bundle is selected", () => {
    const before = JSON.stringify(curatedCatalog), result = load(null);
    expect(result.items).toEqual(curatedCatalog); expect(result.items).not.toBe(curatedCatalog);
    expect(result.feed).toEqual({ status: "unavailable" });
    expect(JSON.stringify(curatedCatalog)).toBe(before);
  });
  it("rejects a correctly hashed synthetic bundle", async () => {
    const result = load(await selected({ synthetic: true }));
    expect(result.items).toEqual(curatedCatalog); expect(result.feed.status).toBe("unavailable");
    expect(render(result)).not.toContain("Invented rocket");
  });
  it("fails closed for altered bytes, missing bytes, bad digest and unsupported schema", async () => {
    const selection = await selected();
    const badData = JSON.parse(selection.bytes); badData.schemaVersion = 2; const unsupported = JSON.stringify(badData);
    const cases = [
      { ...selection, bytes: selection.bytes + "\n" },
      { ...selection, bytes: "" }, { ...selection, expectedDigest: "wrong" },
      { bytes: unsupported, expectedDigest: reviewDigest(unsupported) },
      {} as BundledFeedSelection,
    ];
    for (const item of cases) expect(load(item)).toEqual({ items: curatedCatalog, feed: { status: "unavailable" } });
  });
  it("fails closed on future/invalid clock and registry mismatch", async () => {
    const selection = await selected();
    for (const now of [FEED_NOW - 1, NaN, Infinity]) expect(load(selection, now).feed.status).toBe("unavailable");
    const result = loadBundledCatalog({ curated: curatedCatalog, sources: [], selection, now: FEED_NOW });
    expect(result).toEqual({ items: curatedCatalog, feed: { status: "unavailable" } });
  });
  it("maps the complete valid snapshot to plain news without exposing validators or bundle bytes", async () => {
    const result = load(await selected());
    expect(result.items).toHaveLength(curatedCatalog.length + 1);
    expect(result.feed).toEqual({ status: "loaded", checkedAt: new Date(FEED_NOW).toISOString(), itemCount: 1 });
    const item = result.items.at(-1)!;
    expect(item).toMatchObject({ kind: "news", format: "institutional-update", access: "unknown", summary: { kind: "unavailable" }, evidence: { level: "publisher-feed", verifiedAt: null } });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(item).not.toHaveProperty("snapshot"); expect(item).not.toHaveProperty("etag");
  });
  it("loads a valid empty snapshot distinctly from an unavailable one", async () => {
    const result = load(await selected({ xml: fixtureFeed("") }));
    expect(result.items).toEqual(curatedCatalog);
    expect(result.feed).toMatchObject({ status: "loaded", itemCount: 0 });
    expect(render(result)).toContain("No additional NASA stories in this snapshot.");
  });
  it("keeps stale/expired timestamps and delegates visibility to the catalog clock", async () => {
    const selection = await selected();
    for (const [age, state] of [[86_400_000, "stale"], [7 * 86_400_000, "expired"]] as const) {
      const result = load(selection, FEED_NOW + age, []);
      expect(result.feed).toMatchObject({ status: "loaded", checkedAt: new Date(FEED_NOW).toISOString() });
      expect(catalogEntries(result.items, discoverSources, FEED_NOW + age)[0].assessment.state).toBe(state);
      const html = render(result, FEED_NOW + age);
      expect(html).toContain("NASA feed needs a fresh check.");
      expect(html).toContain("No current stories for these interests");
      if (state === "stale") expect(html).toContain("Needs a check");
      else expect(html).not.toContain("Invented rocket");
    }
  });
  it("leaves duplicate and withdrawal evidence intact for curated precedence", async () => {
    const manual = editorialNewsFixture();
    const selection = await selected({ xml: fixtureFeed(fixtureItem({ url: manual.evidence.url, title: manual.title })) });
    const result = load(selection, FEED_NOW, [manual]);
    expect(result.items).toHaveLength(2);
    expect(catalogEntries(result.items, discoverSources, FEED_NOW)).toHaveLength(1);
    expect(catalogEntries(result.items, discoverSources, FEED_NOW)[0].item.id).toBe(manual.id);
    manual.status = "withdrawn";
    expect(catalogEntries(load(selection, FEED_NOW, [manual]).items, discoverSources, FEED_NOW)[0].assessment).toMatchObject({ state: "withdrawn", placement: "archive" });
    expect(render(load(selection, FEED_NOW, [manual]))).not.toContain(manual.title);
  });
  it("takes fresh metadata as a whole card when matching curation is stale", async () => {
    const manual = editorialNewsFixture(); manual.evidence.verifiedAt = "2026-11-11T17:00:00Z";
    const selection = await selected({ xml: fixtureFeed(fixtureItem({ url: manual.evidence.url, title: manual.title })) });
    const entry = catalogEntries(load(selection, FEED_NOW, [manual]).items, discoverSources, FEED_NOW)[0];
    expect(entry.item.evidence.level).toBe("publisher-feed");
    expect(entry.item).toMatchObject({ summary: { kind: "unavailable" } });
    expect(render(load(selection, FEED_NOW, [manual]))).not.toContain("Invented dated editorial summary");
  });
  it("rejects an incomplete or malformed nested snapshot even with updated outer digests", async () => {
    const selection = await selected(), data = JSON.parse(selection.bytes);
    const snapshot = JSON.parse(data.snapshot); delete snapshot.candidates[0].title;
    data.snapshot = JSON.stringify(snapshot); data.snapshotDigest = reviewDigest(data.snapshot);
    const bytes = JSON.stringify(data);
    expect(load({ bytes, expectedDigest: reviewDigest(bytes) }).items).toEqual(curatedCatalog);
  });
});

describe("feed availability rendering and default server entry", () => {
  it("keeps streamed loading noninteractive so early selections cannot be discarded", () => {
    const html = renderToStaticMarkup(createElement(DiscoverPage));
    expect(html).toContain("Loading Discover picks");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Other picks retain their own dated checks");
    expect(html).not.toContain("<button");
    expect(html).not.toContain('role="tab"');
  });
  it("shows a concise fallback on News without claiming curated picks are fresh", () => {
    expect(render(load(null))).toContain("Additional NASA stories are unavailable. Curated picks are shown below when current.");
    expect(render(load(null), FEED_NOW, "event")).not.toContain("Additional NASA stories are unavailable");
  });
  it("labels a loaded feed distinctly and waits for the client freshness clock", async () => {
    const result = load(await selected(), FEED_NOW, []);
    expect(render(result, null)).toContain("Checking NASA feed freshness");
    const html = render(result);
    expect(html).toContain("NASA feed checked"); expect(html).toContain("not editorially checked");
    expect(html).toContain("Summary unavailable"); expect(html).toContain("Article access unknown");
    expect(html).toContain('href="https://www.nasa.gov/invented-story/"');
  });
  it("reassesses a loaded feed after a client clock rollback", async () => {
    expect(render(load(await selected()), FEED_NOW - 1)).toContain("NASA feed needs a fresh check");
  });
  it("the configured app entry validates the pinned capture after runtime IO without requests", async () => {
    const fetch = vi.fn(() => { throw new Error("Network forbidden"); }); vi.stubGlobal("fetch", fetch);
    const { io } = await import("next/cache"); vi.mocked(io).mockClear();
    const clock = vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-13T22:07:54Z"));
    const { publishedDiscoverCatalog } = await import("./published");
    const result = await publishedDiscoverCatalog();
    expect(result.items.slice(0, candidateCatalog.length)).toEqual(candidateCatalog);
    expect(result.items).toHaveLength(candidateCatalog.length + 10);
    expect(result.feed).toEqual({ status: "loaded", checkedAt: "2026-11-13T19:30:14.739Z", itemCount: 10 });
    expect(io).toHaveBeenCalledOnce(); expect(fetch).not.toHaveBeenCalled();
    expect(vi.mocked(io).mock.invocationCallOrder[0]).toBeLessThan(clock.mock.invocationCallOrder[0]);
    expect(JSON.stringify(result)).not.toContain("Invented rocket");
  });
});
