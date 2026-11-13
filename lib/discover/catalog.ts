import type { DiscoverItem, DiscoverSource, EventWindow, Instant } from "./types";
import { FEED_FRESHNESS_MS, FEED_PUBLICATION_AGE_MS, NASA_FEED_URL, NASA_LIMITS, nasaArticleUrl } from "./feeds/policy";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function validDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

/** Reject implicit machine-local time and calendar normalization such as Feb 30. */
function instant(value: Instant): number {
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(value)
    || !validDay(value.slice(0, 10))) return NaN;
  return Date.parse(value);
}

function zonedDay(now: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function validZone(zone: string): boolean {
  try { zonedDay(0, zone); return Boolean(zone); } catch { return false; }
}

function validWindow(window: EventWindow): boolean {
  if (!validZone(window.timeZone)) return false;
  if (window.kind === "start-only") return Number.isFinite(instant(window.startsAt));
  return window.kind === "timed"
    ? Number.isFinite(instant(window.startsAt)) && Number.isFinite(instant(window.endsAt)) && instant(window.endsAt) > instant(window.startsAt)
    : validDay(window.startDate) && validDay(window.endDateExclusive) && window.endDateExclusive > window.startDate;
}

export function canonicalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || /^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.href;
  } catch { return null; }
}

/** Validates typed records. This is NOT an untrusted JSON/feed parser. */
export function catalogErrors(item: DiscoverItem, sources: readonly DiscoverSource[], now: number): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(now) || !Number.isFinite(new Date(now).getTime())) errors.push("Invalid evaluation clock");
  if (!item.id.trim() || !item.title.trim()) errors.push("ID and title required");
  if (!sources.some(source => source.id === item.evidence.sourceId)) errors.push("Unknown source");
  if (!canonicalUrl(item.evidence.url)) errors.push("HTTPS source link required");
  const checkedTime = (value: string | null, name: string) => {
    if (value !== null && (!Number.isFinite(instant(value)) || instant(value) > now)) errors.push(`Invalid or future ${name}`);
  };
  checkedTime(item.evidence.verifiedAt, "verification time");
  checkedTime(item.evidence.fetchedAt, "fetch time");
  checkedTime(item.evidence.sourceUpdatedAt, "source update time");
  if (item.evidence.level === "publisher-feed") {
    const evidence = item.evidence;
    checkedTime(evidence.representationCheckedAt, "feed check time");
    if (item.kind !== "news" || evidence.sourceId !== "nasa" || evidence.feedUrl !== NASA_FEED_URL || !sources.some(source => source.id === evidence.sourceId && source.authority === "publisher")) errors.push("Unsupported publisher feed");
    if (evidence.verifiedAt !== null || evidence.sourceUpdatedAt !== null) errors.push("Feed transport cannot claim editorial verification");
    if (!evidence.fetchedAt || !evidence.representationCheckedAt || instant(evidence.representationCheckedAt) < instant(evidence.fetchedAt)) errors.push("Invalid feed timestamp order");
    if (!nasaArticleUrl(evidence.url) || item.title.length > NASA_LIMITS.title) errors.push("Invalid feed metadata");
    if (!Array.isArray(evidence.sourceItemIds) || !evidence.sourceItemIds.length || evidence.sourceItemIds.length > NASA_LIMITS.items || evidence.sourceItemIds.some(id => typeof id !== "string" || !id.trim() || id.length > NASA_LIMITS.guid) || new Set(evidence.sourceItemIds).size !== evidence.sourceItemIds.length || !evidence.sourceItemIds.includes(evidence.sourceItemId)) errors.push("Invalid feed source identities");
    if (item.kind === "news") {
      if (!item.publishedAt || instant(item.publishedAt) > instant(evidence.fetchedAt)) errors.push("Feed publication time must precede retrieval");
      if (item.summary.kind !== "unavailable" || item.access !== "unknown" || item.format !== "institutional-update" || item.publishedOn !== undefined || (item.author !== null && item.author.length > NASA_LIMITS.author)) errors.push("Unsupported feed content claims");
    }
  } else if (item.evidence.level !== "unverified" && item.evidence.verifiedAt === null) errors.push("Evidence requires editorial verification time");
  if (item.kind !== "news" && item.window !== null && !validWindow(item.window)) errors.push("Invalid occurrence or validity window");
  if (item.kind === "event") {
    if (!item.city.trim() || !item.venue.trim()) errors.push("Venue and city required");
    if (item.price.kind === "known" && (!Number.isFinite(item.price.amount) || item.price.amount < 0)) errors.push("Invalid price");
    if (item.registrationUrl !== null && !canonicalUrl(item.registrationUrl)) errors.push("Invalid registration link");
  }
  if (item.kind === "news") {
    checkedTime(item.publishedAt, "publication time");
    if (item.publishedOn !== undefined && !validDay(item.publishedOn)) errors.push("Invalid publication date");
    if (item.summary.kind === "original") {
      if (!item.summary.text.trim()) errors.push("Original summary cannot be empty");
      checkedTime(item.summary.writtenAt, "summary time");
    } else if (!item.summary.reason.trim()) errors.push("Summary unavailability needs explanation");
  }
  if (item.kind === "deal") {
    if (!item.restaurant.trim()) errors.push("Restaurant required");
    checkedTime(item.requirements.reviewedAt, "requirements review time");
    if (!item.requirements.purchase.trim() || !item.requirements.channels.length) errors.push("Purchase and redemption channel required");
    if (item.participation.kind === "confirmed-nearby") {
      checkedTime(item.participation.checkedAt, "participation time");
      if (!item.participation.locations.length || item.participation.locations.some(location => !location.trim())) errors.push("Confirmed participation requires named locations");
    }
  }
  return errors;
}

export type Lifecycle = "invalid" | "canceled" | "postponed" | "withdrawn" | "expired" | "needs-confirmation" | "stale" | "upcoming" | "active" | "current";
export interface Assessment {
  state: Lifecycle;
  placement: "main" | "national-check-local" | "review-only" | "archive";
  errors: string[];
}

/** Pure clock-injected policy. Reevaluate on load, foreground, and time boundaries. */
export function assessItem(item: DiscoverItem, sources: readonly DiscoverSource[], now: number): Assessment {
  const result = (state: Lifecycle, placement: Assessment["placement"], errors: string[] = []): Assessment => ({ state, placement, errors });
  const errors = catalogErrors(item, sources, now);
  if (errors.length) return result("invalid", "review-only", errors);
  if (item.status !== "scheduled") return result(item.status, "archive");
  if (item.kind === "news" && item.evidence.level === "publisher-feed") {
    if (now - instant(item.publishedAt!) >= FEED_PUBLICATION_AGE_MS) return result("expired", "archive");
    if (now - instant(item.evidence.representationCheckedAt) >= FEED_FRESHNESS_MS) return result("stale", "review-only");
    return result("current", "main");
  }
  const window = item.kind === "news" ? null : item.window;
  const day = window ? zonedDay(now, window.timeZone) : "";
  if (window && (window.kind === "dates" ? day >= window.endDateExclusive
    : now >= instant(window.kind === "start-only" ? window.startsAt : window.endsAt))) return result("expired", "archive");
  if (item.kind === "deal" && (!window || item.requirements.reviewedAt === null)) return result("needs-confirmation", "review-only");
  if (item.evidence.level === "unverified" || item.evidence.verifiedAt === null) return result("needs-confirmation", "review-only");
  if (item.evidence.sourceUpdatedAt !== null && instant(item.evidence.sourceUpdatedAt) > instant(item.evidence.verifiedAt)) return result("needs-confirmation", "review-only");
  const checks = [instant(item.evidence.verifiedAt)];
  let maxAge = DAY;
  if (item.kind === "event") {
    // All-day dates use a conservative local-calendar rule, never a fake UTC midnight.
    const soon = item.window.kind !== "dates"
      ? instant(item.window.startsAt) - now <= 48 * HOUR
      : Date.parse(`${item.window.startDate}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`) <= 2 * DAY;
    maxAge = soon ? DAY : 7 * DAY;
  }
  if (item.kind === "deal") {
    checks.push(instant(item.requirements.reviewedAt!));
    if (item.participation.kind === "confirmed-nearby") checks.push(instant(item.participation.checkedAt));
  }
  // Fetch timestamps deliberately cannot make editorially checked content fresh.
  if (now - Math.min(...checks) >= maxAge) return result("stale", "review-only");
  if (item.kind === "news") return result("current", "main");
  const upcoming = window!.kind === "dates" ? day < window!.startDate : now < instant(window!.startsAt);
  return result(upcoming ? "upcoming" : "active", item.kind === "deal" && item.participation.kind === "national-local-unknown" ? "national-check-local" : "main");
}

/** Conservative duplicate keys; grouping preserves every record for conflict review.
 * Events include their start so repeated dates never collapse into one occurrence.
 * Deals sharing a generic terms page are not automatically the same offer.
 */
export function duplicateKey(item: DiscoverItem): string {
  const identity = item.duplicateGroup ? ["editorial", item.duplicateGroup]
    : item.kind === "news" ? ["article", canonicalUrl(item.evidence.url) ?? item.id]
    : ["source", item.evidence.sourceId, item.evidence.sourceItemId ?? item.id];
  const window = item.kind === "news" ? null : item.window;
  const occurrence = !window ? null : window.kind === "dates"
    ? [window.startDate, window.endDateExclusive, window.timeZone]
    : item.kind === "deal" && window.kind === "timed"
      ? [instant(window.startsAt), instant(window.endsAt)]
      : [instant(window.startsAt)];
  return JSON.stringify([item.kind, identity, occurrence]);
}

export function groupDuplicates(items: readonly DiscoverItem[]): DiscoverItem[][] {
  const groups = new Map<string, DiscoverItem[]>();
  for (const item of items) {
    if (item.kind === "news") {
      const articleUrl = canonicalUrl(item.evidence.url);
      const matches = [...groups.entries()].filter(([, group]) => group.some(other => other.kind === "news" && ((articleUrl !== null && articleUrl === canonicalUrl(other.evidence.url)) || (item.duplicateGroup && item.duplicateGroup === other.duplicateGroup) || (item.evidence.level === "publisher-feed" && other.evidence.level === "publisher-feed" && item.evidence.sourceId === other.evidence.sourceId && item.evidence.sourceItemIds.some(id => other.evidence.level === "publisher-feed" && other.evidence.sourceItemIds.includes(id))))));
      if (matches.length) {
        const target = matches[0][1];
        target.push(item);
        for (const [key, group] of matches.slice(1)) { target.push(...group); groups.delete(key); }
        continue;
      }
    }
    const key = duplicateKey(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}
