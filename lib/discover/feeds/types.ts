/** Deliberately separate from DiscoverItem: transport is not editorial verification. */
export interface NasaCandidate {
  readonly sourceId: "nasa";
  readonly sourceItemIds: readonly string[];
  readonly title: string;
  readonly url: string;
  readonly publishedAt: string;
  readonly author: string | null;
  readonly format: "institutional-update";
  readonly access: "unknown";
  readonly summary: { readonly kind: "unavailable"; readonly reason: string };
}

export type RejectionReason = "missing-field" | "ambiguous-field" | "invalid-field" | "invalid-url" | "invalid-date" | "future-date" | "duplicate-conflict";
export interface RejectedNasaItem { readonly index: number; readonly reason: RejectionReason }
export interface NasaParseResult {
  readonly candidates: readonly NasaCandidate[];
  readonly rejected: readonly RejectedNasaItem[];
  readonly inputCount: number;
  readonly duplicateCount: number;
  readonly omittedCount: number;
}

export interface NasaSnapshot extends NasaParseResult {
  readonly schemaVersion: 1;
  readonly feedUrl: string;
  readonly bodyFetchedAt: string;
  readonly representationCheckedAt: string;
  readonly etag: string | null;
  readonly lastModified: string | null;
}

export type FeedFailure = "invalid-clock" | "too-large" | "unsafe-xml" | "malformed-xml" | "unsupported-feed" | "too-many-items" | "complex-xml" | "unsupported-content-type" | "invalid-encoding" | "redirect" | "http-error" | "missing-body" | "network-error" | "timeout" | "invalid-baseline" | "not-modified-without-baseline" | "not-modified-without-validator";
export type NasaFetchResult =
  | { readonly status: "updated" | "not-modified"; readonly snapshot: NasaSnapshot }
  | { readonly status: "failed"; readonly reason: FeedFailure; readonly httpStatus?: number; readonly retryAfterAt?: string };

/** No global fetch fallback: network use requires an explicit caller-supplied transport. */
export type FeedFetcher = (url: string, init: RequestInit) => Promise<Response>;
