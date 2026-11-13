import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CAPTURE_DAY, CAPTURE_GAP, CAPTURE_STATE_BYTES, captureNasaOnce, decodeCaptureState, observeCaptureHistory, type CaptureIO, type CaptureStore } from "./capture";
import { localCaptureStore } from "./capture-store";
import { FEED_NOW, fixtureFeed } from "./nasa.fixtures";
import { NASA_LIMITS } from "./policy";
import { validateReviewBundle } from "./review-bundle";
import { nasaSnapshotToNews } from "./to-news";
import { assessItem } from "../catalog";
import { discoverSources } from "../sources";
import type { FeedFetcher } from "./types";

function memoryStore() {
  let state: string | null = null;
  const artifacts = new Map<string, string>(), order: string[] = [];
  const io: CaptureIO = {
    assertLock: vi.fn(async () => {}),
    readState: vi.fn(async () => state),
    commitState: vi.fn(async (bytes, expected) => { order.push("commit"); if (state !== expected) throw new Error("conflict"); state = bytes; }),
    readArtifact: vi.fn(async digest => { const bytes = artifacts.get(digest); if (bytes === undefined) throw new Error("missing-artifact"); return bytes; }),
    writeArtifact: vi.fn(async (digest, bytes) => { artifacts.set(digest, bytes); }),
  };
  const store: CaptureStore = { withLock: work => work(io) };
  return { store, io, artifacts, order, get state() { return state; }, set state(value) { state = value; } };
}
async function ready() {
  const stage = memoryStore(); await observeCaptureHistory(stage.store, "synthetic", FEED_NOW - CAPTURE_DAY); stage.order.length = 0; return stage;
}
const response = () => new Response(fixtureFeed(), { headers: { "content-type": "application/rss+xml", etag: '"invented"' } });
const invoke = (store: CaptureStore, fetcher: FeedFetcher = vi.fn(async () => response()), at = FEED_NOW) => captureNasaOnce({ store, inputKind: "synthetic", singleOperator: true, fetcher, now: () => at });
afterEach(() => { vi.useRealTimers(); });

describe("manual capture admission using mocked transport only", () => {
  it("makes no request for missing state, unconfirmed history, kind mismatch or incomplete observation", async () => {
    const stage = memoryStore(), fetcher = vi.fn(async () => response());
    expect(await invoke(stage.store, fetcher)).toMatchObject({ status: "blocked", reason: "missing-capture-state" });
    await observeCaptureHistory(stage.store, "synthetic", FEED_NOW);
    expect(await invoke(stage.store, fetcher)).toMatchObject({ reason: "history-observation-incomplete" });
    expect(await captureNasaOnce({ store: stage.store, fetcher, now: () => FEED_NOW, inputKind: "manual", singleOperator: true })).toMatchObject({ reason: "capture-kind-mismatch" });
    expect(await captureNasaOnce({ store: stage.store, fetcher, now: () => FEED_NOW, inputKind: "synthetic", singleOperator: false })).toMatchObject({ reason: "operator-history-unconfirmed" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("seeds all six prior manual probes and never silently resets existing observation state", async () => {
    const stage = memoryStore();
    const state = await observeCaptureHistory(stage.store, "manual", FEED_NOW);
    expect(state.attempts).toHaveLength(6);
    expect(state.attempts.at(-1)?.at).toBe("2026-11-12T07:36:49.076Z");
    await expect(observeCaptureHistory(stage.store, "manual", FEED_NOW + 1)).rejects.toThrow("capture-state-exists");
    expect(JSON.parse(stage.state!)).toEqual(state);
  });
  it("persists admission/readback before the single request, then selects immutable metadata and review bytes", async () => {
    const stage = await ready();
    const fetcher = vi.fn(async () => {
      stage.order.push("fetch"); expect(JSON.parse(stage.state!).pending).toBe("capture-2"); return response();
    });
    const result = await invoke(stage.store, fetcher);
    expect(result.status).toBe("captured"); expect(fetcher).toHaveBeenCalledTimes(1);
    expect(stage.order).toEqual(["commit", "fetch", "commit"]);
    const state = decodeCaptureState(stage.state!, FEED_NOW);
    expect(state).toMatchObject({ pending: null, revision: 3, outcome: "updated" });
    expect(state.attempts).toHaveLength(1);
    const reviewed = validateReviewBundle(stage.artifacts.get(state.lastGood!.bundleDigest)!, state.lastGood!.bundleDigest, FEED_NOW);
    expect(reviewed.inputKind).toBe("synthetic"); expect(reviewed.snapshot.candidates).toHaveLength(1);
  });
  it("admits at the exact observation and six-hour boundaries, and refuses just before", async () => {
    const stage = await ready(), fetcher = vi.fn(async () => response());
    expect(await invoke(stage.store, fetcher, FEED_NOW - 1)).toMatchObject({ reason: "history-observation-incomplete" });
    expect((await invoke(stage.store, fetcher)).status).toBe("captured");
    expect(await invoke(stage.store, fetcher, FEED_NOW + CAPTURE_GAP - 1)).toMatchObject({ reason: "attempt-spacing" });
    expect((await invoke(stage.store, fetcher, FEED_NOW + CAPTURE_GAP)).status).toBe("captured");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("counts all attempts in the rolling day, including historical clusters, with an exclusive old boundary", async () => {
    const stage = await ready(), initial = JSON.parse(stage.state!);
    initial.initializedAt = new Date(FEED_NOW - 2 * CAPTURE_DAY).toISOString();
    initial.attempts = Array.from({ length: 4 }, (_, i) => ({ id: `prior-${i}`, at: new Date(FEED_NOW - CAPTURE_DAY + i * 1000).toISOString() }));
    initial.lastObservedAt = new Date(FEED_NOW - CAPTURE_GAP).toISOString(); stage.state = JSON.stringify(initial);
    const fetcher = vi.fn(async () => response());
    expect(await invoke(stage.store, fetcher, FEED_NOW - 1)).toMatchObject({ reason: "daily-attempt-budget" });
    expect((await invoke(stage.store, fetcher, FEED_NOW)).status).toBe("captured");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(stage.state!).attempts).toHaveLength(4);
  });
  it.each(["before", "after"])("never fetches when admission commit fails %s persistence", async mode => {
    const stage = await ready(), fetcher = vi.fn(async () => response());
    vi.mocked(stage.io.commitState).mockImplementationOnce(async bytes => { if (mode === "after") stage.state = bytes; throw new Error("ambiguous-write"); });
    expect((await invoke(stage.store, fetcher)).status).toBe("blocked"); expect(fetcher).not.toHaveBeenCalled();
    if (mode === "after") {
      expect(JSON.parse(stage.state!).pending).toBe("capture-2");
      expect(await invoke(stage.store, fetcher, FEED_NOW + CAPTURE_DAY)).toMatchObject({ reason: "pending-capture-needs-reconciliation" });
    }
  });
  it("leaves admission pending after a corrupt readback, without fetching", async () => {
    const stage = await ready(), fetcher = vi.fn(async () => response());
    vi.mocked(stage.io.readState).mockResolvedValueOnce(stage.state).mockResolvedValueOnce("partial");
    expect(await invoke(stage.store, fetcher)).toMatchObject({ reason: "capture-write-uncertain" });
    expect(fetcher).not.toHaveBeenCalled(); expect(JSON.parse(stage.state!).pending).toBeTruthy();
  });
  it("preserves previous last-good selection on snapshot write failure, leaving a spent pending slot", async () => {
    const stage = await ready(); await invoke(stage.store); const good = JSON.parse(stage.state!).lastGood;
    vi.mocked(stage.io.writeArtifact).mockRejectedValueOnce(new Error("disk-full"));
    const fetcher = vi.fn(async () => response());
    expect((await invoke(stage.store, fetcher, FEED_NOW + CAPTURE_GAP)).status).toBe("blocked");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(stage.state!)).toMatchObject({ lastGood: good, pending: "capture-4" });
  });
  it("preserves pending admission if completion-state write fails before selection", async () => {
    const stage = await ready(), original = stage.io.commitState;
    let commits = 0;
    stage.io.commitState = async (bytes, expected) => { if (++commits === 2) throw new Error("disk-full"); await original(bytes, expected); };
    expect((await invoke(stage.store)).status).toBe("blocked");
    expect(JSON.parse(stage.state!)).toMatchObject({ pending: "capture-2", lastGood: null });
    expect(stage.artifacts.size).toBe(2);
  });
  it.each([429, 503])("does not retry HTTP %s and honors bounded Retry-After beyond the spacing limit", async status => {
    const stage = await ready(), fetcher = vi.fn(async () => new Response(null, { status, headers: { "retry-after": "86400" } }));
    expect(await invoke(stage.store, fetcher)).toMatchObject({ status: "failed", reason: "http-error" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await invoke(stage.store, fetcher, FEED_NOW + CAPTURE_GAP)).toMatchObject({ reason: "capture-backoff" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(stage.state!)).toMatchObject({ pending: null, lastGood: null, outcome: "failed" });
  });
  it("counts network/parser failures without storing raw exceptions or replacing last-good data", async () => {
    const stage = await ready(); await invoke(stage.store); const good = JSON.parse(stage.state!).lastGood;
    const fetcher = vi.fn(async () => { throw new Error("PRIVATE RAW TRANSPORT TEXT"); });
    expect(await invoke(stage.store, fetcher, FEED_NOW + CAPTURE_GAP)).toMatchObject({ status: "failed", reason: "network-error" });
    expect(JSON.parse(stage.state!).lastGood).toEqual(good);
    expect(stage.state).not.toContain("PRIVATE");
    const malformed = vi.fn(async () => new Response("<", { headers: { "content-type": "application/rss+xml" } }));
    expect(await invoke(stage.store, malformed, FEED_NOW + 2 * CAPTURE_GAP)).toMatchObject({ status: "failed", reason: "malformed-xml" });
    expect(JSON.parse(stage.state!).lastGood).toEqual(good);
  });
  it("restores conditional validators on later invocations; 304 preserves body time and publication expiry", async () => {
    const stage = await ready(); await invoke(stage.store);
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
      expect(new Headers(init.headers).get("If-None-Match")).toBe('"invented"'); return new Response(null, { status: 304 });
    });
    expect(await invoke(stage.store, fetcher, FEED_NOW + 8 * CAPTURE_DAY)).toMatchObject({ status: "captured", outcome: "not-modified" });
    const good = JSON.parse(stage.state!).lastGood;
    const review = validateReviewBundle(stage.artifacts.get(good.bundleDigest)!, good.bundleDigest, FEED_NOW + 8 * CAPTURE_DAY);
    expect(review.snapshot.bodyFetchedAt).toBe(new Date(FEED_NOW).toISOString());
    expect(assessItem(nasaSnapshotToNews(review.snapshot)[0], discoverSources, FEED_NOW + 8 * CAPTURE_DAY).state).toBe("expired");
  });
  it("refuses invalid state, clock rollback, or corrupt/missing prior artifacts before fetch", async () => {
    const stage = await ready(), fetcher = vi.fn(async () => response());
    stage.state = "{"; expect((await invoke(stage.store, fetcher)).status).toBe("blocked");
    expect(fetcher).not.toHaveBeenCalled();
    const valid = await ready(); await invoke(valid.store); fetcher.mockClear();
    expect((await invoke(valid.store, fetcher, FEED_NOW - 1)).status).toBe("blocked");
    valid.artifacts.clear(); expect((await invoke(valid.store, fetcher, FEED_NOW + CAPTURE_GAP)).status).toBe("blocked");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("refuses a paused admission and detects lock loss before delegation", async () => {
    const stage = await ready(), fetcher = vi.fn(async () => response()); let calls = 0;
    const result = await captureNasaOnce({ store: stage.store, inputKind: "synthetic", singleOperator: true, now: () => calls++ === 0 ? FEED_NOW : FEED_NOW + 60_001, fetcher });
    expect(result).toMatchObject({ reason: "capture-admission-expired" }); expect(fetcher).not.toHaveBeenCalled();
    const other = await ready(); vi.mocked(other.io.assertLock).mockRejectedValueOnce(new Error("capture-lock-lost"));
    expect(await invoke(other.store, fetcher)).toMatchObject({ reason: "capture-lock-lost" }); expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not send a delayed request after its transport deadline has already aborted", async () => {
    vi.useFakeTimers(); const stage = await ready(), fetcher = vi.fn(async () => response());
    let count = 0, release!: () => void;
    vi.mocked(stage.io.assertLock).mockImplementation(async () => { if (++count === 3) await new Promise<void>(resolve => { release = resolve; }); });
    const pending = invoke(stage.store, fetcher);
    await vi.advanceTimersByTimeAsync(NASA_LIMITS.deadlineMs + 1);
    expect(await pending).toMatchObject({ status: "failed", reason: "timeout" });
    release(); await Promise.resolve(); expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("capture state decoder", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Deliberate malformed JSON fixtures.
  const mutations: [string, (state: Record<string, any>) => void][] = [
    ["schema", s => { s.schemaVersion = 2; }], ["source", s => { s.feedUrl = "https://example.invalid/"; }],
    ["kind", s => { s.inputKind = ["manual"]; }], ["extra data", s => { s.body = "unwanted"; }],
    ["missing field", s => { delete s.pending; }], ["clock", s => { s.lastObservedAt = "2026-11-13T18:00:00.000Z"; }],
    ["date", s => { s.initializedAt = "2026-02-30T00:00:00.000Z"; }],
    ["revision", s => { s.revision = 0; }], ["fractional revision", s => { s.revision = 1.5; }],
    ["attempt beyond revision", s => { s.attempts = [{ id: "capture-2", at: s.lastObservedAt }]; }],
    ["duplicate identities", s => { s.attempts = [{ id: "same", at: s.lastObservedAt }, { id: "same", at: s.lastObservedAt }]; }],
    ["unsorted history", s => { s.attempts = [{ id: "a", at: "2026-11-11T18:00:00.001Z" }, { id: "b", at: "2026-11-11T18:00:00.000Z" }]; }],
    ["future history", s => { s.attempts = [{ id: "a", at: "2026-11-12T18:00:00.000Z" }]; }],
    ["unmatched pending", s => { s.pending = "missing"; }], ["unbounded backoff", s => { s.nextAllowedAt = "2027-01-01T00:00:00.000Z"; }],
    ["bad digest", s => { s.lastGood = { snapshotDigest: "wrong", bundleDigest: "wrong", attemptId: "a" }; }],
    ["unknown outcome", s => { s.outcome = "raw message"; }], ["successful outcome without data", s => { s.outcome = "updated"; }],
  ];
  it.each(mutations)("rejects %s", async (_label, mutate) => {
    const stage = await ready(), state = JSON.parse(stage.state!); mutate(state);
    expect(() => decodeCaptureState(JSON.stringify(state), FEED_NOW)).toThrow();
  });
  it("rejects oversized state and invalid evaluation clocks", async () => {
    const stage = await ready();
    expect(() => decodeCaptureState("x".repeat(CAPTURE_STATE_BYTES + 1), FEED_NOW)).toThrow();
    for (const now of [NaN, Infinity]) expect(() => decodeCaptureState(stage.state!, now)).toThrow("invalid-clock");
  });
});

const roots: string[] = [];
async function temporaryWorkspace() { const root = await mkdtemp(path.join(tmpdir(), "discover-capture-test-")); roots.push(root); return root; }
afterEach(async () => { for (const root of roots.splice(0)) {
  if (path.dirname(path.resolve(root)) !== path.resolve(tmpdir()) || !path.basename(root).startsWith("discover-capture-test-")) throw new Error("unsafe-test-cleanup");
  await rm(root, { recursive: true, force: true });
} });

describe("local capture state across restarts and contention", () => {
  it("persists admission/snapshot/bundle across a fresh adapter and module instance", async () => {
    const root = await temporaryWorkspace(), first = await localCaptureStore(root, "synthetic");
    await observeCaptureHistory(first, "synthetic", FEED_NOW - CAPTURE_DAY);
    expect((await invoke(first)).status).toBe("captured");
    vi.resetModules(); const restarted = await import("./capture-store"); const runner = await import("./capture");
    const next = await restarted.localCaptureStore(root, "synthetic");
    const result = await runner.captureNasaOnce({ store: next, inputKind: "synthetic", singleOperator: true, now: () => FEED_NOW + CAPTURE_GAP, fetcher: async () => new Response(null, { status: 304 }) });
    expect(result).toMatchObject({ status: "captured", outcome: "not-modified" });
    expect(JSON.parse(await readFile(path.join(first.directory, "state.json"), "utf8")).attempts).toHaveLength(2);
  });
  it("allows only one concurrent local capture and leaves other operators' locks intact", async () => {
    const store = await localCaptureStore(await temporaryWorkspace(), "synthetic");
    await observeCaptureHistory(store, "synthetic", FEED_NOW - CAPTURE_DAY);
    let release!: () => void, entered!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const first = invoke(store, vi.fn(async () => { entered(); await new Promise<void>(resolve => { release = resolve; }); return response(); }));
    await started;
    const second = vi.fn(async () => response());
    expect(await invoke(store, second)).toMatchObject({ reason: "capture-locked" }); expect(second).not.toHaveBeenCalled();
    release(); expect((await first).status).toBe("captured");
    await writeFile(path.join(store.directory, "capture.lock"), "orphan operator lock");
    expect(await invoke(store)).toMatchObject({ reason: "capture-locked" });
    expect(await readFile(path.join(store.directory, "capture.lock"), "utf8")).toBe("orphan operator lock");
  });
  it("detects lock replacement and never removes the replacement token", async () => {
    const store = await localCaptureStore(await temporaryWorkspace(), "synthetic");
    await store.withLock(async io => {
      await writeFile(path.join(store.directory, "capture.lock"), "replacement");
      await expect(io.assertLock()).rejects.toThrow("capture-lock-lost");
    });
    expect(await readFile(path.join(store.directory, "capture.lock"), "utf8")).toBe("replacement");
  });
  it("keeps manual/synthetic namespaces separate and refuses corrupt state without network", async () => {
    const root = await temporaryWorkspace(), sample = await localCaptureStore(root, "synthetic"), manual = await localCaptureStore(root, "manual");
    expect(sample.directory).not.toBe(manual.directory);
    await writeFile(path.join(sample.directory, "state.json"), "partial"); const fetcher = vi.fn(async () => response());
    expect((await invoke(sample, fetcher)).status).toBe("blocked"); expect(fetcher).not.toHaveBeenCalled();
    expect(await manual.withLock(io => io.readState())).toBeNull();
  });
});
