import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DiscoverItemCard, DiscoverScreen } from "@/components/discover/discover-view";
import { EntertainmentImportDetails } from "@/components/discover/entertainment-bridge";
import { entertainmentDraft } from "./entertainment";
import { entertainmentCheckedAt, entertainmentNews, foodDealUpdates } from "./entertainment-content-2026-11-26";
import { discoverSources } from "./sources";
import { assessItem, catalogErrors } from "./catalog";
const now = Math.max(Date.parse(entertainmentCheckedAt), ...entertainmentNews.map(item => Date.parse(item.evidence.verifiedAt!)));
describe("entertainment news and food offer curation", () => {
  it("validates explicit titles for all media and labels publisher announcements honestly", () => {
    for (const item of entertainmentNews) {
      expect(catalogErrors(item, discoverSources, now)).toEqual([]);
      expect(item.format).toBe("institutional-update");
      for (const title of item.entertainment!) expect(entertainmentDraft(title, item.evidence.url).title).toBe(title.title);
    }
    expect(new Set(entertainmentNews.flatMap(item => item.topics))).toEqual(new Set(["games", "discovery", "movies", "tv", "anime"]));
    expect(entertainmentNews.flatMap(item => item.entertainment!).some(title => title.anime)).toBe(true);
    const invalid = { ...entertainmentNews[0], entertainment: [{ ...entertainmentNews[0].entertainment![0], title: "<script>" }] };
    expect(catalogErrors(invalid, discoverSources, now)).toContain("Invalid Entertainment title metadata");
  });
  it("offers title-specific add buttons only for current checked stories", () => {
    const item = entertainmentNews[0], source = discoverSources.find(source => source.id === item.evidence.sourceId)!;
    const render = (at: number) => renderToStaticMarkup(createElement(DiscoverItemCard, { entry: { item, assessment: assessItem(item, discoverSources, at) }, source, saved: false, onSave() {}, onAdd() {} }));
    expect(render(now)).toContain(`Add ${item.entertainment![0].title} to Entertainment`);
    expect(render(now)).not.toContain("disabled=\"\"");
    expect(render(now + 25 * 3_600_000)).toContain("disabled=\"\"");
    const screen = renderToStaticMarkup(createElement(DiscoverScreen, { items: entertainmentNews, sources: discoverSources, now, initialTab: "news" }));
    for (const label of ["Games", "Movies", "TV", "Anime", "News category"]) expect(screen).toContain(label);
  });
  it("keeps national offers outside confirmed-nearby results and expires each window", () => {
    for (const item of foodDealUpdates) expect(catalogErrors(item, discoverSources, now)).toEqual([]);
    expect(foodDealUpdates.slice(0, 3).map(item => assessItem(item, discoverSources, now).placement)).toEqual(["national-check-local", "national-check-local", "national-check-local"]);
    expect(assessItem(foodDealUpdates[3], discoverSources, now).placement).toBe("review-only");
    for (const item of foodDealUpdates.slice(0, 3)) expect(assessItem(item, discoverSources, Date.parse("2028-01-01T12:00:00Z")).state).toBe("expired");
    const item = foodDealUpdates[1];
    const html = renderToStaticMarkup(createElement(DiscoverItemCard, { entry: { item, assessment: assessItem(item, discoverSources, now) }, source: discoverSources.find(source => source.id === item.evidence.sourceId)!, saved: false, onSave() {} }));
    expect(html).toContain("original start date was not published"); expect(html).toContain("nearby participation unknown");
    const screen = renderToStaticMarkup(createElement(DiscoverScreen, { items: foodDealUpdates, sources: discoverSources, now, initialTab: "deal" }));
    expect(screen).toContain("0 confirmed nearby deals · 3 national offers to check locally");
    expect(screen).not.toContain("No confirmed nearby deals right now");
  });
  it("renders confirmed-save, duplicate, archived and uncertain-save feedback", () => {
    const draft = entertainmentDraft(entertainmentNews[0].entertainment![0], entertainmentNews[0].evidence.url);
    const render = (phase: "saved" | "exists" | "ready", error = "") => renderToStaticMarkup(createElement(EntertainmentImportDetails, { state: { phase, draft, existing: { id: "invented", archived: true }, error } }));
    expect(render("saved")).toContain("Added to Entertainment");
    expect(render("exists")).toContain("(archived)"); expect(render("exists")).toContain("notes were kept");
    expect(render("ready", "Save was not confirmed")).toContain("role=\"alert\"");
  });
});
