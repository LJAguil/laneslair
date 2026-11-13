/** Entirely invented metadata and bodies; no real publisher articles retained. */
export const FEED_NOW = Date.parse("2026-11-12T18:00:00Z");
const escape = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
export function fixtureItem({ title = "Invented rocket & research", url = "https://www.nasa.gov/invented-story/", guid = "opaque-invented-id", published = "Thu, 12 Nov 2026 05:05:00 +0000", author = "Invented Author" as string | null }: {
  title?: string; url?: string; guid?: string; published?: string; author?: string | null;
} = {}) {
  return `<item><title>${escape(title)}</title><link>${escape(url)}</link><guid isPermaLink="false">${escape(guid)}</guid><pubDate>${escape(published)}</pubDate>${author === null ? "" : `<dc:creator>${escape(author)}</dc:creator>`}<description><![CDATA[Invented body <img src="https://example.invalid/tracker"/>]]></description><content:encoded><![CDATA[Invented full article. Must be discarded.]]></content:encoded></item>`;
}
export function fixtureFeed(items = fixtureItem()) {
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Invented test feed</title>${items}</channel></rss>`;
}
