import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiscoverScreen } from "@/components/discover/discover-view";
import { assessItem } from "../catalog";
import { catalogEntries } from "../presentation";
import { curatedCatalog } from "../curated";
import { discoverSources } from "../sources";
import { dailySources, DAILY_BODY_BYTES, DAILY_FRESHNESS_MS } from "./policy";
import { parseDailyFeed } from "./parsers";
import { decodeDailySnapshot, dailySnapshotItems, emptyDailySnapshot, reserveDaily, type DailySnapshot } from "./snapshot";
import { completeDaily } from "./transport";
import { readDailyCatalog, mergeDailyItems } from "./reader";
import { fixtureFeed, fixtureItem } from "../feeds/nasa.fixtures";
import { feedNewsFixture } from "../feed-evidence.fixtures";

const NOW = Date.parse("2026-11-20T12:00:00Z");
const rss = (title = "Invented test headline", extra = "", items = true) => `<rss xmlns:dc="http://purl.org/dc/elements/1.1/"><channel>${items ? `<item><title>${title}</title><link>https://lailluminator.com/2026/11/20/invented/</link><pubDate>Fri, 20 Nov 2026 10:00:00 +0000</pubDate><dc:creator>Invented Author</dc:creator>${extra}<description><![CDATA[<script>not imported</script> Full body must not be retained.]]></description></item>` : ""}</channel></rss>`;
const event = (extra = "", location = "Ruston High School", start = "20261121T010000Z", end = "20261121T030000Z") => `BEGIN:VEVENT\r\nUID:invented-1\r\nDTSTART:${start}\r\nDTEND:${end}\r\nSUMMARY:Invented home game\r\nLOCATION:${location}\r\n${extra}END:VEVENT\r\n`;
const calendar = (events = event()) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${events}END:VCALENDAR\r\n`;
const reply = (body: string, type = "text/calendar", headers = {}) => new Response(body, { status: 200, headers: { "content-type": type, ...headers } });
async function successful(): Promise<DailySnapshot> {
  const reservation = reserveDaily(emptyDailySnapshot(NOW), NOW);
  return completeDaily({ ...reservation, ids: ["ruston-athletics"], now: () => NOW,
    fetcher: async () => reply(calendar(), "text/calendar", { etag: '"invented-v1"' }) });
}
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("daily subscription parsers", () => {
  it("reuses the bounded NASA parser without importing summaries or article bodies", () => {
    const rows = parseDailyFeed("nasa-daily", fixtureFeed(fixtureItem({ published: "Fri, 20 Nov 2026 10:00:00 +0000" })), NOW);
    expect(rows[0]).toMatchObject({ kind: "news", format: "institutional-update", topics: ["science", "discovery"] });
    expect(JSON.stringify(rows)).not.toContain("Invented full article");
  });
  it("imports explicit home events while excluding away locations, without guessing travel or price", () => {
    const rows = parseDailyFeed("ruston-athletics", calendar(event() + event("", "Ferriday High School")), NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ startsAt: "2026-11-21T01:00:00.000Z", endsAt: "2026-11-21T03:00:00.000Z", city: "Ruston", venue: "Ruston High School" });
    expect(parseDailyFeed("ruston-athletics", calendar(event("", "Unknown venue")), NOW)).toEqual([]);
  });
  it("refuses floating times and unsupported recurrence instead of expanding or inventing dates", () => {
    expect(() => parseDailyFeed("ruston-athletics", calendar(event("", undefined, "20261121T010000")), NOW)).toThrow();
    expect(() => parseDailyFeed("ruston-athletics", calendar(event("RRULE:FREQ=WEEKLY\r\n")), NOW)).toThrow();
    expect(() => parseDailyFeed("ruston-athletics", calendar(event()).replace("END:VEVENT", ""), NOW)).toThrow();
  });
  it("unfolds iCalendar lines and keeps cancellation identities", () => {
    const body = calendar(event("STATUS:CANCELLED\r\n")).replace("Invented home game", "Invented home\r\n game");
    expect(parseDailyFeed("ruston-athletics", body, NOW)[0]).toMatchObject({ id: "invented-1", title: "Invented homegame", status: "canceled" });
    expect(() => parseDailyFeed("ruston-athletics", calendar(event() + event().replace("home game", "changed game")), NOW)).toThrow("conflicting-identity");
  });
  it("keeps bylines and explicit commentary tags, discarding article bodies and images", () => {
    const rows = parseDailyFeed("illuminator-daily", rss(undefined, "<category>DC Bureau</category><category>Commentary</category>"), NOW);
    expect(rows[0]).toMatchObject({ kind: "news", author: "Invented Author", format: "opinion", topics: ["national", "discovery"] });
    expect(JSON.stringify(rows)).not.toContain("Full body");
    expect(JSON.stringify(rows)).not.toContain("script");
    expect(parseDailyFeed("illuminator-daily", rss(), NOW)[0]).toMatchObject({ format: "unclassified" });
  });
  it("rejects XML entities, malformed feeds, unsafe links and bounded-input violations", () => {
    expect(() => parseDailyFeed("illuminator-daily", '<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///secret">]>' + rss(), NOW)).toThrow();
    expect(() => parseDailyFeed("illuminator-daily", rss().replace("</channel>", ""), NOW)).toThrow();
    expect(() => parseDailyFeed("illuminator-daily", rss().replace("https://lailluminator.com/2026/11/20/invented/", "https://attacker.invalid/"), NOW)).toThrow();
    expect(() => parseDailyFeed("illuminator-daily", "x".repeat(DAILY_BODY_BYTES + 1), NOW)).toThrow();
  });
});

describe("durable daily reservations and transport", () => {
  it("spends a daily attempt before fetching and refuses same-day restart or a short midnight gap", () => {
    const first = reserveDaily(emptyDailySnapshot(NOW), NOW);
    const restored = decodeDailySnapshot(JSON.stringify(first.snapshot), NOW);
    expect(reserveDaily(restored, NOW + 3_600_000).ids).toEqual([]);
    const late = reserveDaily(emptyDailySnapshot(Date.parse("2026-11-20T23:00:00Z")), Date.parse("2026-11-20T23:00:00Z"));
    expect(reserveDaily(late.snapshot, Date.parse("2026-11-21T01:00:00Z")).ids).toEqual([]);
    expect(reserveDaily(restored, NOW + 86_400_000).ids).toHaveLength(3);
  });
  it("validates storage fields and refuses altered destinations, future clocks and unknown data", async () => {
    const snapshot = await successful();
    const mutate = (fn: (value: DailySnapshot) => void) => { const copy = structuredClone(snapshot); fn(copy); return () => decodeDailySnapshot(JSON.stringify(copy), NOW); };
    expect(mutate(value => { value.updatedAt = new Date(NOW + 1).toISOString(); })).toThrow();
    expect(mutate(value => { value.sources[2].items[0].url = "https://attacker.invalid/"; })).toThrow();
    expect(mutate(value => { value.sources[2].items[0].title = "<script>"; })).toThrow();
    expect(mutate(value => { (value.sources[2].items[0] as unknown as { status: unknown }).status = ["scheduled"]; })).toThrow();
    expect(() => decodeDailySnapshot(JSON.stringify({ ...snapshot, surprise: true }), NOW)).toThrow();
  });
  it("retains last-successful data and clocks after HTTP failure, with no retry or redirect following", async () => {
    const old = await successful(), later = NOW + 86_400_000, reservation = reserveDaily(old, later);
    const fetcher = vi.fn(async () => new Response("", { status: 503 }));
    const result = await completeDaily({ ...reservation, ids: ["ruston-athletics"], fetcher, now: () => later });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]).toBeDefined();
    expect(result.sources[2]).toMatchObject({ items: old.sources[2].items, checkedAt: old.sources[2].checkedAt, error: "request-failed" });
    expect(reserveDaily(result, later + 1).ids).toEqual([]);
  });
  it("renews only transport evidence on a conditional 304 with a validated baseline", async () => {
    const old = await successful(), later = NOW + 86_400_000, reservation = reserveDaily(old, later);
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
      expect(new Headers(init.headers).get("if-none-match")).toBe('"invented-v1"');
      expect(init).toMatchObject({ redirect: "manual", credentials: "omit" });
      return new Response(null, { status: 304 });
    });
    const result = await completeDaily({ ...reservation, ids: ["ruston-athletics"], fetcher, now: () => later });
    expect(result.sources[2]).toMatchObject({ fetchedAt: old.sources[2].fetchedAt, checkedAt: new Date(later).toISOString(), error: null });
    expect(dailySnapshotItems(result)[0].evidence.verifiedAt).toBeNull();
  });
  it("rejects a 304 without prior data and honors Retry-After across the next scheduled day", async () => {
    const reservation = reserveDaily(emptyDailySnapshot(NOW), NOW);
    const noBaseline = await completeDaily({ ...reservation, ids: ["ruston-athletics"], now: () => NOW, fetcher: async () => new Response(null, { status: 304 }) });
    expect(noBaseline.sources[2]).toMatchObject({ checkedAt: null, error: "request-failed" });
    const throttled = await completeDaily({ ...reservation, ids: ["ruston-athletics"], now: () => NOW, fetcher: async () => new Response(null, { status: 429, headers: { "retry-after": "172800" } }) });
    expect(reserveDaily(throttled, NOW + 86_400_000).ids).not.toContain("ruston-athletics");
  });
  it("replaces a successful representation, so removed events do not linger", async () => {
    const old = await successful(), later = NOW + 86_400_000;
    const result = await completeDaily({ ...reserveDaily(old, later), ids: ["ruston-athletics"], now: () => later, fetcher: async () => reply(calendar("")) });
    expect(result.sources[2]).toMatchObject({ items: [], checkedAt: new Date(later).toISOString(), error: null });
  });
  it("replaces a rescheduled occurrence with its new window instead of keeping both dates", async () => {
    const old = await successful(), later = NOW + 86_400_000;
    const body = calendar(event("", "Ruston High School", "20261122T010000Z", "20261122T030000Z"));
    const result = await completeDaily({ ...reserveDaily(old, later), ids: ["ruston-athletics"], now: () => later, fetcher: async () => reply(body) });
    expect(result.sources[2].items).toHaveLength(1);
    expect(result.sources[2].items[0]).toMatchObject({ id: "invented-1", startsAt: "2026-11-22T01:00:00.000Z" });
  });
  it("can save successful news updates when the event subscription fails", async () => {
    const reservation = reserveDaily(emptyDailySnapshot(NOW), NOW);
    const result = await completeDaily({ ...reservation, now: () => NOW, fetcher: async url => url === dailySources["nasa-daily"].url
      ? reply(fixtureFeed(fixtureItem({ published: "Fri, 20 Nov 2026 10:00:00 +0000" })), "application/rss+xml")
      : url === dailySources["illuminator-daily"].url ? reply(rss(), "application/rss+xml") : new Response(null, { status: 503 }) });
    expect(dailySnapshotItems(result)).toHaveLength(2);
    expect(result.sources.map(source => source.error)).toEqual([null, null, "request-failed"]);
    expect(result.sources[2].checkedAt).toBeNull();
  });
  it("fails closed on malformed bodies and redirects without extending a successful check", async () => {
    const old = await successful(), later = NOW + 86_400_000, reservation = reserveDaily(old, later);
    const malformed = await completeDaily({ ...reservation, ids: ["ruston-athletics"], now: () => later, fetcher: async () => reply("bad") });
    expect(malformed.sources[2]).toMatchObject({ checkedAt: old.sources[2].checkedAt, error: "parse-failed" });
    const redirected = await completeDaily({ ...reservation, ids: ["ruston-athletics"], now: () => later, fetcher: async () => new Response(null, { status: 302, headers: { location: "https://attacker.invalid" } }) });
    expect(redirected.sources[2]).toMatchObject({ checkedAt: old.sources[2].checkedAt, error: "request-failed" });
  });
  it("enforces a deadline even when an injected transport ignores abort", async () => {
    vi.useFakeTimers();
    const reservation = reserveDaily(emptyDailySnapshot(NOW), NOW);
    const pending = completeDaily({ ...reservation, ids: ["ruston-athletics"], now: () => NOW, fetcher: () => new Promise<Response>(() => {}) });
    await vi.advanceTimersByTimeAsync(15_000);
    expect((await pending).sources[2]).toMatchObject({ checkedAt: null, error: "request-failed" });
  });
});

describe("automatic catalog integration", () => {
  it("does not revive a seven-day-old story through a successful conditional check", async () => {
    const first = reserveDaily(emptyDailySnapshot(NOW), NOW);
    const old = await completeDaily({ ...first, ids: ["illuminator-daily"], now: () => NOW,
      fetcher: async () => reply(rss(), "application/rss+xml", { etag: '"invented-news"' }) });
    const later = NOW + 7 * 86_400_000;
    const result = await completeDaily({ ...reserveDaily(old, later), ids: ["illuminator-daily"], now: () => later, fetcher: async () => new Response(null, { status: 304 }) });
    expect(assessItem(dailySnapshotItems(result)[0], discoverSources, later)).toMatchObject({ state: "expired", placement: "archive" });
  });
  it("supersedes the historical NASA snapshot only after a successful daily representation, even when empty", async () => {
    const saved = [feedNewsFixture(), ...curatedCatalog];
    const snapshot = emptyDailySnapshot(NOW);
    const absent = await readDailyCatalog({ enabled: true, read: async () => JSON.stringify(snapshot), now: NOW });
    expect(mergeDailyItems(saved, absent)).toEqual(saved);
    snapshot.sources[0].checkedAt = snapshot.sources[0].fetchedAt = new Date(NOW).toISOString();
    snapshot.sources[0].attempts = [new Date(NOW).toISOString()];
    const empty = await readDailyCatalog({ enabled: true, read: async () => JSON.stringify(snapshot), now: NOW });
    expect(mergeDailyItems(saved, empty)).toEqual(curatedCatalog);
  });
  it("applies 36-hour transport freshness, known event ends and cancellation precedence", async () => {
    const snapshot = await successful(), item = dailySnapshotItems(snapshot)[0];
    expect(assessItem(item, discoverSources, NOW)).toMatchObject({ state: "upcoming", placement: "main" });
    expect(assessItem(item, discoverSources, Date.parse("2026-11-21T03:00:00Z"))).toMatchObject({ state: "expired", placement: "archive" });
    const canceled = { ...item, status: "canceled" as const };
    expect(assessItem(canceled, discoverSources, NOW).placement).toBe("archive");
    const reservation = reserveDaily(emptyDailySnapshot(NOW), NOW);
    const news = await completeDaily({ ...reservation, ids: ["illuminator-daily"], now: () => NOW, fetcher: async () => reply(rss(), "application/rss+xml") });
    const story = dailySnapshotItems(news)[0];
    const malformed = structuredClone(news);
    (malformed.sources[1].items[0] as unknown as { topics: unknown }).topics = [["science"]];
    expect(() => decodeDailySnapshot(JSON.stringify(malformed), NOW)).toThrow();
    expect(assessItem(story, discoverSources, NOW + DAILY_FRESHNESS_MS - 1).placement).toBe("main");
    expect(assessItem(story, discoverSources, NOW + DAILY_FRESHNESS_MS)).toMatchObject({ state: "stale", placement: "review-only" });
  });
  it("keeps editorial withdrawal authoritative and never copies a curated summary into a feed", async () => {
    const reservation = reserveDaily(emptyDailySnapshot(NOW), NOW);
    const snapshot = await completeDaily({ ...reservation, ids: ["illuminator-daily"], now: () => NOW, fetcher: async () => reply(rss(), "application/rss+xml") });
    const feed = dailySnapshotItems(snapshot)[0];
    const editorial = { ...curatedCatalog.find(item => item.kind === "news")!, status: "withdrawn" as const, evidence: { sourceId: "illuminator", url: feed.evidence.url, level: "publisher-reported" as const, verifiedAt: new Date(NOW).toISOString(), fetchedAt: null, sourceUpdatedAt: null } };
    expect(catalogEntries([editorial, feed], discoverSources, NOW)).toHaveLength(1);
    expect(catalogEntries([editorial, feed], discoverSources, NOW)[0].assessment.state).toBe("withdrawn");
    expect(feed.kind === "news" && feed.summary.kind).toBe("unavailable");
  });
  it("is inert when disabled, and malformed storage falls back without guessing fresh data", async () => {
    const read = vi.fn(async () => "invalid");
    expect(await readDailyCatalog({ enabled: false, read, now: NOW })).toMatchObject({ items: [], updates: { enabled: false } });
    expect(read).not.toHaveBeenCalled();
    expect(await readDailyCatalog({ enabled: true, read, now: NOW })).toMatchObject({ items: [], updates: { enabled: true, available: false } });
    let clock = NOW;
    const updatedDuringRead = await readDailyCatalog({ enabled: true, read: async () => {
      clock += 1_000; return JSON.stringify(emptyDailySnapshot(clock));
    }, now: () => clock });
    expect(updatedDuringRead.updates.available).toBe(true);
  });
  it("shows transport timestamps and failure state without calling an event organizer-confirmed", async () => {
    const snapshot = await successful();
    const result = await readDailyCatalog({ enabled: true, read: async () => JSON.stringify(snapshot), now: NOW });
    const html = renderToStaticMarkup(createElement(DiscoverScreen, { ...result, sources: discoverSources, now: NOW }));
    expect(html).toContain("Subscribed feed · not editorially checked");
    expect(html).toContain("Daily feed updates");
    expect(html).toContain("Feed checked:");
    expect(html).toContain("Price unknown");
    expect(html).not.toContain("Organizer source checked");
    expect(Object.keys(dailySources)).toHaveLength(3);
  });
});
