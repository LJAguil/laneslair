/** Public metadata policy shared with the UI; no XML parser or network imports. */
export const NASA_FEED_URL = "https://www.nasa.gov/news-release/feed/";
export const NASA_LIMITS = Object.freeze({ bytes: 1_048_576, items: 50, output: 10, nodes: 20_000, depth: 32, title: 300, author: 200, guid: 512, url: 2048, deadlineMs: 15_000 });
export const FEED_FRESHNESS_MS = 24 * 3_600_000;
export const FEED_PUBLICATION_AGE_MS = 7 * 24 * 3_600_000;

/** Only absolute approved article URLs; never used as fetch targets. */
export function nasaArticleUrl(value: string): string | null {
  if (value.length > NASA_LIMITS.url || /[\u0000-\u0020\u007f\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !["www.nasa.gov", "science.nasa.gov"].includes(url.hostname) || url.port || url.username || url.password) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/^utm_/i.test(key) || /^(gclid|fbclid)$/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    return url.href;
  } catch { return null; }
}
