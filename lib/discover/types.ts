import type { NASA_FEED_URL } from "./feeds/policy";

/** Public Discover content only. No account data, ingestion, or persistence. */
export type Instant = string; // ISO 8601 with seconds and explicit Z/offset; validated before use.
export type CalendarDate = string; // YYYY-MM-DD, interpreted in the accompanying IANA zone.

export interface DiscoverSource {
  id: string;
  name: string;
  url: string;
  authority: "organizer" | "official-calendar" | "publisher" | "restaurant";
  ingestion: "curation" | "feed-candidate" | "api-candidate";
  access: "public-page" | "no-key-feed" | "key-required";
  automation: "not-approved"; // A public URL is not permission to scrape or redistribute.
  assessedOn: CalendarDate;
  limitations: string;
}

export interface EditorialEvidence {
  sourceId: string;
  sourceItemId?: string;
  url: string;
  level: "organizer-confirmed" | "official-listing" | "publisher-reported" | "unverified";
  verifiedAt: Instant | null; // Editorial source inspection, never inferred from routine fetching.
  fetchedAt: Instant | null;
  sourceUpdatedAt: Instant | null;
}

export interface PublisherFeedEvidence {
  sourceId: "nasa";
  sourceItemId: string;
  sourceItemIds: readonly string[];
  url: string;
  level: "publisher-feed";
  feedUrl: typeof NASA_FEED_URL;
  verifiedAt: null;
  sourceUpdatedAt: null;
  fetchedAt: Instant;
  representationCheckedAt: Instant;
}

export type Evidence = EditorialEvidence | PublisherFeedEvidence;

export type Window =
  | { kind: "timed"; startsAt: Instant; endsAt: Instant; timeZone: string }
  // End date is exclusive: a Nov 12-only offer uses Nov 13 as endDateExclusive.
  | { kind: "dates"; startDate: CalendarDate; endDateExclusive: CalendarDate; timeZone: string };

export type EventWindow = Window
  | { kind: "start-only"; startsAt: Instant; timeZone: string };

interface BaseItem<E extends Evidence = EditorialEvidence> {
  id: string;
  title: string;
  evidence: E;
  status: "scheduled" | "canceled" | "postponed" | "withdrawn";
  // Explicit editorial grouping only, not a guessed match from similar headlines.
  duplicateGroup?: string;
}

export interface EventItem extends BaseItem {
  kind: "event";
  category: "trivia" | "music" | "community" | "campus" | "arts" | "outdoors" | "other";
  description: string;
  window: EventWindow;
  venue: string;
  city: string;
  travel: "nearby" | "trip"; // Editorial city-level classification, no location tracking.
  price: { kind: "free" } | { kind: "known"; amount: number; currency: "USD"; note: string } | { kind: "unknown" };
  admission: "public" | "restricted" | "unknown";
  registrationUrl: string | null;
}

export interface NewsItem extends BaseItem<Evidence> {
  kind: "news";
  topics: string[]; // Extensible, explicit preferences; no personal-data inference.
  publishedAt: Instant | null;
  /** Use when the publisher supplies a date without a verified time/zone. */
  publishedOn?: CalendarDate;
  author: string | null;
  summary: { kind: "original"; text: string; writtenAt: Instant } | { kind: "unavailable"; reason: string };
  format: "reporting" | "opinion" | "analysis" | "institutional-update" | "unclassified";
  access: "open" | "paywall" | "unknown";
}

export interface DealItem extends BaseItem {
  kind: "deal";
  restaurant: string;
  window: Window | null; // Unknown dates cannot enter active results.
  participation:
    | { kind: "confirmed-nearby"; locations: string[]; checkedAt: Instant }
    | { kind: "national-local-unknown" };
  // Curator must explicitly review requirements, including explicit "none" values.
  requirements: {
    purchase: string;
    app: boolean;
    account: boolean;
    coupon: string | null;
    channels: ("in-store" | "drive-through" | "app" | "website" | "delivery")[];
    exclusions: string[];
    reviewedAt: Instant | null;
  };
}

export type DiscoverItem = EventItem | NewsItem | DealItem;

export const discoverDefaults = {
  city: "Ruston, Louisiana",
  timeZone: "America/Chicago",
  nearbyCities: ["Ruston", "Grambling", "Monroe", "West Monroe"],
  travel: "nearby-first-trips-separate",
  preferredMaxPriceUSD: 20,
  includeOccasionalHigherPrices: true,
  newsTopics: ["louisiana", "technology", "science", "national", "world", "discovery"],
  restaurants: "fast-food-and-chains",
  appOffers: true,
} as const;
