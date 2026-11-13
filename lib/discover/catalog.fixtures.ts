/** Invented records for contract tests only. Never load these into the app catalog. */
import type { DealItem, DiscoverSource, EventItem, NewsItem } from "./types";

export const fixtureSources: DiscoverSource[] = [{
  id: "synthetic", name: "Invented test source", url: "https://example.invalid/", authority: "organizer",
  ingestion: "curation", access: "public-page", automation: "not-approved", assessedOn: "2026-11-12", limitations: "Synthetic only",
}];
export const NOW = Date.parse("2026-11-12T18:00:00Z");
const evidence = () => ({ sourceId: "synthetic", url: "https://example.invalid/item", level: "official-listing" as const,
  verifiedAt: "2026-11-12T17:00:00Z", fetchedAt: null, sourceUpdatedAt: null });

export function eventFixture(): EventItem {
  return {
    id: "invented-event", kind: "event", title: "Invented trivia fixture", evidence: evidence(), status: "scheduled",
    category: "trivia", description: "Invented contract example, not a real outing.",
    window: { kind: "timed", startsAt: "2026-11-12T19:00:00-06:00", endsAt: "2026-11-12T21:00:00-06:00", timeZone: "America/Chicago" },
    venue: "Invented venue", city: "Ruston", travel: "nearby", price: { kind: "unknown" }, admission: "unknown", registrationUrl: null,
  };
}

export function newsFixture(): NewsItem {
  return {
    id: "invented-news", kind: "news", title: "Invented headline for contract testing", evidence: evidence(), status: "scheduled",
    topics: ["science"], publishedAt: "2026-11-12T16:00:00Z", author: null,
    summary: { kind: "unavailable", reason: "Synthetic fixture has no article." }, format: "unclassified", access: "unknown",
  };
}

export function dealFixture(): DealItem {
  return {
    id: "invented-deal", kind: "deal", title: "Invented meal offer", evidence: evidence(), status: "scheduled", restaurant: "Invented chain",
    window: { kind: "dates", startDate: "2026-11-12", endDateExclusive: "2026-11-13", timeZone: "America/Chicago" },
    participation: { kind: "national-local-unknown" },
    requirements: { purchase: "Invented qualifying purchase", app: true, account: true, coupon: null, channels: ["app"], exclusions: ["Synthetic terms only"], reviewedAt: "2026-11-12T17:00:00Z" },
  };
}
