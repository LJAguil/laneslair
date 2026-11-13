import { describe, expect, it } from "vitest";
import { FEED_NOW, fixtureFeed, fixtureItem } from "./nasa.fixtures";
import { NASA_LIMITS, nasaPublicationDate, parseNasaFeed, suppressCuratedNasaCoverage } from "./nasa";

describe("offline NASA RSS parser, synthetic XML only", () => {
  it("preserves publisher metadata as text and discards bodies, media and verification claims", () => {
    const parsed = parseNasaFeed(fixtureFeed(), FEED_NOW);
    expect(parsed).toMatchObject({ inputCount: 1, duplicateCount: 0, omittedCount: 0, rejected: [] });
    expect(parsed.candidates[0]).toEqual({ sourceId: "nasa", sourceItemIds: ["opaque-invented-id"], title: "Invented rocket & research", url: "https://www.nasa.gov/invented-story/", publishedAt: "2026-11-12T05:05:00.000Z", author: "Invented Author", format: "institutional-update", access: "unknown", summary: { kind: "unavailable", reason: "Feed metadata only; open the publisher's article." } });
    expect(JSON.stringify(parsed)).not.toContain("Invented full article");
    expect(JSON.stringify(parsed)).not.toContain("tracker");
    expect(parsed.candidates[0]).not.toHaveProperty("verifiedAt");
  });

  it("handles namespace aliases, CDATA, numeric entities and absent bylines without HTML interpretation", () => {
    const xml = fixtureFeed(fixtureItem({ author: null })).replace("Invented rocket &amp; research", "<![CDATA[<b>Invented</b>]]> &#x1F680; &amp; research");
    const parsed = parseNasaFeed(xml, FEED_NOW);
    expect(parsed.candidates[0]).toMatchObject({ title: "<b>Invented</b> 🚀 & research", author: null });
    const aliased = fixtureFeed().replaceAll("dc:", "writer:").replace("xmlns:dc", "xmlns:writer");
    expect(parseNasaFeed(aliased, FEED_NOW).candidates[0].author).toBe("Invented Author");
  });

  it.each(["title", "link", "guid", "pubDate"])("withholds an item missing %s", name => {
    const item = fixtureItem().replace(new RegExp(`<${name}(?: [^>]*)?>[^<]*</${name}>`), "");
    const result = parseNasaFeed(fixtureFeed(item), FEED_NOW);
    expect(result.candidates).toEqual([]);
    expect(result.rejected).toEqual([{ index: 0, reason: "missing-field" }]);
  });

  it("rejects repeated metadata fields, nested markup and namespace-spoofed titles", () => {
    for (const item of [fixtureItem().replace("</title>", "</title><title>Conflicting title</title>"), fixtureItem().replace("Invented rocket &amp; research", "<b>Injected</b>"), fixtureItem().replace("<title>", '<x:title xmlns:x="urn:wrong">').replace("</title>", "</x:title>")]) {
      expect(parseNasaFeed(fixtureFeed(item), FEED_NOW).candidates).toEqual([]);
    }
  });

  it.each([
    "http://www.nasa.gov/story", "https://www.nasa.gov.evil.invalid/story", "https://nasa.gov/story", "https://user:pass@www.nasa.gov/story", "https://www.nasa.gov:8443/story", "https://127.0.0.1/story", "javascript:alert(1)", "/relative-story", "https://www.nasa.gov/sto\try", "https://www.nasa.gov\\@evil.invalid/",
  ])("rejects hostile or unsupported article URL %s", url => {
    expect(parseNasaFeed(fixtureFeed(fixtureItem({ url })), FEED_NOW).rejected[0]?.reason).toBe("invalid-url");
  });

  it("keeps article-defining parameters but drops known trackers and fragments", () => {
    const result = parseNasaFeed(fixtureFeed(fixtureItem({ url: "https://science.nasa.gov/story?id=2&utm_source=feed#top" })), FEED_NOW);
    expect(result.candidates[0].url).toBe("https://science.nasa.gov/story?id=2");
  });

  it.each([
    "Thu, 12 Nov 2026 05:05:00", "31 Feb 2026 05:05:00 +0000", "Fri, 12 Nov 2026 05:05:00 GMT", "12 Nov 2026 25:00:00 GMT", "12 Nov 2026 05:05:00 EST", "12 Nov 2026 05:05:00 +1460", "12 Nov 2026 05:05:00 +1401", "2026-11-12", "not a date",
  ])("does not invent a timestamp from invalid/ambiguous date %s", published => {
    expect(parseNasaFeed(fixtureFeed(fixtureItem({ published })), FEED_NOW).rejected[0]?.reason).toBe("invalid-date");
  });

  it("normalizes explicit offsets and withholds future dates", () => {
    expect(nasaPublicationDate("12 Nov 2026 01:05:00 -0400")).toBe("2026-11-12T05:05:00.000Z");
    expect(parseNasaFeed(fixtureFeed(fixtureItem({ published: "Fri, 13 Nov 2026 05:05:00 GMT" })), FEED_NOW).rejected[0].reason).toBe("future-date");
  });

  it.each(["<!DOCTYPE rss SYSTEM 'https://example.invalid/dtd'>", "<!DOCTYPE rss [<!ENTITY x 'expanded'>]>", "<!ENTITY x SYSTEM 'file:///invented'>"])("rejects declarations without entity resolution", declaration => {
    expect(() => parseNasaFeed(fixtureFeed().replace("<rss", `${declaration}<rss`), FEED_NOW)).toThrow("unsafe-xml");
  });

  it.each(["<rss><channel></rss>", "<rss version='2.0'><channel><item>&unknown;</item></channel></rss>", "<rss version='2.0'><channel/></rss><extra/>", "<rss version='2.0' version='1.0'><channel/></rss>"])("rejects malformed XML rather than recovering it", xml => {
    expect(() => parseNasaFeed(xml, FEED_NOW)).toThrow("malformed-xml");
  });

  it.each(["<feed xmlns='http://www.w3.org/2005/Atom'/>", "<rss version='1.0'><channel/></rss>", "<rss version='2.0'><channel/><channel/></rss>", "<rss xmlns='urn:spoof' version='2.0'><channel/></rss>"])("rejects unsupported feeds", xml => {
    expect(() => parseNasaFeed(xml, FEED_NOW)).toThrow("unsupported-feed");
  });

  it("enforces byte, item, structural and field limits without truncating headlines", () => {
    expect(() => parseNasaFeed(" ".repeat(NASA_LIMITS.bytes + 1), FEED_NOW)).toThrow("too-large");
    expect(() => parseNasaFeed(fixtureFeed(fixtureItem().repeat(51)), FEED_NOW)).toThrow("too-many-items");
    expect(() => parseNasaFeed(fixtureFeed("<nest>".repeat(35) + "</nest>".repeat(35)), FEED_NOW)).toThrow("complex-xml");
    expect(() => parseNasaFeed(fixtureFeed("<empty/>".repeat(NASA_LIMITS.nodes)), FEED_NOW)).toThrow("complex-xml");
    expect(parseNasaFeed(fixtureFeed(fixtureItem({ title: "x".repeat(301) })), FEED_NOW).rejected[0].reason).toBe("invalid-field");
  });

  it("deduplicates exact copies and changed GUIDs on the same article", () => {
    const result = parseNasaFeed(fixtureFeed(fixtureItem() + fixtureItem({ guid: "second-id", url: "https://www.nasa.gov/invented-story/?utm_source=test" })), FEED_NOW);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].sourceItemIds).toEqual(["opaque-invented-id", "second-id"]);
    expect(result.duplicateCount).toBe(1);
  });

  it("withholds all conflicting identities, including transitive and incomplete siblings", () => {
    const first = fixtureItem({ guid: "a", url: "https://www.nasa.gov/one" });
    const second = fixtureItem({ guid: "b", url: "https://www.nasa.gov/two" });
    const bridge = fixtureItem({ guid: "a", url: "https://www.nasa.gov/two" });
    const result = parseNasaFeed(fixtureFeed(first + second + bridge), FEED_NOW);
    expect(result.candidates).toEqual([]);
    expect(result.rejected).toHaveLength(3);
    const incomplete = fixtureItem().replace(/<title>.*?<\/title>/, "");
    expect(parseNasaFeed(fixtureFeed(fixtureItem() + incomplete), FEED_NOW).candidates).toEqual([]);
  });

  it("caps output after validation/deduplication and reports omitted candidates", () => {
    const items = Array.from({ length: 12 }, (_, index) => fixtureItem({ guid: `id-${index}`, url: `https://www.nasa.gov/story-${index}` })).join("");
    expect(parseNasaFeed(fixtureFeed(items), FEED_NOW)).toMatchObject({ inputCount: 12, omittedCount: 2 });
    expect(parseNasaFeed(fixtureFeed(items), FEED_NOW).candidates).toHaveLength(10);
    expect(() => parseNasaFeed(fixtureFeed(), NaN)).toThrow("invalid-clock");
  });

  it("prefers eligible curated coverage without inheriting or renewing editorial content", () => {
    const result = parseNasaFeed(fixtureFeed(), FEED_NOW);
    const before = JSON.stringify(result);
    expect(suppressCuratedNasaCoverage(result.candidates, ["https://www.nasa.gov/invented-story/?utm_source=curated"]).suppressedCount).toBe(1);
    expect(suppressCuratedNasaCoverage(result.candidates, []).candidates).toEqual(result.candidates);
    expect(JSON.stringify(result)).toBe(before);
    expect(result.candidates[0].summary.kind).toBe("unavailable");
  });
});
