/** Invented public metadata for lifecycle/rendering tests only. Never app seed data. */
import type { EditorialEvidence, NewsItem, PublisherFeedEvidence } from "./types";
import { NASA_FEED_URL } from "./feeds/policy";

export type FeedNewsFixture = NewsItem & { evidence: PublisherFeedEvidence };
export function feedNewsFixture(): FeedNewsFixture {
  return {
    id: "invented-feed-article", kind: "news", title: "Invented science headline", status: "scheduled", topics: ["science", "discovery"],
    evidence: {
      level: "publisher-feed", sourceId: "nasa", sourceItemId: "invented-guid", sourceItemIds: ["invented-guid"], url: "https://www.nasa.gov/invented-feed-article/", feedUrl: NASA_FEED_URL,
      verifiedAt: null, sourceUpdatedAt: null, fetchedAt: "2026-11-12T17:00:00Z", representationCheckedAt: "2026-11-12T17:30:00Z",
    },
    publishedAt: "2026-11-12T16:00:00Z", author: null,
    summary: { kind: "unavailable", reason: "Invented feed metadata only." }, access: "unknown", format: "institutional-update",
  };
}

export function editorialNewsFixture(): NewsItem & { evidence: EditorialEvidence } {
  const feed = feedNewsFixture();
  return {
    ...feed, id: "invented-editorial-article",
    evidence: { level: "publisher-reported", sourceId: "nasa", sourceItemId: "editorial-source-id", url: feed.evidence.url, verifiedAt: "2026-11-12T17:00:00Z", fetchedAt: null, sourceUpdatedAt: null },
    summary: { kind: "original", text: "Invented dated editorial summary.", writtenAt: "2026-11-12T17:00:00Z" }, access: "open",
  };
}
