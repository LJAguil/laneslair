import { describe, expect, it } from "vitest";
import { dailyAuthority, assertPilotStore, assertManualBaseline } from "../../../scripts/discover/daily-authority.mjs";
import { bootstrapDailySnapshot, decodeDailySnapshot, emptyDailySnapshot, reserveDaily } from "./snapshot";

const base = {
  GITHUB_ACTIONS: "true", GITHUB_REPOSITORY: "LJAguil/laneslair",
  GITHUB_REF: "refs/heads/main", DISCOVER_REPOSITORY_PRIVATE: "false",
  GITHUB_EVENT_NAME: "workflow_dispatch", DISCOVER_RUN_MODE: "controlled-pilot",
  DISCOVER_DAILY_ENABLED: "false",
};
describe("first data-only pilot authority", () => {
  it("allows an explicit pilot with the recurring switch off", () => {
    expect(dailyAuthority(base)).toBe("pilot");
    expect(() => assertPilotStore("pilot", null)).not.toThrow();
  });
  it("requires independent schedule authorization and refuses default manual dispatches", () => {
    expect(() => dailyAuthority({ ...base, GITHUB_EVENT_NAME: "schedule" })).toThrow();
    expect(() => dailyAuthority({ ...base, DISCOVER_DAILY_ENABLED: "true" })).toThrow();
    expect(dailyAuthority({ ...base, GITHUB_EVENT_NAME: "schedule", DISCOVER_DAILY_ENABLED: "true" })).toBe("scheduled");
    for (const mode of [undefined, "inspect-only", "unknown"]) {
      expect(() => dailyAuthority({ ...base, DISCOVER_RUN_MODE: mode, DISCOVER_DAILY_ENABLED: "true" })).toThrow();
    }
  });
  it("refuses forks, private repositories, other refs and event types", () => {
    for (const override of [
      { GITHUB_ACTIONS: "false" }, { GITHUB_REPOSITORY: "invented/fork" },
      { GITHUB_REF: "refs/heads/discover-data" }, { DISCOVER_REPOSITORY_PRIVATE: "true" },
      { DISCOVER_REPOSITORY_PRIVATE: undefined }, { GITHUB_EVENT_NAME: "push" },
    ]) expect(() => dailyAuthority({ ...base, ...override })).toThrow();
  });
  it("refuses to repeat an initialized pilot, including a pending/failed reservation", () => {
    expect(() => assertPilotStore("pilot", "invented-existing-head")).toThrow("pilot-already-initialized");
    expect(() => assertPilotStore("scheduled", "invented-existing-head")).not.toThrow();
  });
});
describe("first ledger carries known capture receipts", () => {
  it("keeps the durable snapshot byte-identical when a second manual click is rate limited", () => {
    const now = Date.parse("2026-11-26T12:00:00Z");
    const first = reserveDaily(bootstrapDailySnapshot(now), now);
    const saved = JSON.stringify(first.snapshot);
    const restored = decodeDailySnapshot(saved, now + 60_000);
    const again = reserveDaily(restored, now + 60_000);
    expect(again.ids).toEqual([]);
    expect(JSON.stringify(again.snapshot)).toBe(saved);
    expect(again.snapshot.updatedAt).toBe(first.snapshot.updatedAt);
    expect(again.snapshot).toBe(restored);
  });
  it("does not turn a source-request backoff into a new storage/check timestamp", () => {
    const now = Date.parse("2026-11-26T12:00:00Z"), snapshot = emptyDailySnapshot(now);
    for (const source of snapshot.sources) source.retryAfterAt = "2026-11-28T12:00:00.000Z";
    const again = reserveDaily(snapshot, now + 86_400_000);
    expect(again.ids).toEqual([]);
    expect(again.snapshot).toBe(snapshot);
    expect(again.snapshot.sources.every(source => source.checkedAt === null && source.attempts.length === 0)).toBe(true);
  });
  it("allows repeat manual refresh only after every source has a successful baseline", () => {
    expect(dailyAuthority({ ...base, DISCOVER_RUN_MODE: "refresh-now" })).toBe("manual");
    expect(() => dailyAuthority({ ...base, DISCOVER_RUN_MODE: "refresh-now", DISCOVER_DAILY_ENABLED: "true" })).toThrow();
    expect(() => assertManualBaseline("manual", null)).toThrow();
    expect(() => assertManualBaseline("manual", { sources: [{ checkedAt: null }] })).toThrow();
    expect(() => assertManualBaseline("manual", { sources: [{ checkedAt: "2026-11-26T12:00:00.000Z" }] })).not.toThrow();
  });
  it("does not replace historical requests with fabricated editorial or transport clocks", () => {
    const now = Date.parse("2026-11-26T12:00:00Z"), snapshot = bootstrapDailySnapshot(now);
    expect(decodeDailySnapshot(JSON.stringify(snapshot), now)).toEqual(snapshot);
    expect(snapshot.sources.every(source => source.attempts.length === 1 && source.checkedAt === null && source.fetchedAt === null && source.items.length === 0)).toBe(true);
    const reservation = reserveDaily(snapshot, now);
    expect(reservation.ids).toHaveLength(3);
    expect(reservation.snapshot.sources.every(source => source.attempts.length === 2)).toBe(true);
    expect(reserveDaily(reservation.snapshot, now + 60_000).ids).toHaveLength(0);
  });
  it("respects the research-capture day and six-hour cooldown when bootstrapping", () => {
    const now = Date.parse("2026-11-20T08:00:00Z");
    expect(reserveDaily(bootstrapDailySnapshot(now), now).ids).toEqual(["nasa-daily"]);
    expect(() => bootstrapDailySnapshot(Date.parse("2026-11-19T12:00:00Z"))).toThrow();
  });
});
