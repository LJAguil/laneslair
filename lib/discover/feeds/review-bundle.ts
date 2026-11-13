import { createHash } from "node:crypto";
import { restoreNasaSnapshot, serializeNasaSnapshot } from "./transport";
import type { NasaSnapshot } from "./types";

export const REVIEW_BUNDLE_BYTES = 1_048_576;
export const reviewDigest = (bytes: string) => createHash("sha256").update(bytes, "utf8").digest("hex");
export const isReviewDigest = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const invalid = () => new Error("invalid-review-bundle");
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw invalid();
  return value as Record<string, unknown>;
}
function instant(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
export interface ReviewedBundle { readonly bytes: string; readonly digest: string; readonly preparedAt: string; readonly inputKind: "synthetic" | "local-snapshot"; readonly snapshot: NasaSnapshot }

/** No fetching or storage. Hashes the exact bytes a person must review. */
export function prepareReviewBundle(snapshot: NasaSnapshot, now: number, inputKind: ReviewedBundle["inputKind"]): ReviewedBundle {
  if (!Number.isFinite(now) || !Number.isFinite(new Date(now).getTime())) throw invalid();
  const serialized = serializeNasaSnapshot(snapshot);
  const bytes = JSON.stringify({ schemaVersion: 1, sourceId: "nasa", inputKind, preparedAt: new Date(now).toISOString(), snapshot: serialized, snapshotDigest: reviewDigest(serialized) });
  return validateReviewBundle(bytes, reviewDigest(bytes), now);
}

/** Digest integrity is relative to the caller's trusted expected digest, not authentication. */
export function validateReviewBundle(bytes: string, expectedDigest: string, now: number): ReviewedBundle {
  if (!Number.isFinite(now) || !Number.isFinite(new Date(now).getTime()) || typeof bytes !== "string" || bytes.length > REVIEW_BUNDLE_BYTES || Buffer.byteLength(bytes, "utf8") > REVIEW_BUNDLE_BYTES || !isReviewDigest(expectedDigest) || reviewDigest(bytes) !== expectedDigest) throw invalid();
  let parsed: unknown;
  try { parsed = JSON.parse(bytes); } catch { throw invalid(); }
  const data = object(parsed, ["schemaVersion", "sourceId", "inputKind", "preparedAt", "snapshot", "snapshotDigest"]);
  if (data.schemaVersion !== 1 || data.sourceId !== "nasa" || (data.inputKind !== "synthetic" && data.inputKind !== "local-snapshot") || !instant(data.preparedAt) || Date.parse(data.preparedAt) > now || typeof data.snapshot !== "string" || !isReviewDigest(data.snapshotDigest) || reviewDigest(data.snapshot) !== data.snapshotDigest) throw invalid();
  // Preparation time never substitutes for publisher transport/publication times.
  const restored = restoreNasaSnapshot(data.snapshot, Math.min(now, Date.parse(data.preparedAt)));
  if (restored.status !== "restored") throw invalid();
  return Object.freeze({ bytes, digest: expectedDigest, inputKind: data.inputKind, preparedAt: data.preparedAt, snapshot: restored.snapshot });
}

export interface ReviewSelection { readonly schemaVersion: 1; readonly revision: number; readonly digest: string }
export function decodeReviewSelection(bytes: string): ReviewSelection {
  if (bytes.length > 1024) throw new Error("invalid-selection");
  try {
    const data = object(JSON.parse(bytes), ["schemaVersion", "revision", "digest"]);
    if (data.schemaVersion !== 1 || !Number.isSafeInteger(data.revision) || Number(data.revision) < 1 || !isReviewDigest(data.digest)) throw invalid();
    return { schemaVersion: 1, revision: Number(data.revision), digest: data.digest };
  } catch { throw new Error("invalid-selection"); }
}
export interface ReviewStageIO {
  readSelection(): Promise<string | null>;
  readArtifact(digest: string): Promise<string>;
  writeArtifactExclusive(digest: string, bytes: string): Promise<void>;
  // Adapter must commit the complete record or preserve the prior selection on failure.
  commitSelection(bytes: string): Promise<void>;
}
export interface ReviewStageStore {
  withLock<T>(work: (io: ReviewStageIO) => Promise<T>): Promise<T>;
}

/** Staging only. Expected null means explicit bootstrap; never infer it from a missing file. */
export async function promoteReviewBundle({ store, bytes, expectedDigest, expectedPreviousDigest, now }: {
  store: ReviewStageStore; bytes: string; expectedDigest: string; expectedPreviousDigest: string | null; now: number;
}): Promise<ReviewSelection> {
  const bundle = validateReviewBundle(bytes, expectedDigest, now);
  if (expectedPreviousDigest !== null && !isReviewDigest(expectedPreviousDigest)) throw new Error("invalid-selection");
  return store.withLock(async io => {
    const previousBytes = await io.readSelection();
    const previous = previousBytes === null ? null : decodeReviewSelection(previousBytes);
    if ((previous?.digest ?? null) !== expectedPreviousDigest) throw new Error("selection-conflict");
    if (previous) {
      const old = validateReviewBundle(await io.readArtifact(previous.digest), previous.digest, now);
      if (bundle.snapshot.bodyFetchedAt < old.snapshot.bodyFetchedAt || bundle.snapshot.representationCheckedAt < old.snapshot.representationCheckedAt || bundle.preparedAt < old.preparedAt) throw new Error("selection-rollback");
      if (previous.digest === expectedDigest) return previous;
    }
    const revision = (previous?.revision ?? 0) + 1;
    if (!Number.isSafeInteger(revision)) throw new Error("invalid-selection");
    await io.writeArtifactExclusive(expectedDigest, bytes);
    validateReviewBundle(await io.readArtifact(expectedDigest), expectedDigest, now);
    const selection: ReviewSelection = { schemaVersion: 1, revision, digest: expectedDigest };
    await io.commitSelection(JSON.stringify(selection));
    return selection;
  });
}
