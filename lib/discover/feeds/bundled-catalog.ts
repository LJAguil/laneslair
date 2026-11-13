import type { DiscoverItem, DiscoverSource } from "../types";
import { catalogErrors } from "../catalog";
import { unavailableFeed, type FeedAvailability } from "../feed-availability";
import { validateReviewBundle } from "./review-bundle";
import { nasaSnapshotToNews } from "./to-news";

/** Selected by trusted release code, never a browser/request/staging-file parameter. */
export interface BundledFeedSelection { readonly bytes: string; readonly expectedDigest: string }
export interface BundledCatalog { items: readonly DiscoverItem[]; feed: FeedAvailability }

/** Server-side pure boundary with an injected clock; no disk, network or global store.
 * Errors fail the entire supplemental bundle closed, retaining every curated record.
 * Keep stale/expired records intact for client clock, review and saved-item policy.
 */
export function loadBundledCatalog({ curated, sources, selection, now }: {
  curated: readonly DiscoverItem[]; sources: readonly DiscoverSource[]; selection: BundledFeedSelection | null; now: number;
}): BundledCatalog {
  const fallback = (): BundledCatalog => ({ items: [...curated], feed: { ...unavailableFeed } });
  if (selection === null) return fallback();
  try {
    const bundle = validateReviewBundle(selection.bytes, selection.expectedDigest, now);
    if (bundle.inputKind === "synthetic") return fallback();
    const news = nasaSnapshotToNews(bundle.snapshot);
    if (news.some(item => catalogErrors(item, sources, now).length)) return fallback();
    return {
      items: [...curated, ...news],
      feed: { status: "loaded", checkedAt: bundle.snapshot.representationCheckedAt, itemCount: news.length },
    };
  } catch { return fallback(); }
}
