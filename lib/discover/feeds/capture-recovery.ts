import { CAPTURE_GAP, decodeCaptureState, selectedCaptureBaseline, type CaptureKind, type CaptureStore } from "./capture";
import { isReviewDigest, reviewDigest } from "./review-bundle";

export type CaptureRecoveryResult =
  | { status: "reconciled"; attemptId: string; revision: number; stateDigest: string }
  | { status: "blocked"; reason: string };

/** Explicitly abandon an uncertain pending outcome, preserving spent attempts and
 * validated last-good references. No fetch, refund, orphan adoption or lock breaking.
 * Expected operands come from reviewing the exact current local status, not a URL.
 */
export async function reconcilePendingCapture({ store, inputKind, singleOperator, expectedStateDigest, expectedRevision, expectedPending, now }: {
  store: CaptureStore; inputKind: CaptureKind; singleOperator: boolean;
  expectedStateDigest: string; expectedRevision: number; expectedPending: string; now: number;
}): Promise<CaptureRecoveryResult> {
  if (!singleOperator) return { status: "blocked", reason: "operator-history-unconfirmed" };
  if (!isReviewDigest(expectedStateDigest) || !Number.isSafeInteger(expectedRevision) || expectedRevision < 1 || !/^capture-[1-9]\d*$/.test(expectedPending)) return { status: "blocked", reason: "invalid-recovery-operands" };
  try {
    return await store.withLock(async io => {
      const bytes = await io.readState();
      if (bytes === null) return { status: "blocked", reason: "missing-capture-state" };
      if (reviewDigest(bytes) !== expectedStateDigest) return { status: "blocked", reason: "recovery-state-conflict" };
      const state = decodeCaptureState(bytes, now);
      if (state.inputKind !== inputKind) return { status: "blocked", reason: "capture-kind-mismatch" };
      if (state.revision !== expectedRevision) return { status: "blocked", reason: "recovery-state-conflict" };
      if (state.pending === null) return { status: "blocked", reason: "no-pending-capture" };
      if (state.pending !== expectedPending) return { status: "blocked", reason: "recovery-state-conflict" };
      await io.assertLock(); await selectedCaptureBaseline(io, state, now);
      const revision = state.revision + 1;
      if (!Number.isSafeInteger(revision)) throw new Error("invalid-capture-state");
      const completed = {
        ...state, revision, lastObservedAt: new Date(now).toISOString(), pending: null,
        // Even an uncertain attempt whose old spacing window expired gets a new
        // conservative hold. Preserve longer publisher backoff, never shorten it.
        nextAllowedAt: new Date(Math.max(now + CAPTURE_GAP, Date.parse(state.nextAllowedAt ?? "") || 0)).toISOString(),
        outcome: "interrupted" as const,
      };
      const next = JSON.stringify(completed);
      decodeCaptureState(next, now);
      await io.assertLock(); await io.commitState(next, bytes);
      if (await io.readState() !== next) throw new Error("capture-write-uncertain");
      await io.assertLock();
      return { status: "reconciled", attemptId: expectedPending, revision, stateDigest: reviewDigest(next) };
    });
  } catch (error) {
    const known = ["invalid-clock", "invalid-capture-state", "capture-write-uncertain", "capture-locked", "capture-lock-lost"];
    return { status: "blocked", reason: error instanceof Error && known.includes(error.message) ? error.message : "capture-storage-failure" };
  }
}
