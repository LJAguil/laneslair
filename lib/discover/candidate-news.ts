import type { NewsItem } from "./types";

/** Manual public-page review, independent of outing checks and feed retrieval. */
export const candidateNewsCheckedAt = "2026-11-13T22:07:54Z";

// Publication dates remain dates: the visible clock times lack a verified zone.
// These factual summaries are original; no publisher body or image is bundled.
export const candidateNews: readonly NewsItem[] = [
  {
    id: "illuminator-nuclear-2026-11-11", kind: "news", status: "scheduled",
    title: "Congress has to act first before nuclear campuses take shape, US Energy secretary says",
    evidence: {
      sourceId: "illuminator", sourceItemId: "illuminator-nuclear-2026-11-11",
      url: "https://lailluminator.com/2026/11/11/congress-nuclear/",
      level: "publisher-reported", verifiedAt: candidateNewsCheckedAt, fetchedAt: null, sourceUpdatedAt: null,
    },
    publishedAt: null, publishedOn: "2026-11-11", author: "Greg LaRose",
    topics: ["louisiana", "national", "science"], format: "reporting", access: "open",
    summary: { kind: "original", writtenAt: candidateNewsCheckedAt,
      text: "Louisiana is competing to host a nuclear-industry campus. Energy Secretary Chris Wright says Congress must authorize another permanent waste-storage site before the proposed campuses can proceed; a location has not yet been selected.",
    },
  },
  {
    id: "illuminator-batteries-2026-11-11", kind: "news", status: "scheduled",
    title: "States are counting on battery farms. Some towns don’t want them.",
    evidence: {
      sourceId: "illuminator", sourceItemId: "illuminator-batteries-2026-11-11",
      url: "https://lailluminator.com/2026/11/11/repub/battery-farms/",
      level: "publisher-reported", verifiedAt: candidateNewsCheckedAt, fetchedAt: null, sourceUpdatedAt: null,
    },
    publishedAt: null, publishedOn: "2026-11-11",
    author: "Alex Brown · Stateline, republished by Louisiana Illuminator",
    topics: ["national", "technology"], format: "reporting", access: "open",
    summary: { kind: "original", writtenAt: candidateNewsCheckedAt,
      text: "Utilities are expanding battery storage to shift electricity into periods of higher demand. Stateline examines neighborhood resistance over fire risks and project locations, alongside industry and research accounts of improvements in newer systems.",
    },
  },
];
