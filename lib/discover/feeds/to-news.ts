import { NASA_FEED_URL } from "./policy";
import type { NasaSnapshot } from "./types";
import type { NewsItem } from "../types";

/** Pure typed snapshot bridge; no fetching, persistence or app invocation.
 * Only importer-produced in-memory snapshots are supported. This does not restore
 * untrusted JSON; a durable restore boundary is still required before live use.
 */
export function nasaSnapshotToNews(snapshot: NasaSnapshot): NewsItem[] {
  if (snapshot.schemaVersion !== 1 || snapshot.feedUrl !== NASA_FEED_URL) throw new Error("Unsupported feed snapshot");
  return snapshot.candidates.map(candidate => ({
    id: `nasa-feed:${candidate.url}`, kind: "news", title: candidate.title, status: "scheduled",
    evidence: {
      level: "publisher-feed", sourceId: "nasa", sourceItemId: candidate.sourceItemIds[0], sourceItemIds: [...candidate.sourceItemIds],
      url: candidate.url, feedUrl: NASA_FEED_URL, verifiedAt: null, sourceUpdatedAt: null,
      fetchedAt: snapshot.bodyFetchedAt, representationCheckedAt: snapshot.representationCheckedAt,
    },
    // Source-level discovery tags, not inferred personal interests or story reporting type.
    topics: ["science", "discovery"], publishedAt: candidate.publishedAt, author: candidate.author,
    summary: { ...candidate.summary }, format: candidate.format, access: candidate.access,
  }));
}
