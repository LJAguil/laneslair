import { describe, expect, it } from "vitest";
import { emptyInput, filterLibrary, groupLibrary, normalize, recommend, randomSuggestion, STATUSES, type EntertainmentItem, type RecommendationRequest } from "./model";
const item = (fields: Partial<EntertainmentItem> = {}): EntertainmentItem => ({ ...emptyInput, id: "a", user_id: "synthetic-owner", title: "The Paper Comet", ...fields });
const preferences: RecommendationRequest["preferences"] = { media: "all", minutes: null, tags: [], favor: "priority", allowUnknown: false };
describe("entertainment rules", () => {
  it("groups by media with in-progress titles first within each group", () => {
    const grouped = groupLibrary([item({ title: "A planned movie" }), item({ id: "b", title: "Z continuing movie", status: "in_progress" }), item({ id: "c", media: "game" })]);
    expect(grouped.map(g => g.media)).toEqual(["movie", "game"]);
    expect(grouped[0].items.map(i => i.id)).toEqual(["b", "a"]);
  });
  it("filters type/status/archive independently and keeps finished history", () => {
    const items = [item(), item({ id: "b", media: "show", status: "in_progress" }), item({ id: "c", status: "finished" }), item({ id: "d", archived: true })];
    expect(filterLibrary(items, "all", "unfinished", false).map(i => i.id)).toEqual(["a", "b"]);
    expect(filterLibrary(items, "show", "in_progress", false)).toHaveLength(1);
    expect(filterLibrary(items, "all", "all", true).map(i => i.id)).toEqual(["d"]);
    expect(filterLibrary(items, "all", "finished", false)).toHaveLength(1);
  });
  it("preserves explicit progress across every status, without inventing progress or auto-finishing", () => {
    for (const status of STATUSES) {
      expect(normalize(item({ media: "show", status, season: 2, episode: 3 }))).toMatchObject({ status, season: 2, episode: 3 });
      expect(normalize(item({ media: "game", status, progress: "Reached the glass bridge" }))).toMatchObject({ status, progress: "Reached the glass bridge" });
    }
    expect(normalize(item({ media: "movie", season: 2, episode: 3, progress: "old" }))).toMatchObject({ season: null, episode: null, progress: "" });
  });
  it("validates inputs, deduplicates tags and rejects malformed estimates", () => {
    expect(normalize(item({ tags: [" Cozy ", "cozy", ""] })).tags).toEqual(["cozy"]);
    for (const fields of [{ title: " " }, { minutes: 0 }, { minutes: 1.5 }, { episode: -1 }, { note: "x".repeat(1001) }]) expect(() => normalize(item(fields))).toThrow();
  });
  it("excludes finished, dropped, archived, over-time, wrong-type and unknown-time titles", () => {
    const items = [item({ minutes: 20, tags: ["cozy"] }), item({ id: "b", minutes: 90 }), item({ id: "c" }), item({ id: "d", status: "finished" }), item({ id: "e", status: "dropped" }), item({ id: "f", archived: true }), item({ id: "g", media: "game", minutes: 20 })];
    expect(recommend({ items, preferences: { ...preferences, minutes: 30, media: "movie", tags: ["COZY"] } }).map(s => s.item.id)).toEqual(["a"]);
    expect(recommend({ items, preferences: { ...preferences, minutes: 30, allowUnknown: true } }).map(s => s.item.id)).toContain("c");
    expect(recommend({ items, preferences: { ...preferences, minutes: 30, allowUnknown: true } }).find(s => s.item.id === "c")?.reasons).toContain("Session length unknown — may exceed your time limit");
    expect(recommend({ items, preferences: { ...preferences, tags: ["absent"] } })).toEqual([]);
  });
  it("ranks explicit priorities or continuation and randomizes only the suitable pool", () => {
    const items = [item({ priority: 2 }), item({ id: "b", status: "in_progress" })];
    const ranked = recommend({ items, preferences });
    expect(ranked[0].item.id).toBe("a");
    expect(ranked[0].reasons).toContain("High priority");
    expect(recommend({ items, preferences: { ...preferences, favor: "continue" } })[0].item.id).toBe("b");
    expect(randomSuggestion(ranked, () => 0)?.item.id).toBe("a");
    expect(randomSuggestion(ranked, () => 0.99)?.item.id).toBe("b");
    expect(randomSuggestion([])).toBeUndefined();
  });
});
