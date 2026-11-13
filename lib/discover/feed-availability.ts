/** Serializable public UI state; no snapshot bytes, validators or server imports. */
export type FeedAvailability =
  | { status: "unavailable" }
  | { status: "loaded"; checkedAt: string; itemCount: number };

export const unavailableFeed: FeedAvailability = { status: "unavailable" };
