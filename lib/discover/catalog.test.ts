import { describe, expect, it } from "vitest";
import { assessItem, canonicalUrl, catalogErrors, groupDuplicates } from "./catalog";
import { dealFixture, eventFixture, fixtureSources, newsFixture, NOW } from "./catalog.fixtures";
import { discoverSources } from "./sources";
import { discoverDefaults, type DiscoverItem } from "./types";

const assess = (item: DiscoverItem, at = NOW) => assessItem(item, fixtureSources, at);

describe("curated catalog validation", () => {
  it("accepts invented records without claiming real listings or local participation", () => {
    for (const item of [eventFixture(), newsFixture(), dealFixture()]) expect(catalogErrors(item, fixtureSources, NOW)).toEqual([]);
    expect(assess(eventFixture())).toMatchObject({ state: "upcoming", placement: "main" });
    expect(assess(newsFixture())).toMatchObject({ state: "current", placement: "main" });
    expect(assess(dealFixture())).toMatchObject({ state: "active", placement: "national-check-local" });
  });

  it.each(["2026-02-30T12:00:00Z", "2026-11-12T17:00:00", "not-a-date", "2026-11-12T25:00:00Z", "2026-11-12T19:00:00Z"])("rejects invalid, implicit-local or future evidence time %s", value => {
    const item = eventFixture(); item.evidence.verifiedAt = value;
    expect(assess(item).state).toBe("invalid");
  });

  it("fails closed for unknown sources, missing links, empty titles and invalid clocks", () => {
    const item = newsFixture(); item.evidence.sourceId = "missing"; item.evidence.url = "javascript:alert(1)"; item.title = " ";
    expect(assess(item)).toMatchObject({ state: "invalid", placement: "review-only" });
    expect(assess(newsFixture(), NaN).state).toBe("invalid");
    expect(assess(newsFixture(), Number.MAX_VALUE).state).toBe("invalid");
  });

  it("does not infer verification from source reputation or fetching", () => {
    const item = newsFixture(); item.evidence.verifiedAt = null;
    expect(assess(item).state).toBe("invalid");
    item.evidence.level = "unverified"; item.evidence.fetchedAt = "2026-11-12T18:00:00Z";
    expect(assess(item)).toMatchObject({ state: "needs-confirmation", placement: "review-only" });
  });

  it("keeps unknown prices, publication times, access and unavailable summaries explicit", () => {
    const item = newsFixture(); item.publishedAt = null;
    expect(assess(item).state).toBe("current");
    expect(item.access).toBe("unknown");
    expect(eventFixture().price.kind).toBe("unknown");
    item.summary = { kind: "original", text: " ", writtenAt: "2026-11-12T17:00:00Z" };
    expect(assess(item).state).toBe("invalid");
  });

  it("rejects invalid dates, zones, reversed windows and unsafe registration links", () => {
    const item = eventFixture();
    item.window = { kind: "dates", startDate: "2026-02-30", endDateExclusive: "2026-03-02", timeZone: "America/Chicago" };
    expect(assess(item).state).toBe("invalid");
    item.window = { kind: "timed", startsAt: "2026-11-12T19:00:00Z", endsAt: "2026-11-12T18:00:00Z", timeZone: "America/Chicago" };
    expect(assess(item).state).toBe("invalid");
    item.window = { ...eventFixture().window, timeZone: "Imaginary/Place" };
    expect(assess(item).state).toBe("invalid");
    item.window = eventFixture().window; item.registrationUrl = "http://example.invalid/register";
    expect(assess(item).state).toBe("invalid");
  });
});

describe("occurrences, expiration and stale data", () => {
  it.each(["canceled", "postponed", "withdrawn"] as const)("archives %s items even with a future occurrence", status => {
    expect(assess({ ...eventFixture(), status })).toMatchObject({ state: status, placement: "archive" });
  });

  it("uses start-inclusive and end-exclusive instants", () => {
    const item = eventFixture(); item.evidence.verifiedAt = "2026-11-13T00:30:00Z";
    expect(assess(item, Date.parse("2026-11-13T01:00:00Z")).state).toBe("active");
    expect(assess(item, Date.parse("2026-11-13T03:00:00Z"))).toMatchObject({ state: "expired", placement: "archive" });
  });

  it("accepts a known event start without inventing a duration and retires it at start", () => {
    const item = eventFixture(); item.window = { kind: "start-only", startsAt: "2026-11-12T19:00:00-06:00", timeZone: "America/Chicago" };
    expect(assess(item).state).toBe("upcoming");
    item.evidence.verifiedAt = "2026-11-13T00:30:00Z";
    expect(assess(item, Date.parse("2026-11-13T01:00:00Z")).state).toBe("expired");
  });

  it("expires date-only deals at Central midnight, not UTC midnight", () => {
    const item = dealFixture();
    expect(assess(item, Date.parse("2026-11-13T05:59:59Z")).state).toBe("active");
    expect(assess(item, Date.parse("2026-11-13T06:00:00Z")).state).toBe("expired");
  });

  it.each([
    ["2026-03-08", "2026-03-09", "2026-03-09T05:00:00Z"], // 23-hour local day
    ["2026-11-01", "2026-11-02", "2026-11-02T06:00:00Z"], // 25-hour local day
  ])("honors the DST local-day boundary for %s", (startDate, endDateExclusive, cutoff) => {
    const item = dealFixture(); const end = Date.parse(cutoff);
    item.window = { kind: "dates", startDate, endDateExclusive, timeZone: "America/Chicago" };
    item.evidence.verifiedAt = new Date(end - 3_600_000).toISOString();
    item.requirements.reviewedAt = item.evidence.verifiedAt;
    expect(assess(item, end - 1).state).toBe("active");
    expect(assess(item, end).state).toBe("expired");
  });

  it("handles both repeated fall-back hours as distinct instants", () => {
    const item = eventFixture();
    item.window = { kind: "timed", startsAt: "2026-11-01T01:30:00-05:00", endsAt: "2026-11-01T01:30:00-06:00", timeZone: "America/Chicago" };
    item.evidence.verifiedAt = "2026-11-01T06:00:00Z";
    expect(assess(item, Date.parse("2026-11-01T07:00:00Z")).state).toBe("active");
    expect(assess(item, Date.parse("2026-11-01T07:30:00Z")).state).toBe("expired");
  });

  it("requires daily rechecks for events within 48 hours, weekly for more distant events", () => {
    const item = eventFixture(); item.evidence.verifiedAt = "2026-11-11T18:00:00Z";
    expect(assess(item).state).toBe("stale");
    item.window = { kind: "timed", startsAt: "2026-11-20T19:00:00-06:00", endsAt: "2026-11-20T21:00:00-06:00", timeZone: "America/Chicago" };
    expect(assess(item).state).toBe("upcoming");
    item.evidence.verifiedAt = "2026-11-05T18:00:00Z";
    expect(assess(item).state).toBe("stale");
  });

  it("applies near-date rechecks to all-day events too", () => {
    const item = eventFixture(); item.window = { kind: "dates", startDate: "2026-11-14", endDateExclusive: "2026-11-15", timeZone: "America/Chicago" };
    item.evidence.verifiedAt = "2026-11-11T18:00:00Z";
    expect(assess(item).state).toBe("stale");
  });

  it("does not freshen a human review when the source is fetched again", () => {
    const item = newsFixture(); item.evidence.verifiedAt = "2026-11-11T18:00:00Z"; item.evidence.fetchedAt = "2026-11-12T18:00:00Z";
    expect(assess(item)).toMatchObject({ state: "stale", placement: "review-only" });
  });

  it("requires rechecking a source update that postdates human verification", () => {
    const item = eventFixture(); item.evidence.sourceUpdatedAt = "2026-11-12T17:30:00Z";
    expect(assess(item)).toMatchObject({ state: "needs-confirmation", placement: "review-only" });
  });

  it("never treats missing validity or unreviewed deal terms as active", () => {
    const item = dealFixture(); item.window = null;
    expect(assess(item).state).toBe("needs-confirmation");
    item.window = dealFixture().window; item.requirements.reviewedAt = null;
    expect(assess(item).state).toBe("needs-confirmation");
  });

  it("shows future deals as upcoming rather than currently redeemable", () => {
    const item = dealFixture(); item.window = { kind: "dates", startDate: "2026-11-13", endDateExclusive: "2026-11-14", timeZone: "America/Chicago" };
    expect(assess(item)).toMatchObject({ state: "upcoming", placement: "national-check-local" });
  });

  it("requires named, recent local participation independent of national evidence", () => {
    const item = dealFixture(); item.participation = { kind: "confirmed-nearby", locations: [], checkedAt: "2026-11-12T17:00:00Z" };
    expect(assess(item).state).toBe("invalid");
    item.participation.locations = ["Invented Ruston location"];
    expect(assess(item)).toMatchObject({ state: "active", placement: "main" });
    item.participation.checkedAt = "2026-11-11T18:00:00Z";
    expect(assess(item).state).toBe("stale");
  });

  it("expires previously valid offers even when old checks would also be stale", () => {
    expect(assess(dealFixture(), Date.parse("2026-11-14T18:00:00Z"))).toMatchObject({ state: "expired", placement: "archive" });
  });
});

describe("duplicate identity and source policy", () => {
  it("removes tracking while preserving article-defining parameters", () => {
    expect(canonicalUrl("https://example.invalid/article?id=2&utm_source=test#top")).toBe("https://example.invalid/article?id=2");
    expect(canonicalUrl("https://user:secret@example.invalid/article")).toBeNull();
    const a = newsFixture(), b = newsFixture(); b.id = "copy"; b.evidence.url += "?utm_source=test";
    expect(groupDuplicates([a, b])).toHaveLength(1);
    b.evidence.url += "&id=2";
    expect(groupDuplicates([a, b])).toHaveLength(2);
  });

  it("retains conflicting records within one group for editorial review", () => {
    const a = eventFixture(); a.evidence.sourceItemId = "occurrence-1";
    const b = { ...a, id: "copy", status: "canceled" as const };
    expect(groupDuplicates([a, b])).toEqual([[a, b]]);
    const correctedEnd = eventFixture(); correctedEnd.evidence.sourceItemId = "occurrence-1";
    correctedEnd.window = { kind: "timed", startsAt: "2026-11-13T01:00:00Z", endsAt: "2026-11-13T04:00:00Z", timeZone: "America/Chicago" };
    expect(groupDuplicates([a, correctedEnd])).toHaveLength(1);
  });

  it("does not collapse different event occurrences or deals sharing terms pages", () => {
    const a = eventFixture(), b = eventFixture(); a.evidence.sourceItemId = b.evidence.sourceItemId = "weekly-series";
    b.window = { kind: "timed", startsAt: "2026-11-19T19:00:00-06:00", endsAt: "2026-11-19T21:00:00-06:00", timeZone: "America/Chicago" };
    expect(groupDuplicates([a, b])).toHaveLength(2);
    const offer = dealFixture();
    expect(groupDuplicates([offer, { ...offer, id: "different-offer" }])).toHaveLength(2);
    offer.window = { kind: "timed", startsAt: "2026-11-12T00:00:00Z", endsAt: "2026-11-13T00:00:00Z", timeZone: "America/Chicago" };
    const revisedWindow = { ...offer, window: { ...offer.window, endsAt: "2026-11-14T00:00:00Z" } };
    expect(groupDuplicates([offer, revisedWindow])).toHaveLength(2);
  });

  it("groups cross-publisher coverage only with explicit editorial identity", () => {
    const a = newsFixture(), b = newsFixture(); b.evidence.url = "https://another.invalid/story";
    expect(groupDuplicates([a, b])).toHaveLength(2);
    a.duplicateGroup = b.duplicateGroup = "curated-story-1";
    expect(groupDuplicates([a, b])).toHaveLength(1);
  });

  it("records free-only research candidates without enabling integrations", () => {
    expect(new Set(discoverSources.map(source => source.id)).size).toBe(discoverSources.length);
    for (const source of discoverSources) {
      expect(canonicalUrl(source.url)).not.toBeNull();
      expect(source.automation).toBe("not-approved");
    }
    expect(discoverDefaults.nearbyCities).toContain("Monroe");
    expect(discoverDefaults.preferredMaxPriceUSD).toBe(20);
    expect(discoverDefaults.newsTopics).toContain("world");
  });
});
