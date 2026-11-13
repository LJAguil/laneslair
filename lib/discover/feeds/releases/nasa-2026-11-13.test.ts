import { afterEach, describe, expect, it, vi } from "vitest";
import { nasaReviewBundleBytes } from "./nasa-2026-11-13";
import { loadBundledCatalog, type BundledFeedSelection } from "../bundled-catalog";
import { reviewDigest, validateReviewBundle } from "../review-bundle";
import { catalogEntries } from "../../presentation";
import { candidateCatalog } from "../../candidate";
import { discoverSources } from "../../sources";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ io: vi.fn(async () => {}) }));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

// Independently pinned review identity, never derived from the packaged input.
const expectedDigest = "94bd1b2083a41695fe9b33f7cd4779647d13c0979147fb4acf31bd1c02f06bfb";
const checkedAt = "2026-11-13T19:30:14.739Z";
const reviewClock = Date.parse("2026-11-13T22:07:54Z");
const selection = { bytes: nasaReviewBundleBytes, expectedDigest };
const load = (selected: BundledFeedSelection | null = selection, now = reviewClock) =>
  loadBundledCatalog({ curated: candidateCatalog, sources: discoverSources, selection: selected, now });

describe("packaged real NASA capture (offline)", () => {
  it("retains the reviewed UTF-8 identity, provenance clock and ten metadata items", () => {
    expect(Buffer.byteLength(nasaReviewBundleBytes, "utf8")).toBe(5614);
    expect(reviewDigest(nasaReviewBundleBytes)).toBe(expectedDigest);
    const bundle = validateReviewBundle(nasaReviewBundleBytes, expectedDigest, reviewClock);
    expect(bundle.inputKind).toBe("local-snapshot");
    expect(bundle.preparedAt).toBe("2026-11-13T19:30:14.752Z");
    expect(bundle.snapshot.representationCheckedAt).toBe(checkedAt);
    expect(bundle.snapshot.candidates).toHaveLength(10);
  });
  it("maps optional content without exposing transport validators or borrowing summaries", () => {
    const before = JSON.stringify(candidateCatalog);
    const result = load();
    expect(result.feed).toEqual({ status: "loaded", checkedAt, itemCount: 10 });
    const feedItems = result.items.filter(item => item.evidence.level === "publisher-feed");
    expect(feedItems).toHaveLength(10);
    for (const item of feedItems) {
      expect(item.kind).toBe("news");
      if (item.kind !== "news") throw new Error("Expected news");
      expect(item.summary.kind).toBe("unavailable");
      expect(item).toMatchObject({ format: "institutional-update", access: "unknown", evidence: { verifiedAt: null, representationCheckedAt: checkedAt } });
    }
    expect(JSON.stringify(JSON.parse(JSON.stringify(result)))).toBe(JSON.stringify(result));
    for (const field of ["etag", "lastModified", "snapshotDigest", "preparedAt"]) expect(JSON.stringify(result)).not.toContain(`"${field}"`);
    expect(JSON.stringify(candidateCatalog)).toBe(before);
  });
  it("moves every feed item out of main results exactly at the original 24-hour boundary", () => {
    const now = Date.parse(checkedAt) + 24 * 3_600_000;
    for (const [at, state, placement] of [[now - 1, "current", "main"], [now, "stale", "review-only"]] as const) {
      const entries = catalogEntries(load(selection, at).items, discoverSources, at).filter(entry => entry.item.evidence.level === "publisher-feed");
      expect(entries).toHaveLength(10);
      for (const entry of entries) expect(entry.assessment).toMatchObject({ state, placement });
    }
  });
  it("archives all feed stories after their publication-age limits without renewing checks", () => {
    const now = Date.parse("2026-11-21T22:07:54Z");
    const result = load(selection, now);
    expect(result.feed).toMatchObject({ checkedAt });
    const entries = catalogEntries(result.items, discoverSources, now).filter(entry => entry.item.evidence.level === "publisher-feed");
    expect(entries).toHaveLength(10);
    for (const entry of entries) expect(entry.assessment).toMatchObject({ state: "expired", placement: "archive" });
  });
  it("retains the complete candidate on absent, altered or future-dated supplemental input", () => {
    for (const selected of [null, { ...selection, bytes: "" }, { ...selection, bytes: nasaReviewBundleBytes + "\n" }])
      expect(load(selected)).toEqual({ items: candidateCatalog, feed: { status: "unavailable" } });
    expect(load(selection, Date.parse("2026-11-13T19:30:14.751Z")))
      .toEqual({ items: candidateCatalog, feed: { status: "unavailable" } });
  });
  it("keeps the selected app feed stale after its deadline without requesting an update", async () => {
    const fetch = vi.fn(() => { throw new Error("Network forbidden"); });
    vi.stubGlobal("fetch", fetch);
    const { io } = await import("next/cache"); vi.mocked(io).mockClear();
    const now = Date.parse(checkedAt) + 24 * 3_600_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    const { publishedDiscoverCatalog } = await import("../published");
    const result = await publishedDiscoverCatalog();
    expect(result.feed).toEqual({ status: "loaded", checkedAt, itemCount: 10 });
    const feedEntries = catalogEntries(result.items, discoverSources, now).filter(entry => entry.item.evidence.level === "publisher-feed");
    expect(feedEntries).toHaveLength(10);
    for (const entry of feedEntries) expect(entry.assessment).toMatchObject({ state: "stale", placement: "review-only" });
    expect(fetch).not.toHaveBeenCalled(); expect(io).toHaveBeenCalledOnce();
  });
});
