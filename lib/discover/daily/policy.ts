/** Fixed subscriptions only; no user-supplied fetch targets. */
export const dailySources = {
  "nasa-daily": { name: "NASA", kind: "news", url: "https://www.nasa.gov/news-release/feed/" },
  "illuminator-daily": { name: "Louisiana Illuminator", kind: "news", url: "https://lailluminator.com/feed/" },
  "ruston-athletics": { name: "Ruston High athletics", kind: "event", url: "https://mmboltapi.azurewebsites.net/api/v2/events/calendar/2490194/0/calendar.ics" },
} as const;
export type DailySourceId = keyof typeof dailySources;
export const dailySourceIds = Object.keys(dailySources) as DailySourceId[];
export const DAILY_FRESHNESS_MS = 36 * 3_600_000; // Daily scheduling may be delayed; transport evidence only.
export const DAILY_NEWS_AGE_MS = 7 * 86_400_000;
export const DAILY_BODY_BYTES = 2 * 1024 * 1024;
export const DAILY_SNAPSHOT_BYTES = 200_000;
export const DAILY_ITEMS_PER_SOURCE = 30;
export const DAILY_DATA_URL = "https://raw.githubusercontent.com/LJAguil/laneslair/discover-data/catalog.json";
export const ATHLETICS_DETAILS = "https://www.rustonhighathletics.com/calendar";

export function dailyArticleUrl(sourceId: DailySourceId, value: string): string | null {
  try {
    const url = new URL(value);
    if (value.length > 2048 || url.protocol !== "https:" || url.username || url.password || url.port || /[\s\\\u0000-\u001f]/.test(value)) return null;
    if (sourceId === "ruston-athletics") return value === ATHLETICS_DETAILS ? value : null;
    if (sourceId === "illuminator-daily" ? url.hostname !== "lailluminator.com" : !["www.nasa.gov", "science.nasa.gov"].includes(url.hostname)) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}
