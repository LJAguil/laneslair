import { assessItem, catalogErrors, canonicalUrl, groupDuplicates, type Assessment } from "./catalog";
import type { DiscoverItem, DiscoverSource, EventWindow, NewsItem } from "./types";

export interface CatalogEntry { item: DiscoverItem; assessment: Assessment }

function resolveTier(group: DiscoverItem[], sources: readonly DiscoverSource[], now: number): CatalogEntry {
  const checkedAt = (item: DiscoverItem) => item.evidence.level === "publisher-feed" ? Date.parse(item.evidence.representationCheckedAt) : item.evidence.verifiedAt ? Date.parse(item.evidence.verifiedAt) : -Infinity;
  const sorted = [...group].sort((a, b) => checkedAt(b) - checkedAt(a));
  const item = sorted[0];
  const signatures = new Set(group.map(candidate => JSON.stringify({ ...candidate, id: undefined, evidence: undefined, articleUrl: candidate.kind === "news" ? canonicalUrl(candidate.evidence.url) : undefined })));
  const assessment: Assessment = signatures.size > 1
    ? { state: "needs-confirmation", placement: "review-only", errors: ["Conflicting duplicate listings need review."] }
    : assessItem(item, sources, now);
  return { item, assessment };
}

/** Choose one representation per article/story without mixing its evidence/summary. */
export function catalogEntries(items: readonly DiscoverItem[], sources: readonly DiscoverSource[], now: number): CatalogEntry[] {
  const valid = items.filter(item => catalogErrors(item, sources, now).length === 0);
  return groupDuplicates(valid).map(group => {
    const curated = group.filter(item => item.evidence.level !== "publisher-feed");
    const feeds = group.filter(item => item.evidence.level === "publisher-feed");
    if (!curated.length) return resolveTier(feeds, sources, now);
    const editorial = resolveTier(curated, sources, now);
    // A feed cannot revive an editorial withdrawal/cancellation or bypass a conflict.
    if (!feeds.length || curated.some(item => item.status !== "scheduled") || editorial.assessment.errors.length) return editorial;
    const feed = resolveTier(feeds, sources, now);
    if (editorial.assessment.placement === "main") {
      const conflictingHeadline = feeds.some(item => assessItem(item, sources, now).placement === "main" && canonicalUrl(item.evidence.url) === canonicalUrl(editorial.item.evidence.url) && item.title.trim() !== editorial.item.title.trim());
      if (conflictingHeadline) return { item: editorial.item, assessment: { state: "needs-confirmation", placement: "review-only", errors: ["Curated and feed headlines disagree; review the publisher's article."] } };
      return editorial;
    }
    // A fresh feed copy replaces stale/unverified curation without inheriting its summary.
    return feed.assessment.placement === "main" ? feed : editorial;
  });
}

/** Visit bookmarks follow the article across curated/feed representation changes. */
export function bookmarkKey(item: DiscoverItem): string {
  return item.kind === "news" ? `article:${canonicalUrl(item.evidence.url) ?? item.id}` : `${item.kind}:${item.id}`;
}

export function displayDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00Z`));
}

export function displayInstant(value: string, timeZone = "America/Chicago"): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(value));
}

export function displayWindow(window: EventWindow): string {
  if (window.kind === "dates") {
    const last = new Date(`${window.endDateExclusive}T12:00:00Z`);
    last.setUTCDate(last.getUTCDate() - 1);
    const end = last.toISOString().slice(0, 10);
    const range = end === window.startDate ? displayDate(end) : `${displayDate(window.startDate)} – ${displayDate(end)}`;
    return `${range} · ${window.timeZone}`;
  }
  const start = displayInstant(window.startsAt, window.timeZone);
  if (window.kind === "start-only") return `${start} · end time unknown`;
  return `${start} → ${displayInstant(window.endsAt, window.timeZone)}`;
}

export function publicationLabel(item: NewsItem): string {
  if (item.publishedAt) return displayInstant(item.publishedAt);
  return item.publishedOn ? `${displayDate(item.publishedOn)} · publication time unavailable` : "Publication time unavailable";
}

export const newsFormatLabels: Record<NewsItem["format"], string> = {
  reporting: "Reporting", opinion: "Opinion", analysis: "Analysis", "institutional-update": "Institutional update", unclassified: "Unclassified",
};

export function safeLink(value: string | null): string | null {
  return value === null ? null : canonicalUrl(value);
}
