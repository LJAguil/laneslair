import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DiscoverItemCard, DiscoverScreen } from "@/components/discover/discover-view";
import { november19Catalog as candidateCatalog, november18Catalog } from "./candidate";
import { november19CheckedAt, november19Events, november19News } from "./refresh-2026-11-19";
import { discoverSources } from "./sources";
import { assessItem, catalogErrors } from "./catalog";
import { catalogEntries } from "./presentation";

const now = Date.parse(november19CheckedAt);
describe("November 19 expansion", () => {
  it("validates new content without changing prior records or their check clocks", () => {
    expect(candidateCatalog.slice(0, november18Catalog.length)).toEqual(november18Catalog);
    for (const item of candidateCatalog) expect(catalogErrors(item, discoverSources, now), item.id).toEqual([]);
    expect(new Set(candidateCatalog.map(item => item.id)).size).toBe(candidateCatalog.length);
    const main = catalogEntries(candidateCatalog, discoverSources, now).filter(entry => entry.assessment.placement === "main");
    expect(main.filter(entry => entry.item.kind === "event")).toHaveLength(7);
    expect(main.filter(entry => entry.item.kind === "news")).toHaveLength(12);
    expect(main.filter(entry => entry.item.kind === "deal")).toHaveLength(0);
  });
  it("separates the show days, preserves unknown prices and expires start-only music at its start", () => {
    expect(november19Events).toHaveLength(6);
    expect(november19Events.filter(item => item.price.kind === "unknown")).toHaveLength(4);
    expect(new Set(november19Events.map(item => item.city))).toEqual(new Set(["Ruston", "Monroe", "West Monroe"]));
    const show = november19Events.filter(item => item.id.startsWith("herps-"));
    expect(catalogEntries(show, discoverSources, now)).toHaveLength(2);
    expect(show.map(item => item.price)).toEqual(Array(2).fill({ kind: "known", amount: 10, currency: "USD", note: "Adult one-day admission; child and two-day rates differ" }));
    const music = november19Events.find(item => item.window.kind === "start-only")!;
    expect(assessItem(music, discoverSources, Date.parse("2026-11-21T03:00:00Z"))).toMatchObject({ state: "expired", placement: "archive" });
  });
  it("attributes seven original summaries and labels institutional updates and the critic's review", () => {
    expect(november19News).toHaveLength(7);
    expect(new Set(november19News.map(item => item.evidence.sourceId)).size).toBe(4);
    expect(november19News.filter(item => item.format === "institutional-update")).toHaveLength(2);
    expect(november19News.find(item => item.id === "ars-gta-review-2026-11-18")).toMatchObject({ format: "opinion", publishedOn: "2026-11-18" });
    for (const item of november19News) {
      expect(item).toMatchObject({ author: expect.any(String), summary: { kind: "original", writtenAt: november19CheckedAt }, evidence: { level: "publisher-reported", fetchedAt: null } });
      expect(assessItem(item, discoverSources, now + 24 * 3_600_000)).toMatchObject({ state: "stale", placement: "review-only" });
    }
    expect(november19News.find(item => item.evidence.sourceId === "kedm")?.publishedAt).toBe("2026-11-19T13:58:00-05:00");
    expect(discoverSources.every(source => source.automation === "not-approved")).toBe(true);
  });
  it("exposes date controls, current counts and story topics without private app context", () => {
    const screen = renderToStaticMarkup(createElement(DiscoverScreen, { items: candidateCatalog, sources: discoverSources, now }));
    expect(screen).toContain("All checked dates");
    expect(screen).toContain("Next 7 days");
    expect(screen).toContain("7 current picks match your filters.");
    const item = november19News.find(item => item.id === "ars-gta-review-2026-11-18")!;
    const html = renderToStaticMarkup(createElement(DiscoverItemCard, { entry: { item, assessment: assessItem(item, discoverSources, now) }, source: discoverSources.find(source => source.id === item.evidence.sourceId)!, saved: false, onSave() {} }));
    expect(html).toContain("Topics: Technology · Discovery mix");
    expect(html).toContain("Opinion");
    expect(html).toContain("Kyle Orland");
  });
});
