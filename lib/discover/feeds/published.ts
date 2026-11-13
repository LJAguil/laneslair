import "server-only";
import { io } from "next/cache";
import { candidateCatalog } from "../candidate";
import { discoverSources } from "../sources";
import { loadBundledCatalog, type BundledCatalog, type BundledFeedSelection } from "./bundled-catalog";
import { nasaReviewBundleBytes } from "./releases/nasa-2026-11-13";

// Explicit local selection of reviewed bytes; no staging discovery or acquisition.
// This code change does not authorize a commit or deployment.
const publishedFeed: BundledFeedSelection | null = {
  bytes: nasaReviewBundleBytes,
  expectedDigest: "94bd1b2083a41695fe9b33f7cd4779647d13c0979147fb4acf31bd1c02f06bfb",
};

export async function publishedDiscoverCatalog(): Promise<BundledCatalog> {
  if (publishedFeed === null) {
    // No data to validate: keep the current curated-only route prerenderable.
    return loadBundledCatalog({ curated: candidateCatalog, sources: discoverSources, selection: null, now: 0 });
  }
  // Next 16.4 Cache Components: exclude wall-clock validation from the static shell.
  await io();
  return loadBundledCatalog({ curated: candidateCatalog, sources: discoverSources, selection: publishedFeed, now: Date.now() });
}
