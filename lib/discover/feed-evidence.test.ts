import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DiscoverScreen, DiscoverItemCard } from "@/components/discover/discover-view";
import { assessItem, catalogErrors, groupDuplicates } from "./catalog";
import { bookmarkKey, catalogEntries } from "./presentation";
import { discoverSources } from "./sources";
import { NOW, eventFixture } from "./catalog.fixtures";
import { editorialNewsFixture, feedNewsFixture, type FeedNewsFixture } from "./feed-evidence.fixtures";
import { FEED_FRESHNESS_MS, FEED_PUBLICATION_AGE_MS } from "./feeds/policy";
import { fixtureFeed } from "./feeds/nasa.fixtures";
import { fetchNasaFeed } from "./feeds/transport";
import { nasaSnapshotToNews } from "./feeds/to-news";
import type { DiscoverItem } from "./types";

const assess = (item: DiscoverItem, now = NOW) => assessItem(item, discoverSources, now);
const render = (items: DiscoverItem[], now = NOW) => renderToStaticMarkup(createElement(DiscoverScreen, { items, sources: discoverSources, now, initialTab: "news" }));

describe("publisher-feed evidence lifecycle (invented records)", () => {
  it("admits fresh feed metadata without inventing editorial verification", () => {
    const item = feedNewsFixture();
    expect(catalogErrors(item, discoverSources, NOW)).toEqual([]);
    expect(assess(item)).toMatchObject({ state: "current", placement: "main" });
    expect(item.evidence.verifiedAt).toBeNull();
    expect(item.summary.kind).toBe("unavailable");
    expect(discoverSources.find(source => source.id === "nasa")?.automation).toBe("not-approved");
  });

  it("uses the successful representation check for the exact 24-hour boundary", () => {
    const item = feedNewsFixture();
    const deadline = Date.parse(item.evidence.representationCheckedAt) + FEED_FRESHNESS_MS;
    expect(assess(item, deadline - 1).state).toBe("current");
    expect(assess(item, deadline)).toMatchObject({ state: "stale", placement: "review-only" });
    // A more recent body retrieval cannot claim a later representation check.
    item.evidence.fetchedAt = "2026-11-13T17:00:00Z";
    expect(assess(item, deadline).state).toBe("invalid");
  });

  it("expires old publications at seven elapsed days despite a fresh conditional check", () => {
    const item = feedNewsFixture(); item.publishedAt = new Date(NOW - FEED_PUBLICATION_AGE_MS).toISOString();
    expect(assess(item)).toMatchObject({ state: "expired", placement: "archive" });
    item.publishedAt = new Date(NOW - FEED_PUBLICATION_AGE_MS + 1).toISOString();
    expect(assess(item).state).toBe("current");
  });

  it("can retain an older body after revalidation while keeping publication age separate", () => {
    const item = feedNewsFixture();
    item.publishedAt = "2026-11-08T10:00:00Z";
    item.evidence.fetchedAt = "2026-11-08T11:00:00Z";
    expect(assess(item).state).toBe("current");
  });

  it.each(["2026-11-12T19:00:00Z", "2026-11-12T17:30:00", "2026-02-30T17:30:00Z"])("rejects invalid or future feed check %s", representationCheckedAt => {
    const item = feedNewsFixture(); item.evidence.representationCheckedAt = representationCheckedAt;
    expect(assess(item).state).toBe("invalid");
  });

  it("rejects missing retrieval time and a publication newer than the body snapshot", () => {
    const missing = feedNewsFixture();
    Object.assign(missing.evidence, { fetchedAt: null });
    expect(assess(missing).state).toBe("invalid");
    const future = feedNewsFixture(); future.publishedAt = "2026-11-12T17:15:00Z";
    expect(assess(future).state).toBe("invalid");
  });

  it.each([
    (item: FeedNewsFixture) => Object.assign(item.evidence, { verifiedAt: "2026-11-12T17:00:00Z" }),
    (item: FeedNewsFixture) => Object.assign(item.evidence, { sourceUpdatedAt: "2026-11-12T17:00:00Z" }),
    (item: FeedNewsFixture) => { item.summary = { kind: "original", text: "Inherited summary", writtenAt: "2026-11-12T17:00:00Z" }; },
    (item: FeedNewsFixture) => { item.access = "open"; },
    (item: FeedNewsFixture) => { item.format = "reporting"; },
    (item: FeedNewsFixture) => { item.publishedAt = null; item.publishedOn = "2026-11-12"; },
  ])("rejects unsupported editorial/content claims on feed metadata", change => {
    const item = feedNewsFixture(); change(item);
    expect(assess(item).state).toBe("invalid");
  });

  it("restricts feed source, endpoint, link and source identities", () => {
    for (const values of [
      { sourceId: "illuminator" }, { feedUrl: "https://example.invalid/feed" }, { url: "https://example.invalid/article" },
      { sourceItemIds: [] }, { sourceItemIds: ["different-id"] }, { sourceItemIds: ["invented-guid", "invented-guid"] },
    ]) {
      const item = feedNewsFixture(); Object.assign(item.evidence, values);
      expect(assess(item).state).toBe("invalid");
    }
    const event = { ...eventFixture(), evidence: feedNewsFixture().evidence } as unknown as DiscoverItem;
    expect(assess(event).state).toBe("invalid");
  });

  it("preserves withdrawals instead of making them current from transport freshness", () => {
    const item = feedNewsFixture(); item.status = "withdrawn";
    expect(assess(item)).toMatchObject({ state: "withdrawn", placement: "archive" });
  });
});

describe("curated and feed coverage selection", () => {
  it("prefers eligible curated coverage and its original dated summary", () => {
    const manual = editorialNewsFixture(), feed = feedNewsFixture();
    const before = JSON.stringify([manual, feed]);
    for (const input of [[manual, feed], [feed, manual]]) {
      const result = catalogEntries(input, discoverSources, NOW);
      expect(result).toHaveLength(1);
      expect(result[0].item.id).toBe(manual.id);
      expect(result[0].item).toMatchObject({ summary: manual.summary });
    }
    expect(JSON.stringify([manual, feed])).toBe(before);
  });

  it("replaces stale curation with a fresh feed copy without inheriting its summary", () => {
    const manual = editorialNewsFixture(); manual.evidence.verifiedAt = "2026-11-11T17:00:00Z";
    const result = catalogEntries([manual, feedNewsFixture()], discoverSources, NOW);
    expect(result).toHaveLength(1);
    expect(result[0].item.evidence.level).toBe("publisher-feed");
    expect(result[0].item).toMatchObject({ summary: { kind: "unavailable" } });
    expect(manual.evidence.verifiedAt).toBe("2026-11-11T17:00:00Z");
  });

  it("does not let a feed revive withdrawn curation or bypass an editorial conflict", () => {
    const manual = editorialNewsFixture(); manual.status = "withdrawn";
    expect(catalogEntries([manual, feedNewsFixture()], discoverSources, NOW)[0].assessment).toMatchObject({ state: "withdrawn", placement: "archive" });
    const conflicting = editorialNewsFixture();
    const result = catalogEntries([manual, conflicting, feedNewsFixture()], discoverSources, NOW);
    expect(result[0].assessment).toMatchObject({ state: "needs-confirmation", placement: "review-only" });
  });

  it("withholds disagreeing fresh headlines on the same article", () => {
    const feed = feedNewsFixture(); feed.title = "A conflicting invented headline";
    expect(catalogEntries([editorialNewsFixture(), feed], discoverSources, NOW)[0].assessment.placement).toBe("review-only");
  });

  it("selects the newest identical feed representation and detects changed URLs on one GUID", () => {
    const old = feedNewsFixture(), recent = feedNewsFixture(); recent.id = "recent"; recent.evidence.representationCheckedAt = "2026-11-12T17:45:00Z";
    expect(catalogEntries([old, recent], discoverSources, NOW)[0].item.id).toBe("recent");
    recent.evidence.url = "https://www.nasa.gov/different-invented-article/";
    expect(catalogEntries([old, recent], discoverSources, NOW)).toHaveLength(1);
    expect(catalogEntries([old, recent], discoverSources, NOW)[0].assessment.placement).toBe("review-only");
  });

  it("groups canonical URLs even when editorial grouping keys differ, including transitive groups", () => {
    const manual = editorialNewsFixture(); manual.duplicateGroup = "invented-story";
    const other = editorialNewsFixture(); other.id = "other"; other.evidence.url = "https://www.nasa.gov/other-invented-article/"; other.duplicateGroup = "invented-story";
    expect(groupDuplicates([feedNewsFixture(), other, manual])).toHaveLength(1);
    expect(groupDuplicates([feedNewsFixture(), other, manual])[0]).toHaveLength(3);
  });

  it("keeps visit bookmarks attached to an article across representations and GUIDs", () => {
    const feed = feedNewsFixture(), manual = editorialNewsFixture();
    manual.evidence.url += "?utm_source=curation";
    expect(bookmarkKey(feed)).toBe(bookmarkKey(manual));
    feed.evidence.sourceItemId = "changed-guid"; feed.evidence.sourceItemIds = ["changed-guid"];
    expect(bookmarkKey(feed)).toBe(bookmarkKey(manual));
  });
});

describe("feed bridge and static UI labels", () => {
  it("maps a mocked importer snapshot and 304 without changing publication or editorial checks", async () => {
    const first = await fetchNasaFeed({ fetcher: async () => new Response(fixtureFeed(), { headers: { "Content-Type": "application/rss+xml", ETag: '"invented"' } }), now: () => NOW });
    if (first.status === "failed") throw new Error(first.reason);
    const updated = await fetchNasaFeed({ fetcher: async () => new Response(null, { status: 304 }), now: () => NOW + 1000, previous: first.snapshot });
    if (updated.status === "failed") throw new Error(updated.reason);
    const news = nasaSnapshotToNews(updated.snapshot)[0];
    expect(catalogErrors(news, discoverSources, NOW + 1000)).toEqual([]);
    expect(news.evidence.verifiedAt).toBeNull();
    expect(news.publishedAt).toBe(first.snapshot.candidates[0].publishedAt);
    expect(news.evidence.fetchedAt).toBe(first.snapshot.bodyFetchedAt);
    expect(news.evidence.level === "publisher-feed" && news.evidence.representationCheckedAt).toBe(updated.snapshot.representationCheckedAt);
  });

  it("shows feed checks, missing summary and unknown access without editorial claims", () => {
    const item = feedNewsFixture();
    const html = render([item]);
    expect(html).toContain("Publisher feed · not editorially checked");
    expect(html).toContain("Feed checked:");
    expect(html).toContain("Feed loaded:");
    expect(html).toContain("Institutional update");
    expect(html).toContain("Summary unavailable:");
    expect(html).toContain("Article access unknown");
    expect(html).not.toContain("Last checked:");
    expect(html).not.toContain("Publisher source checked");
    expect(html).not.toContain("Original Discover summary");
  });

  it("keeps stale feed cards in recheck details and hides unsaved aged-out stories", () => {
    const item = feedNewsFixture();
    item.evidence.fetchedAt = "2026-11-11T17:00:00Z"; item.evidence.representationCheckedAt = "2026-11-11T17:30:00Z"; item.publishedAt = "2026-11-11T16:00:00Z";
    const html = render([item]);
    expect(html).toContain("No current stories for these interests");
    expect(html.indexOf("Needs a check")).toBeLessThan(html.indexOf(item.title));
    const expired = feedNewsFixture(); expired.publishedAt = "2026-11-01T16:00:00Z";
    expect(render([expired])).not.toContain(expired.title);
  });

  it("renders only one current card for curated/feed overlap", () => {
    const html = render([editorialNewsFixture(), feedNewsFixture()]);
    expect(html.match(/<article\b/g)).toHaveLength(1);
    expect(html).toContain("Invented dated editorial summary.");
    expect(html).not.toContain("Publisher feed · not editorially checked");
  });

  it("retains the unreviewed label and bookmark state on an archived feed card", () => {
    const item = feedNewsFixture(); item.status = "withdrawn";
    const html = renderToStaticMarkup(createElement(DiscoverItemCard, { entry: { item, assessment: assess(item) }, source: discoverSources.find(source => source.id === "nasa")!, saved: true, onSave: () => {} }));
    expect(html).toContain("Withdrawn");
    expect(html).toContain("Unsave Invented science headline");
    expect(html).toContain("not editorially checked");
  });
});
