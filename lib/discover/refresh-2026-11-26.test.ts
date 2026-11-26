import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DiscoverItemCard, DiscoverScreen } from "@/components/discover/discover-view";
import { assessItem } from "./catalog";
import { november26CheckedAt, november26Events, november26News } from "./refresh-2026-11-26";
import { discoverSources } from "./sources";
import { discoverRefreshUrl } from "./refresh-help";

const now = Date.parse(november26CheckedAt);
describe("November 26 reviewed expansion", () => {
  it("adds dated nearby outings with unknown charges preserved and nightly windows separated", () => {
    expect(november26Events).toHaveLength(10);
    expect(november26Events.filter(item => item.city === "Ruston")).toHaveLength(5);
    expect(november26Events.filter(item => item.price.kind === "free")).toHaveLength(2);
    for (const item of november26Events) {
      expect(assessItem(item, discoverSources, now).placement).toBe("main");
      expect(item.evidence.verifiedAt).toBe(november26CheckedAt);
      expect(item.travel).toBe("nearby");
    }
    const expired = november26Events.find(item => item.id === "land-of-lights-2026-11-26")!;
    expect(assessItem(expired, discoverSources, Date.parse("2026-11-27T05:00:00Z")).placement).toBe("archive");
    expect(november26Events.some(item => item.title.includes("Pearson Cross"))).toBe(false);
  });
  it("adds all six requested news topics with honest unavailable-summary and opinion states", () => {
    expect(november26News).toHaveLength(9);
    expect(new Set(november26News.flatMap(item => item.topics))).toEqual(new Set(["louisiana", "science", "national", "technology", "discovery", "world"]));
    for (const item of november26News) expect(assessItem(item, discoverSources, now).placement).toBe("main");
    expect(november26News.find(item => item.id.includes("economy-ai"))).toMatchObject({ access: "unknown", summary: { kind: "unavailable" } });
    expect(november26News.find(item => item.id.includes("nigeria"))?.format).toBe("opinion");
    expect(november26News.every(item => item.publishedAt === null && item.publishedOn !== undefined)).toBe(true);
  });
  it("renders source/author/license credit and provides refresh instructions without pretending page reload fetches sources", () => {
    const item = november26News.find(item => item.id.includes("nepal"))!;
    const source = discoverSources.find(source => source.id === item.evidence.sourceId)!;
    const html = renderToStaticMarkup(createElement(DiscoverItemCard, { entry: { item, assessment: assessItem(item, discoverSources, now) }, source, saved: false, onSave() {} }));
    expect(html).toContain("Sanjib Chaudhary"); expect(html).toContain("CC BY 3.0"); expect(html).toContain(item.evidence.url);
    const screen = renderToStaticMarkup(createElement(DiscoverScreen, { items: november26Events, sources: discoverSources, now }));
    expect(screen).toContain("How to refresh Discover"); expect(screen).toContain(discoverRefreshUrl);
    expect(screen).toContain("refreshing this page alone does not check sources");
    expect(screen).not.toContain("Selected feeds update daily");
  });
});
