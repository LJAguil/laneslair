import { describe, expect, it } from "vitest";
import { communityInstant, parseGlobalVoices, parseWestMonroe } from "./parsers";

const now = Date.parse("2026-11-26T12:00:00Z");
const item = (extra = "", url = "https://globalvoices.org/2026/11/25/invented/") => `<item><title>Invented headline</title><link>${url}</link><dc:creator>Invented Author</dc:creator><pubDate>Wed, 25 Nov 2026 10:00:00 GMT</pubDate>${extra}<description>Do not import this body</description></item>`;
const rss = (items = item()) => `<rss xmlns:dc="http://purl.org/dc/elements/1.1/"><channel>${items}</channel></rss>`;
const event = (extra = "", changes: Record<string, string> = {}) => Object.entries({ UID: "invented-1", SUMMARY: "Invented community outing", "DTSTART;TZID=America/Chicago": "20261128T180000", "DTEND;TZID=America/Chicago": "20261128T200000", LOCATION: "Convention Center - 901 Ridge Avenue West Monroe LA 71291", DESCRIPTION: "/calendar.aspx?EID=123", ...changes }).map(([key, value]) => `${key}:${value}\r\n`).join("") + extra;
const calendar = (body = event()) => `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\n${body}END:VEVENT\r\nEND:VCALENDAR\r\n`;

describe("offline world metadata adapter", () => {
  it("keeps exact metadata and explicit technology/opinion categories while dropping bodies", () => {
    const [row] = parseGlobalVoices(rss(item("<category>Technology</category><category>Opinion</category>")), now);
    expect(row).toMatchObject({ author: "Invented Author", topics: ["world", "technology", "discovery"], format: "opinion" });
    expect(JSON.stringify(row)).not.toContain("Do not import");
    expect(parseGlobalVoices(rss(item()), now)[0].format).toBe("unclassified");
  });
  it("rejects unsafe XML, invalid structure, missing authors, future dates and unsafe links", () => {
    for (const body of ["<!DOCTYPE rss>" + rss(), "<rss><channel></rss>", rss().replace("<dc:creator>Invented Author</dc:creator>", ""), rss().replace("25 Nov 2026", "25 Nov 2027"), rss(item("", "https://evil.example/2026/11/25/invented/"))]) {
      expect(() => parseGlobalVoices(body, now)).toThrow();
    }
    expect(() => parseGlobalVoices("x".repeat(2 * 1024 * 1024 + 1), now)).toThrow();
  });
  it("deduplicates exact article identities, rejects conflicting titles and expires old news", () => {
    expect(parseGlobalVoices(rss(item() + item()), now)).toHaveLength(1);
    expect(() => parseGlobalVoices(rss(item() + item().replace("Invented headline", "Conflicting title")), now)).toThrow("conflicting-article");
    expect(parseGlobalVoices(rss(), now + 8 * 86_400_000)).toEqual([]);
  });
});
describe("offline community calendar adapter", () => {
  it("converts both Chicago seasons and rejects nonexistent, ambiguous and floating times", () => {
    expect(communityInstant("20261128T180000", "TZID=America/Chicago")).toBe("2026-11-29T00:00:00.000Z");
    expect(communityInstant("20260701T180000", "TZID=America/Chicago")).toBe("2026-07-01T23:00:00.000Z");
    for (const value of ["20260308T023000", "20261101T013000", "20260230T180000"]) expect(communityInstant(value, "TZID=America/Chicago")).toBeNull();
    expect(communityInstant("20261128T180000")).toBeNull();
    expect(communityInstant("20261128T180000Z")).toBe("2026-11-28T18:00:00.000Z");
  });
  it("extracts individual official links, unfolded fields and cancellations without copying descriptions", () => {
    const result = parseWestMonroe(calendar(event("STATUS:CANCELLED\r\n", { DESCRIPTION: "Public details \r\n /calendar.aspx?EID=123" })), now);
    expect(result.items[0]).toMatchObject({ city: "West Monroe", status: "canceled", url: "https://www.cityofwestmonroe.com/calendar.aspx?EID=123" });
    expect(JSON.stringify(result.items)).not.toContain("Public details");
  });
  it("quarantines ambiguous dates, out-of-state venues, closures, recurrence and unsafe links", () => {
    const bodies = [
      event("RRULE:FREQ=WEEKLY\r\n"), event("", { LOCATION: "Convention Center - West Monroe KS 71291" }),
      event("", { SUMMARY: "City Hall offices closed for holiday" }), event("", { DESCRIPTION: "https://evil.example/calendar.aspx?EID=123" }),
      event("", { "DTEND;TZID=America/Chicago": "20261128T170000" }),
      event().replaceAll(";TZID=America/Chicago:20261128T180000", ";VALUE=DATE:20261128").replaceAll(";TZID=America/Chicago:20261128T200000", ";VALUE=DATE:20261128"),
      event("", { "DTEND;TZID=America/Chicago": "20261130T200000" }),
    ];
    for (const body of bodies) expect(parseWestMonroe(calendar(body), now)).toEqual({ items: [], needsReview: 1 });
  });
  it("deduplicates UIDs and detects rescheduling conflicts, malformed and oversized calendars", () => {
    const doubled = calendar().replace("END:VCALENDAR", `BEGIN:VEVENT\r\n${event()}END:VEVENT\r\nEND:VCALENDAR`);
    expect(parseWestMonroe(doubled, now).items).toHaveLength(1);
    expect(() => parseWestMonroe(doubled.replace("SUMMARY:Invented community outing", "SUMMARY:Changed title"), now)).toThrow("conflicting-event");
    expect(() => parseWestMonroe(calendar().replace("END:VEVENT", ""), now)).toThrow();
    expect(() => parseWestMonroe("x".repeat(2 * 1024 * 1024 + 1), now)).toThrow();
    expect(parseWestMonroe(calendar(), now + 65 * 86_400_000).items).toEqual([]);
  });
});
