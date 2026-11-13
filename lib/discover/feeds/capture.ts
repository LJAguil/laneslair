import { NASA_FEED_URL } from "./policy";
import { fetchNasaFeed, restoreNasaSnapshot, serializeNasaSnapshot } from "./transport";
import { isReviewDigest, prepareReviewBundle, reviewDigest, validateReviewBundle } from "./review-bundle";
import type { FeedFetcher, NasaFetchResult } from "./types";

export const CAPTURE_DAY = 86_400_000, CAPTURE_GAP = 6 * 3_600_000, CAPTURE_STATE_BYTES = 32_768;
export type CaptureKind = "manual" | "synthetic";
interface Attempt { id: string; at: string }
export interface CaptureState {
  schemaVersion: 1; feedUrl: typeof NASA_FEED_URL; inputKind: CaptureKind;
  initializedAt: string; lastObservedAt: string; revision: number;
  attempts: Attempt[]; pending: string | null; nextAllowedAt: string | null;
  lastGood: { snapshotDigest: string; bundleDigest: string; attemptId: string } | null;
  outcome: "initialized" | "updated" | "not-modified" | "failed" | "interrupted";
}
export interface CaptureIO {
  assertLock(): Promise<void>;
  readState(): Promise<string | null>;
  commitState(bytes: string, expected: string | null): Promise<void>;
  readArtifact(digest: string): Promise<string>;
  writeArtifact(digest: string, bytes: string): Promise<void>;
}
export interface CaptureStore { withLock<T>(work: (io: CaptureIO) => Promise<T>): Promise<T> }
const invalid = () => new Error("invalid-capture-state");
function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw invalid();
  return value as Record<string, unknown>;
}
function timestamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function id(value: unknown): value is string { return typeof value === "string" && /^[a-z0-9-]{1,64}$/.test(value); }
function captureId(value: string, revision: number): boolean {
  const match = /^capture-([1-9]\d*)$/.exec(value);
  return match !== null && Number.isSafeInteger(Number(match[1])) && Number(match[1]) >= 2 && Number(match[1]) <= revision;
}
function clock(now: number): string {
  if (!Number.isFinite(now) || !Number.isFinite(new Date(now).getTime()) || !timestamp(new Date(now).toISOString())) throw new Error("invalid-clock");
  return new Date(now).toISOString();
}
export function decodeCaptureState(bytes: string, now: number): CaptureState {
  const at = clock(now);
  if (typeof bytes !== "string" || bytes.length > CAPTURE_STATE_BYTES || Buffer.byteLength(bytes) > CAPTURE_STATE_BYTES) throw invalid();
  let json: unknown; try { json = JSON.parse(bytes); } catch { throw invalid(); }
  const row = record(json, ["schemaVersion", "feedUrl", "inputKind", "initializedAt", "lastObservedAt", "revision", "attempts", "pending", "nextAllowedAt", "lastGood", "outcome"]);
  if (row.schemaVersion !== 1 || row.feedUrl !== NASA_FEED_URL || (row.inputKind !== "manual" && row.inputKind !== "synthetic") || !timestamp(row.initializedAt) || !timestamp(row.lastObservedAt) || row.initializedAt > row.lastObservedAt || row.lastObservedAt > at || !Number.isSafeInteger(row.revision) || Number(row.revision) < 1) throw invalid();
  const lastObservedAt = row.lastObservedAt;
  if (!Array.isArray(row.attempts) || row.attempts.length > 64) throw invalid();
  const ids = new Set<string>(); let previousAt = "";
  const attempts = row.attempts.map(value => {
    const attempt = record(value, ["id", "at"]);
    if (!id(attempt.id) || ids.has(attempt.id) || (attempt.id.startsWith("capture-") && !captureId(attempt.id, Number(row.revision))) || !timestamp(attempt.at) || attempt.at < previousAt || attempt.at > lastObservedAt) throw invalid();
    ids.add(attempt.id); previousAt = attempt.at;
    return { id: attempt.id, at: attempt.at };
  });
  if ((row.pending !== null && (!id(row.pending) || row.pending !== attempts.at(-1)?.id || row.pending !== `capture-${row.revision}`)) || (row.nextAllowedAt !== null && (!timestamp(row.nextAllowedAt) || Date.parse(row.nextAllowedAt) > Date.parse(row.lastObservedAt) + 7 * CAPTURE_DAY))) throw invalid();
  let lastGood: CaptureState["lastGood"] = null;
  if (row.lastGood !== null) {
    const good = record(row.lastGood, ["snapshotDigest", "bundleDigest", "attemptId"]);
    if (!isReviewDigest(good.snapshotDigest) || !isReviewDigest(good.bundleDigest) || !id(good.attemptId) || !captureId(good.attemptId, Number(row.revision))) throw invalid();
    lastGood = { snapshotDigest: good.snapshotDigest, bundleDigest: good.bundleDigest, attemptId: good.attemptId };
  }
  if (typeof row.outcome !== "string" || !["initialized", "updated", "not-modified", "failed", "interrupted"].includes(row.outcome) || (["updated", "not-modified"].includes(row.outcome) && lastGood === null)) throw invalid();
  return { schemaVersion: 1, feedUrl: NASA_FEED_URL, inputKind: row.inputKind as CaptureKind, initializedAt: row.initializedAt, lastObservedAt: row.lastObservedAt, revision: Number(row.revision), attempts, pending: row.pending as string | null, nextAllowedAt: row.nextAllowedAt as string | null, lastGood, outcome: row.outcome as CaptureState["outcome"] };
}

/** Conservative upper-bound timestamps from the two aggregate probe reports.
 * No exact individual request times are claimed; round up report time to milliseconds.
 */
export const recordedProbeAttempts = (): Attempt[] => Array.from({ length: 6 }, (_, i) => ({ id: `recorded-probe-${i + 1}`, at: i < 3 ? "2026-11-12T07:34:04.317Z" : "2026-11-12T07:36:49.076Z" }));

export async function observeCaptureHistory(store: CaptureStore, inputKind: CaptureKind, now: number): Promise<CaptureState> {
  const at = clock(now);
  const state: CaptureState = { schemaVersion: 1, feedUrl: NASA_FEED_URL, inputKind, initializedAt: at, lastObservedAt: at, revision: 1, attempts: inputKind === "manual" ? recordedProbeAttempts() : [], pending: null, nextAllowedAt: null, lastGood: null, outcome: "initialized" };
  decodeCaptureState(JSON.stringify(state), now);
  return store.withLock(async io => {
    if (await io.readState() !== null) throw new Error("capture-state-exists");
    await io.assertLock(); await io.commitState(JSON.stringify(state), null);
    if (await io.readState() !== JSON.stringify(state)) throw new Error("capture-write-uncertain");
    return state;
  });
}

export type CaptureResult =
  | { status: "captured"; outcome: "updated" | "not-modified"; attemptId: string; snapshotDigest: string; bundleDigest: string }
  | { status: "blocked"; reason: string }
  | { status: "failed"; reason: string; attemptId: string };

/** Restore only ledger-selected data; never discover or adopt orphan artifacts. */
export async function selectedCaptureBaseline(io: CaptureIO, state: CaptureState, now: number) {
  if (!state.lastGood) return undefined;
  const bytes = await io.readArtifact(state.lastGood.snapshotDigest);
  if (reviewDigest(bytes) !== state.lastGood.snapshotDigest) throw invalid();
  const restored = restoreNasaSnapshot(bytes, now);
  if (restored.status !== "restored") throw invalid();
  const bundle = validateReviewBundle(await io.readArtifact(state.lastGood.bundleDigest), state.lastGood.bundleDigest, now);
  if (bundle.inputKind !== (state.inputKind === "manual" ? "local-snapshot" : "synthetic") || JSON.stringify(bundle.snapshot) !== JSON.stringify(restored.snapshot) || bundle.snapshot.representationCheckedAt > state.lastObservedAt) throw invalid();
  return restored.snapshot;
}

/** Exactly one explicitly injected transport call, after durable admission/readback.
 * Holding the local lock across transport prevents overlapping local invocations.
 */
export async function captureNasaOnce({ store, inputKind, singleOperator, now, fetcher }: {
  store: CaptureStore; inputKind: CaptureKind; singleOperator: boolean; now: () => number; fetcher: FeedFetcher;
}): Promise<CaptureResult> {
  if (!singleOperator) return { status: "blocked", reason: "operator-history-unconfirmed" };
  try {
    return await store.withLock(async io => {
      const started = now(), at = clock(started), before = await io.readState();
      if (before === null) return { status: "blocked", reason: "missing-capture-state" };
      const state = decodeCaptureState(before, started);
      if (state.inputKind !== inputKind) return { status: "blocked", reason: "capture-kind-mismatch" };
      if (state.pending !== null) return { status: "blocked", reason: "pending-capture-needs-reconciliation" };
      if (started - Date.parse(state.initializedAt) < CAPTURE_DAY) return { status: "blocked", reason: "history-observation-incomplete" };
      const recent = state.attempts.filter(attempt => started - Date.parse(attempt.at) < CAPTURE_DAY);
      if (recent.length >= 4) return { status: "blocked", reason: "daily-attempt-budget" };
      const latest = state.attempts.at(-1);
      if (latest && started - Date.parse(latest.at) < CAPTURE_GAP) return { status: "blocked", reason: "attempt-spacing" };
      if (state.nextAllowedAt && started < Date.parse(state.nextAllowedAt)) return { status: "blocked", reason: "capture-backoff" };
      const previous = await selectedCaptureBaseline(io, state, started);
      const revision = state.revision + 1;
      if (!Number.isSafeInteger(revision + 1)) throw invalid();
      const attemptId = `capture-${revision}`;
      const admitted: CaptureState = { ...state, revision, lastObservedAt: at, attempts: [...recent, { id: attemptId, at }], pending: attemptId };
      const admittedBytes = JSON.stringify(admitted);
      await io.assertLock(); await io.commitState(admittedBytes, before);
      if (await io.readState() !== admittedBytes) throw new Error("capture-write-uncertain");
      await io.assertLock();
      // A paused process must not spend an arbitrarily old admission after waking.
      const requestTime = now();
      if (requestTime < started || requestTime - started > 60_000) throw new Error("capture-admission-expired");
      let requests = 0;
      const transport: NasaFetchResult = await fetchNasaFeed({ now, previous, fetcher: async (url, init) => {
        await io.assertLock();
        if (init.signal?.aborted) throw new Error("capture-request-aborted");
        if (++requests !== 1) throw new Error("capture-request-limit");
        return fetcher(url, init);
      } });
      const finished = now(), completedAt = clock(finished);
      if (finished < requestTime) throw new Error("invalid-clock");
      await io.assertLock();
      const completed: CaptureState = { ...admitted, revision: revision + 1, lastObservedAt: completedAt, pending: null, outcome: transport.status === "failed" ? "failed" : transport.status };
      if (transport.status === "failed") {
        completed.nextAllowedAt = transport.retryAfterAt ?? new Date(finished + CAPTURE_GAP).toISOString();
      } else {
        const snapshotBytes = serializeNasaSnapshot(transport.snapshot), snapshotDigest = reviewDigest(snapshotBytes);
        const bundle = prepareReviewBundle(transport.snapshot, finished, inputKind === "manual" ? "local-snapshot" : "synthetic");
        await io.writeArtifact(snapshotDigest, snapshotBytes);
        if (await io.readArtifact(snapshotDigest) !== snapshotBytes) throw new Error("capture-write-uncertain");
        await io.writeArtifact(bundle.digest, bundle.bytes);
        validateReviewBundle(await io.readArtifact(bundle.digest), bundle.digest, finished);
        completed.lastGood = { snapshotDigest, bundleDigest: bundle.digest, attemptId };
        completed.nextAllowedAt = null;
      }
      const completedBytes = JSON.stringify(completed);
      decodeCaptureState(completedBytes, finished);
      await io.assertLock(); await io.commitState(completedBytes, admittedBytes);
      if (await io.readState() !== completedBytes) throw new Error("capture-write-uncertain");
      if (transport.status === "failed") return { status: "failed", reason: transport.reason, attemptId };
      return { status: "captured", outcome: transport.status, ...completed.lastGood! };
    });
  } catch (error) {
    const known = ["invalid-clock", "invalid-capture-state", "capture-write-uncertain", "capture-admission-expired", "capture-locked", "capture-lock-lost"];
    return { status: "blocked", reason: error instanceof Error && known.includes(error.message) ? error.message : "capture-storage-failure" };
  }
}
