import { describe, expect, it } from "vitest";
import { matchesEventDate } from "./event-filters";
import { eventFixture, fixtureSources } from "./catalog.fixtures";
import { catalogEntries } from "./presentation";
import type { EventWindow } from "./types";

const timed = (startsAt: string, endsAt: string): EventWindow => ({ kind: "timed", startsAt, endsAt, timeZone: "America/Chicago" });
describe("outing calendar filters", () => {
  it("uses the local day when UTC is already tomorrow", () => {
    const now = Date.parse("2026-11-20T04:30:00Z"); // Thursday evening Central
    expect(matchesEventDate(timed("2026-11-19T22:00:00-06:00", "2026-11-19T23:00:00-06:00"), now, "today")).toBe(true);
    expect(matchesEventDate(timed("2026-11-20T00:00:00-06:00", "2026-11-20T01:00:00-06:00"), now, "today")).toBe(false);
  });
  it("includes an ongoing date-range exhibit and respects its exclusive end", () => {
    const window: EventWindow = { kind: "dates", startDate: "2026-10-23", endDateExclusive: "2026-12-05", timeZone: "America/Chicago" };
    expect(matchesEventDate(window, Date.parse("2026-12-04T18:00:00Z"), "today")).toBe(true);
    expect(matchesEventDate(window, Date.parse("2026-12-05T18:00:00Z"), "today")).toBe(false);
  });
  it("does not count a midnight end as a second attendance day", () => {
    const now = Date.parse("2026-11-21T18:00:00Z");
    expect(matchesEventDate(timed("2026-11-20T21:00:00-06:00", "2026-11-21T00:00:00-06:00"), now, "today")).toBe(false);
    expect(matchesEventDate(timed("2026-11-20T21:00:00-06:00", "2026-11-21T01:00:00-06:00"), now, "today")).toBe(true);
  });
  it("counts seven calendar days across the spring DST transition", () => {
    const now = Date.parse("2026-03-06T23:30:00-06:00");
    expect(matchesEventDate(timed("2026-03-12T23:45:00-05:00", "2026-03-13T00:15:00-05:00"), now, "week")).toBe(true);
    expect(matchesEventDate(timed("2026-03-13T00:00:00-05:00", "2026-03-13T01:00:00-05:00"), now, "week")).toBe(false);
  });
  it("keeps start-only listings on their stated day without inventing an end", () => {
    const window: EventWindow = { kind: "start-only", startsAt: "2026-11-20T21:00:00-06:00", timeZone: "America/Chicago" };
    expect(matchesEventDate(window, Date.parse("2026-11-20T18:00:00Z"), "today")).toBe(true);
    expect(matchesEventDate(window, Date.parse("2026-11-21T18:00:00Z"), "today")).toBe(false);
  });
  it("does not let a matching date revive a stale listing", () => {
    const item = eventFixture();
    const now = Date.parse("2026-11-12T20:00:00-06:00");
    item.evidence.verifiedAt = "2026-11-11T01:00:00Z";
    expect(matchesEventDate(item.window, now, "today")).toBe(true);
    expect(catalogEntries([item], fixtureSources, now)[0].assessment.placement).toBe("review-only");
  });
});
