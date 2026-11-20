import "server-only";
import { io } from "next/cache";
import { candidateCatalog } from "../candidate";
import { discoverSources } from "../sources";
import { loadBundledCatalog, type BundledCatalog, type BundledFeedSelection } from "./bundled-catalog";
import { nasaReviewBundleBytes } from "./releases/nasa-2026-11-13";
import { readDailyCatalog, mergeDailyItems } from "../daily/reader";
import { readDailyData } from "../daily/server";
import type { DailyUpdateStatus } from "../daily/status";

// Explicit local selection of reviewed bytes; no staging discovery or acquisition.
// This code change does not authorize a commit or deployment.
const publishedFeed: BundledFeedSelection | null = {
  bytes: nasaReviewBundleBytes,
  expectedDigest: "94bd1b2083a41695fe9b33f7cd4779647d13c0979147fb4acf31bd1c02f06bfb",
};

export async function publishedDiscoverCatalog(): Promise<BundledCatalog & { updates: DailyUpdateStatus }> {
  // Next 16.4 Cache Components: exclude wall-clock validation from the static shell.
  await io();
  const now = Date.now();
  const baseline = loadBundledCatalog({ curated: candidateCatalog, sources: discoverSources, selection: publishedFeed, now });
  const daily = await readDailyCatalog({ enabled: process.env.DISCOVER_DAILY_ENABLED === "true", read: readDailyData, now: Date.now });
  // A successfully stored daily NASA representation supersedes the historical feed
  // snapshot, including an authoritative empty response. Curated records stay intact.
  return { ...baseline, items: mergeDailyItems(baseline.items, daily), updates: daily.updates };
}
