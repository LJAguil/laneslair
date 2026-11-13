import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DiscoverScreen, DiscoverView } from "@/components/discover/discover-view";
import { candidateCatalog, candidateCheckedAt, candidateCurationNote } from "./candidate";
import { candidateNews, candidateNewsCheckedAt } from "./candidate-news";
import { curatedCatalog, catalogCheckedAt } from "./curated";
import { catalogErrors, assessItem } from "./catalog";
import { catalogEntries } from "./presentation";
import { discoverSources } from "./sources";

const now = Date.parse(candidateNewsCheckedAt);
describe("local catalog candidate and preserved historical baseline", () => {
  it("validates candidate records against their actual review clock", () => {
    for (const item of candidateCatalog) expect(catalogErrors(item, discoverSources, now), item.id).toEqual([]);
    expect(new Set(candidateCatalog.map(item => item.id)).size).toBe(candidateCatalog.length);
  });
  it("retains original summaries and checks rather than renewing the whole batch", () => {
    const originalNews = curatedCatalog.filter(item => item.kind === "news");
    const reviewedIds = new Set(candidateNews.map(item => item.id));
    expect(candidateCatalog.filter(item => item.kind === "news" && !reviewedIds.has(item.id)))
      .toEqual(originalNews.filter(item => !reviewedIds.has(item.id)));
    for (const item of originalNews) expect(item.evidence.verifiedAt).toBe(catalogCheckedAt);
    expect(curatedCatalog).toHaveLength(10);
    expect(curatedCatalog.find(item => item.id === "local-music-2026-11-13")?.evidence.verifiedAt).toBe(catalogCheckedAt);
  });
  it("refreshes only inspected reporting, retaining publication dates and attribution", () => {
    expect(candidateNews).toHaveLength(2);
    for (const item of candidateNews) {
      const baseline = curatedCatalog.find(original => original.id === item.id)!;
      expect(baseline.kind).toBe("news");
      if (baseline.kind !== "news") throw new Error("Expected baseline story");
      expect(item).toMatchObject({ title: baseline.title, author: baseline.author, publishedAt: null,
        publishedOn: baseline.publishedOn, format: "reporting", evidence: { url: baseline.evidence.url, verifiedAt: candidateNewsCheckedAt } });
      expect(item.summary).toMatchObject({ kind: "original", writtenAt: candidateNewsCheckedAt });
      expect(assessItem(item, discoverSources, now).placement).toBe("main");
      expect(assessItem(item, discoverSources, now + 24 * 3_600_000 + 1).placement).not.toBe("main");
    }
    expect(candidateNewsCheckedAt).not.toBe(candidateCheckedAt);
    const inaccessible = candidateCatalog.find(item => item.id === "illuminator-computers-2026-11-10")!;
    expect(assessItem(inaccessible, discoverSources, now).placement).not.toBe("main");
  });
  it("keeps conflicting addresses and incomplete food terms outside recommendations", () => {
    const entries = catalogEntries(candidateCatalog, discoverSources, now);
    const disputed = entries.find(entry => entry.item.id === "creative-meetup-2026-11-16")!;
    expect(disputed.assessment).toMatchObject({ state: "needs-confirmation", placement: "review-only" });
    const offers = entries.filter(entry => entry.item.kind === "deal");
    expect(offers).toHaveLength(2);
    for (const offer of offers) expect(offer.assessment.placement).toBe("review-only");
  });
  it("preserves expirations and unknown prices instead of fabricating current availability", () => {
    const entries = catalogEntries(candidateCatalog, discoverSources, now);
    expect(entries.find(entry => entry.item.id === "downtown-lunch-2026-11-13")?.assessment.placement).toBe("archive");
    const market = candidateCatalog.find(item => item.id === "ruston-market-2026-11-14")!;
    expect(market).toMatchObject({ price: { kind: "unknown" } });
    const show = candidateCatalog.find(item => item.id === "sundown-kyle-thompson-2026-11-13")!;
    expect(assessItem(show, discoverSources, Date.parse("2026-11-14T03:00:00Z"))).toMatchObject({ state: "expired", placement: "archive" });
  });
  it("labels a date-range exhibit without implying the library is open now", () => {
    const exhibit = candidateCatalog.find(item => item.id === "prescott-holocaust-exhibit-2026")!;
    const html = renderToStaticMarkup(createElement(DiscoverScreen, { items: [exhibit], sources: discoverSources, now, curationNote: candidateCurationNote }));
    expect(html).toContain("Within listed dates");
    expect(html).not.toContain("Happening now");
    expect(html).toContain("Free public exhibition");
    expect(html).toContain("Other picks retain their own dated checks");
    expect(html).not.toContain("Curated source batch checked");
  });
  it("forwards the partial-check note through the app wrapper before the client clock is ready", () => {
    const html = renderToStaticMarkup(createElement(DiscoverView, { items: candidateCatalog, curationNote: candidateCurationNote }));
    expect(html).toContain(candidateCurationNote);
    expect(html).not.toContain("Curated source batch checked");
    expect(html).not.toContain("Happening now");
    const baseline = renderToStaticMarkup(createElement(DiscoverView));
    expect(baseline).toContain("Curated source batch checked");
    expect(baseline).not.toContain(candidateCurationNote);
  });
});
