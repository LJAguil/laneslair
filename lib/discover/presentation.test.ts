import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DiscoverScreen, DiscoverItemCard } from "@/components/discover/discover-view";
import { catalogErrors } from "./catalog";
import { catalogEntries, displayWindow, publicationLabel } from "./presentation";
import { dealFixture, eventFixture, fixtureSources, newsFixture, NOW } from "./catalog.fixtures";
import { curatedCatalog, catalogCheckedAt } from "./curated";
import { discoverSources } from "./sources";
import { sampleEvents } from "@/lib/sample-data/events";

function screen(items = [eventFixture()], initialTab: "event" | "news" | "deal" = "event", now: number | null = NOW) {
  return renderToStaticMarkup(createElement(DiscoverScreen, { items, sources: fixtureSources, now, initialTab }));
}

describe("Discover public-content view (static rendering, not device acceptance)", () => {
  it("shows checked event evidence, source links, price uncertainty and accessible tabs", () => {
    const html = screen();
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain("Things to do");
    expect(html).toContain("Food deals");
    expect(html).toContain("Invented trivia fixture");
    expect(html).toContain("Price unknown");
    expect(html).toContain("Official listing checked");
    expect(html).toContain("Last checked:");
    expect(html).toContain('href="https://example.invalid/item"');
    expect(html).not.toContain("Weekly digest");
  });

  it("withholds stale and canceled content from current recommendations", () => {
    const expired = eventFixture(); expired.status = "canceled";
    expect(screen([expired])).not.toContain(expired.title);
    const stale = eventFixture(); stale.evidence.verifiedAt = "2026-11-11T18:00:00Z";
    const html = screen([stale]);
    expect(html).toContain("No current outings");
    expect(html).toContain("Needs a check");
    expect(html).toContain("Stale · recheck needed");
    expect(html.indexOf("Needs a check")).toBeLessThan(html.indexOf(stale.title));
  });

  it("keeps national offers outside confirmed nearby deals", () => {
    const deal = dealFixture();
    const html = renderToStaticMarkup(createElement(DiscoverScreen, { items: [deal], sources: fixtureSources, now: NOW, initialTab: "deal" }));
    expect(html).toContain("No confirmed nearby deals right now");
    expect(html).toContain("National offers · check local participation");
    expect(html).toContain("nearby participation unknown");
    expect(html).toContain("App required");
    expect(html).toContain("Account required");
    expect(html).not.toContain("Happening now");
  });

  it("never displays an expired food offer in any unsaved result section", () => {
    const deal = dealFixture();
    const html = renderToStaticMarkup(createElement(DiscoverScreen, { items: [deal], sources: fixtureSources, now: Date.parse("2026-11-14T18:00:00Z"), initialTab: "deal" }));
    expect(html).not.toContain(deal.title);
    expect(html).not.toContain("National offers · check local participation");
  });

  it("preserves opinion, paywall and unavailable-summary labels without inventing publication time", () => {
    const news = newsFixture(); news.format = "opinion"; news.access = "paywall"; news.publishedAt = null; news.publishedOn = "2026-11-12";
    const html = renderToStaticMarkup(createElement(DiscoverScreen, { items: [news], sources: fixtureSources, now: NOW, initialTab: "news" }));
    expect(html).toContain("Opinion");
    expect(html).toContain("Publisher paywall");
    expect(html).toContain("Summary unavailable:");
    expect(html).toContain("publication time unavailable");
    expect(html).toContain("News interests");
    expect(html).not.toContain("12:00 AM");
  });

  it("renders content as text and refuses unsafe outbound links", () => {
    const news = newsFixture(); news.title = '<script>alert("x")</script>'; news.evidence.url = "javascript:alert(1)";
    const html = renderToStaticMarkup(createElement(DiscoverItemCard, { entry: { item: news, assessment: { state: "invalid", placement: "review-only", errors: [] } }, source: fixtureSources[0], saved: false, onSave: () => {} }));
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="javascript:');
  });

  it("does not show eligible listings before the client clock is ready", () => {
    const html = screen([eventFixture()], "event", null);
    expect(html).toContain("Checking dates and freshness");
    expect(html).not.toContain("Invented trivia fixture");
  });
});

describe("catalog presentation policy", () => {
  it("resolves identical duplicate articles but withholds conflicting statuses", () => {
    const a = newsFixture(), b = newsFixture(); b.id = "copy";
    expect(catalogEntries([a, b], fixtureSources, NOW)).toHaveLength(1);
    b.evidence.verifiedAt = "2026-11-12T11:30:00-06:00";
    expect(catalogEntries([a, b], fixtureSources, NOW)[0].item.id).toBe("copy");
    b.status = "withdrawn";
    expect(catalogEntries([a, b], fixtureSources, NOW)[0].assessment).toMatchObject({ state: "needs-confirmation", placement: "review-only" });
  });

  it("removes invalid items before formatting dates or grouping", () => {
    const item = eventFixture(); item.window.timeZone = "Not/AZone";
    expect(catalogEntries([item], fixtureSources, NOW)).toEqual([]);
    const news = newsFixture(); news.publishedOn = "2026-02-30";
    expect(catalogEntries([news], fixtureSources, NOW)).toEqual([]);
  });

  it("labels date-only validity without leaking the exclusive ending date", () => {
    const label = displayWindow({ kind: "dates", startDate: "2026-11-15", endDateExclusive: "2026-11-16", timeZone: "America/Chicago" });
    expect(label).toContain("Nov 15");
    expect(label).not.toContain("Nov 16");
    expect(label).toContain("America/Chicago");
    const news = newsFixture(); news.publishedAt = null; news.publishedOn = "2026-11-12";
    expect(publicationLabel(news)).toContain("publication time unavailable");
  });

  it("validates every curated record at its actual inspection time without real service calls", () => {
    for (const item of curatedCatalog) expect(catalogErrors(item, discoverSources, Date.parse(catalogCheckedAt)), item.id).toEqual([]);
    const offers = catalogEntries(curatedCatalog, discoverSources, Date.parse(catalogCheckedAt)).filter(entry => entry.item.kind === "deal");
    expect(offers).toHaveLength(1);
    expect(offers[0].assessment).toMatchObject({ state: "needs-confirmation", placement: "review-only" });
    expect(curatedCatalog.some(item => item.evidence.url.includes("example.invalid"))).toBe(false);
  });

  it("marks legacy sample titles for all existing consumers", () => {
    expect(sampleEvents("2026-11-12").every(event => event.title.startsWith("Sample: "))).toBe(true);
  });
});
