import { describe, expect, it } from "vitest";
import { candidateCatalog, candidateCheckedAt } from "./candidate";
import { candidateNewsCheckedAt } from "./candidate-news";
import { refreshAdditions, refreshCheckedAt } from "./refresh-2026-11-18";
import { discoverSources } from "./sources";
import { catalogErrors, assessItem } from "./catalog";
import { catalogEntries } from "./presentation";

const now = Date.parse(refreshCheckedAt);
describe("November 18 manual content refresh", () => {
  it("validates the selected catalog and has one current outing and five current stories", () => {
    for (const item of candidateCatalog) expect(catalogErrors(item, discoverSources, now), item.id).toEqual([]);
    expect(new Set(candidateCatalog.map(item => item.id)).size).toBe(candidateCatalog.length);
    const main = catalogEntries(candidateCatalog, discoverSources, now).filter(entry => entry.assessment.placement === "main");
    expect(main.filter(entry => entry.item.kind === "event")).toHaveLength(1);
    expect(main.filter(entry => entry.item.kind === "news")).toHaveLength(5);
    expect(main.filter(entry => entry.item.kind === "deal")).toHaveLength(0);
    for (const event of refreshAdditions.filter(item => item.kind === "event")) {
      expect(assessItem(event, discoverSources, now)).toMatchObject({ state: "expired", placement: "archive" });
    }
  });
  it("covers explicit interests with publisher attribution and separates analysis from reporting", () => {
    const news = refreshAdditions.filter(item => item.kind === "news");
    expect(news).toHaveLength(5);
    expect(new Set(news.flatMap(item => item.topics))).toEqual(new Set(["louisiana", "technology", "science", "national", "world", "discovery"]));
    expect(news.filter(item => item.format === "analysis")).toHaveLength(2);
    for (const item of news) {
      expect(item.author).toBeTruthy();
      expect(item.publishedAt).toBeNull();
      expect(item.summary).toMatchObject({ kind: "original", writtenAt: refreshCheckedAt });
    }
    expect(news.find(item => item.id === "ars-copilot-office-2026-11-17")?.publishedOn).toBe("2026-11-17");
    expect(discoverSources.find(source => source.id === "ars-technica")).toMatchObject({ access: "public-page", ingestion: "curation", automation: "not-approved" });
  });
  it("does not renew older articles, past events or expired promotions", () => {
    expect(candidateCatalog.find(item => item.id === "illuminator-nuclear-2026-11-11")?.evidence.verifiedAt).toBe(candidateNewsCheckedAt);
    expect(candidateCatalog.find(item => item.id === "local-music-2026-11-13")?.evidence.verifiedAt).toBe(candidateCheckedAt);
    const expired = candidateCatalog.find(item => item.id === "wendys-frosty-2026-11-15")!;
    expect(assessItem(expired, discoverSources, now)).toMatchObject({ state: "expired", placement: "archive" });
    const incomplete = candidateCatalog.find(item => item.id === "wendys-classic-combo-undated")!;
    expect(incomplete).toMatchObject({ evidence: { verifiedAt: refreshCheckedAt }, window: null, requirements: { reviewedAt: null }, participation: { kind: "national-local-unknown" } });
    expect(assessItem(incomplete, discoverSources, now).placement).toBe("review-only");
  });
  it("keeps unknown admission prices unknown and preserves the named local time zone", () => {
    const events = refreshAdditions.filter(item => item.kind === "event");
    for (const event of events) expect(event).toMatchObject({ price: { kind: "unknown" }, window: { timeZone: "America/Chicago" } });
    const exhibit = candidateCatalog.find(item => item.id === "prescott-holocaust-exhibit-2026")!;
    expect(exhibit).toMatchObject({ evidence: { verifiedAt: refreshCheckedAt }, price: { kind: "free" }, window: { endDateExclusive: "2026-12-05" } });
  });
  it("moves reviewed stories out of current results at 24 hours without extending check dates", () => {
    for (const item of refreshAdditions.filter(item => item.kind === "news")) {
      expect(assessItem(item, discoverSources, now + 24 * 3_600_000 - 1).placement).toBe("main");
      expect(assessItem(item, discoverSources, now + 24 * 3_600_000)).toMatchObject({ state: "stale", placement: "review-only" });
      expect(item.evidence.verifiedAt).toBe(refreshCheckedAt);
    }
  });
});
