import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { FEED_NOW, fixtureFeed } from "./nasa.fixtures";
import { fetchNasaFeed } from "./transport";
import { prepareReviewBundle, validateReviewBundle, reviewDigest, promoteReviewBundle, decodeReviewSelection, REVIEW_BUNDLE_BYTES, type ReviewStageIO, type ReviewStageStore, type ReviewedBundle } from "./review-bundle";
import { localReviewStage, readLocalReviewBundle } from "./review-staging";
import { assessItem } from "../catalog";
import { nasaSnapshotToNews } from "./to-news";
import { discoverSources } from "../sources";
import type { NasaSnapshot } from "./types";

async function bundle(at = FEED_NOW, preparedAt = at) {
  const result = await fetchNasaFeed({ now: () => at, fetcher: async () => new Response(fixtureFeed(), { headers: { "content-type": "application/rss+xml" } }) });
  if (result.status === "failed") throw new Error(result.reason);
  return prepareReviewBundle(result.snapshot, preparedAt, "synthetic");
}
function memoryStore() {
  const artifacts = new Map<string, string>();
  let selection: string | null = null;
  const io: ReviewStageIO = {
    readSelection: vi.fn(async () => selection),
    readArtifact: vi.fn(async digest => { const bytes = artifacts.get(digest); if (bytes === undefined) throw new Error("missing-artifact"); return bytes; }),
    writeArtifactExclusive: vi.fn(async (digest, bytes) => { if (artifacts.has(digest) && artifacts.get(digest) !== bytes) throw new Error("artifact-conflict"); artifacts.set(digest, bytes); }),
    commitSelection: vi.fn(async bytes => { selection = bytes; }),
  };
  const store: ReviewStageStore = { withLock: work => work(io) };
  return { store, io, artifacts, get selection() { return selection; } };
}
const promote = (store: ReviewStageStore, item: ReviewedBundle, previous: string | null = null, now = FEED_NOW + 86_400_000) => promoteReviewBundle({ store, bytes: item.bytes, expectedDigest: item.digest, expectedPreviousDigest: previous, now });

describe("offline review bundles", () => {
  it("binds exact inert JSON bytes and retains synthetic provenance and transport times", async () => {
    const item = await bundle();
    expect(item.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(reviewDigest(item.bytes)).toBe(item.digest);
    expect(validateReviewBundle(item.bytes, item.digest, FEED_NOW)).toEqual(item);
    expect(item.inputKind).toBe("synthetic");
    expect(Object.isFrozen(item.snapshot)).toBe(true);
    expect(item.snapshot.candidates[0].summary.kind).toBe("unavailable");
    expect(() => validateReviewBundle(item.bytes + "\n", item.digest, FEED_NOW)).toThrow("invalid-review-bundle");
  });
  it("never makes stale data fresh by preparing or promoting it later", async () => {
    const item = await bundle(FEED_NOW, FEED_NOW + 86_400_000);
    const staged = memoryStore(); await promote(staged.store, item);
    expect(item.preparedAt).not.toBe(item.snapshot.representationCheckedAt);
    expect(assessItem(nasaSnapshotToNews(item.snapshot)[0], discoverSources, FEED_NOW + 86_400_000).state).toBe("stale");
  });
  it("requires an importer/restore capability for preparation", async () => {
    const item = await bundle();
    expect(() => prepareReviewBundle(JSON.parse(JSON.stringify(item.snapshot)) as NasaSnapshot, FEED_NOW, "local-snapshot")).toThrow("invalid-baseline");
  });
  it.each([NaN, Infinity, FEED_NOW - 1])("rejects invalid or rolled-back clock %s", async now => {
    const item = await bundle();
    expect(() => prepareReviewBundle(item.snapshot, now, "synthetic")).toThrow();
    expect(() => validateReviewBundle(item.bytes, item.digest, now)).toThrow("invalid-review-bundle");
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mutations intentionally represent malformed serialized data.
  const mutations: [string, (data: Record<string, any>) => void][] = [
    ["schema", d => { d.schemaVersion = 2; }],
    ["source", d => { d.sourceId = "other"; }],
    ["unrecognized input kind", d => { d.inputKind = "verified"; }],
    ["extra field", d => { d.body = "unwanted text"; }],
    ["missing field", d => { delete d.snapshotDigest; }],
    ["invalid day", d => { d.preparedAt = "2026-02-30T18:00:00.000Z"; }],
    ["ambiguous date", d => { d.preparedAt = "2026-11-12T18:00:00"; }],
    ["future preparation", d => { d.preparedAt = "2026-11-13T18:00:00.000Z"; }],
    ["preparation before retrieval", d => { d.preparedAt = "2026-11-12T17:00:00.000Z"; }],
    ["wrong snapshot digest", d => { d.snapshotDigest = "0".repeat(64); }],
    ["invalid nested snapshot with matching digest", d => { d.snapshot = "{}"; d.snapshotDigest = reviewDigest(d.snapshot); }],
  ];
  it.each(mutations)("rejects %s even when outer digest matches", async (_label, mutate) => {
    const data = JSON.parse((await bundle()).bytes); mutate(data); const bytes = JSON.stringify(data);
    expect(() => validateReviewBundle(bytes, reviewDigest(bytes), FEED_NOW)).toThrow("invalid-review-bundle");
  });
  it.each(["", "null", "[]", "{", "é".repeat(REVIEW_BUNDLE_BYTES / 2 + 1)])("rejects malformed or oversized envelope %#", bytes => {
    expect(() => validateReviewBundle(bytes, reviewDigest(bytes), FEED_NOW)).toThrow("invalid-review-bundle");
  });
  it("rejects an invalid expected digest", async () => {
    const item = await bundle();
    for (const digest of ["", item.digest.toUpperCase(), "../selection.json"]) expect(() => validateReviewBundle(item.bytes, digest, FEED_NOW)).toThrow();
  });
});

describe("promotion using injected staging failures", () => {
  it("requires exact prior selection and increments a staged revision without mutating bundles", async () => {
    const stage = memoryStore(), first = await bundle(), second = await bundle(FEED_NOW + 1000);
    expect(await promote(stage.store, first)).toEqual({ schemaVersion: 1, revision: 1, digest: first.digest });
    await expect(promote(stage.store, second)).rejects.toThrow("selection-conflict");
    expect(await promote(stage.store, second, first.digest)).toEqual({ schemaVersion: 1, revision: 2, digest: second.digest });
    expect(stage.artifacts.get(first.digest)).toBe(first.bytes);
    expect(await promote(stage.store, second, second.digest)).toMatchObject({ revision: 2 });
  });
  it("refuses missing prior state instead of silently bootstrapping", async () => {
    const stage = memoryStore(), item = await bundle();
    await expect(promote(stage.store, item, "0".repeat(64))).rejects.toThrow("selection-conflict");
    expect(stage.selection).toBeNull(); expect(stage.artifacts.size).toBe(0);
  });
  it.each(["write", "readback", "commit"])("preserves last-good selection after %s failure", async failure => {
    const stage = memoryStore(), first = await bundle(), second = await bundle(FEED_NOW + 1000);
    await promote(stage.store, first); const prior = stage.selection;
    if (failure === "write") vi.mocked(stage.io.writeArtifactExclusive).mockRejectedValueOnce(new Error("disk-full"));
    if (failure === "readback") vi.mocked(stage.io.readArtifact).mockImplementation(async digest => digest === second.digest ? second.bytes.slice(0, -1) : first.bytes);
    if (failure === "commit") vi.mocked(stage.io.commitSelection).mockRejectedValueOnce(new Error("commit-failed"));
    await expect(promote(stage.store, second, first.digest)).rejects.toThrow();
    expect(stage.selection).toBe(prior); expect(stage.artifacts.get(first.digest)).toBe(first.bytes);
  });
  it("refuses a corrupt prior artifact or selection", async () => {
    const stage = memoryStore(), first = await bundle(), second = await bundle(FEED_NOW + 1000);
    await promote(stage.store, first); stage.artifacts.set(first.digest, "partial");
    await expect(promote(stage.store, second, first.digest)).rejects.toThrow("invalid-review-bundle");
    vi.mocked(stage.io.readSelection).mockResolvedValue("{");
    await expect(promote(stage.store, second, first.digest)).rejects.toThrow("invalid-selection");
  });
  it("refuses transport rollback despite a newly prepared artifact", async () => {
    const stage = memoryStore(), first = await bundle(FEED_NOW + 1000), older = await bundle(FEED_NOW, FEED_NOW + 2000);
    await promote(stage.store, first);
    await expect(promote(stage.store, older, first.digest)).rejects.toThrow("selection-rollback");
    expect(decodeReviewSelection(stage.selection!)).toMatchObject({ digest: first.digest });
  });
  it("rejects bad selection revisions and fields", () => {
    for (const revision of [0, -1, 1.1, Number.MAX_SAFE_INTEGER + 1]) expect(() => decodeReviewSelection(JSON.stringify({ schemaVersion: 1, revision, digest: "0".repeat(64) }))).toThrow("invalid-selection");
    expect(() => decodeReviewSelection("x".repeat(1025))).toThrow("invalid-selection");
  });
});

const roots: string[] = [];
async function temporaryWorkspace() { const root = await mkdtemp(path.join(tmpdir(), "discover-review-test-")); roots.push(root); return root; }
afterEach(async () => {
  for (const root of roots.splice(0)) {
    // Delete only the exact temporary workspace created by this suite.
    if (path.dirname(path.resolve(root)) !== path.resolve(tmpdir()) || !path.basename(root).startsWith("discover-review-test-")) throw new Error("unsafe-test-cleanup");
    await rm(root, { recursive: true, force: true });
  }
});

describe("local filesystem staging with invented metadata", () => {
  it("creates only ignored staging, refuses overwrite, and commits complete selections", async () => {
    const root = await temporaryWorkspace(), stage = await localReviewStage(root), item = await bundle();
    const preparedPath = await stage.savePrepared(item.digest, item.bytes, FEED_NOW);
    expect(preparedPath.startsWith(path.join(root, "build", "discover", "review", "prepared"))).toBe(true);
    expect(await readLocalReviewBundle(preparedPath)).toBe(item.bytes);
    await expect(stage.savePrepared(item.digest, item.bytes, FEED_NOW)).rejects.toThrow();
    await promote(stage, item);
    expect(decodeReviewSelection(await readFile(path.join(stage.directory, "selection.json"), "utf8"))).toMatchObject({ revision: 1, digest: item.digest });
    const second = await bundle(FEED_NOW + 1000);
    await promote(stage, second, item.digest);
    expect(decodeReviewSelection(await readFile(path.join(stage.directory, "selection.json"), "utf8"))).toMatchObject({ revision: 2, digest: second.digest });
    expect(await readFile(path.join(stage.directory, "artifacts", `${item.digest}.json`), "utf8")).toBe(item.bytes);
    expect(await readdir(root)).toEqual(["build"]);
    expect((await readdir(stage.directory)).includes("promotion.lock")).toBe(false);
  });
  it("serializes competing promotions with an exclusive lock", async () => {
    const stage = await localReviewStage(await temporaryWorkspace());
    let release!: () => void; let acquired!: () => void;
    const entered = new Promise<void>(resolve => { acquired = resolve; });
    const first = stage.withLock(async () => { acquired(); await new Promise<void>(resolve => { release = resolve; }); });
    await entered;
    await expect(stage.withLock(async () => {})).rejects.toThrow("staging-locked");
    release(); await first;
    await expect(stage.withLock(async () => "released")).resolves.toBe("released");
  });
  it("leaves a preexisting orphan lock untouched", async () => {
    const stage = await localReviewStage(await temporaryWorkspace()), target = path.join(stage.directory, "promotion.lock");
    await writeFile(target, "operator must inspect");
    await expect(promote(stage, await bundle())).rejects.toThrow("staging-locked");
    expect(await readFile(target, "utf8")).toBe("operator must inspect");
  });
  it("preserves a corrupt existing artifact and prior selection", async () => {
    const stage = await localReviewStage(await temporaryWorkspace()), first = await bundle(), second = await bundle(FEED_NOW + 1000);
    await promote(stage, first);
    await writeFile(path.join(stage.directory, "artifacts", `${second.digest}.json`), "partial");
    await expect(promote(stage, second, first.digest)).rejects.toThrow();
    expect(decodeReviewSelection(await readFile(path.join(stage.directory, "selection.json"), "utf8"))).toMatchObject({ digest: first.digest });
    expect(await readFile(path.join(stage.directory, "artifacts", `${second.digest}.json`), "utf8")).toBe("partial");
  });
  it("reuses an exact orphan artifact after interruption", async () => {
    const stage = await localReviewStage(await temporaryWorkspace()), item = await bundle();
    await writeFile(path.join(stage.directory, "artifacts", `${item.digest}.json`), item.bytes);
    await expect(promote(stage, item)).resolves.toMatchObject({ digest: item.digest });
  });
  it("refuses a non-directory staging ancestor and unsafe digest paths", async () => {
    const root = await temporaryWorkspace(); await writeFile(path.join(root, "build"), "preserve me");
    await expect(localReviewStage(root)).rejects.toThrow("unsafe-staging-path");
    expect(await readFile(path.join(root, "build"), "utf8")).toBe("preserve me");
    const stage = await localReviewStage(await temporaryWorkspace());
    await expect(stage.savePrepared("../outside", "data", FEED_NOW)).rejects.toThrow("invalid-review-bundle");
  });
  it("rejects oversized, invalid UTF-8 and non-file input", async () => {
    const root = await temporaryWorkspace(), target = path.join(root, "input.json");
    await writeFile(target, Buffer.alloc(REVIEW_BUNDLE_BYTES + 1));
    await expect(readLocalReviewBundle(target)).rejects.toThrow("invalid-staging-file");
    await writeFile(target, Buffer.from([0xff, 0xfe]));
    await expect(readLocalReviewBundle(target)).rejects.toThrow();
    await mkdir(path.join(root, "directory"));
    await expect(readLocalReviewBundle(path.join(root, "directory"))).rejects.toThrow("invalid-staging-file");
  });
});
