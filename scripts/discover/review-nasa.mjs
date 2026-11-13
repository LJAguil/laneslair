// Explicit local files and ignored staging only; no fetch or publication command.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";

const root = fileURLToPath(new URL("../../", import.meta.url));
const usage = "Usage: discover:review prepare (--sample | --snapshot <local.json>) [--now <UTC ISO>] OR promote --bundle <local.json> --digest <sha256> (--bootstrap | --previous <sha256>) [--now <UTC ISO>]";
try {
  const [mode, ...args] = process.argv.slice(2);
  const flags = new Map();
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (flags.has(key) || !["--sample", "--snapshot", "--now", "--bundle", "--digest", "--bootstrap", "--previous"].includes(key)) throw new Error(usage);
    if (["--sample", "--bootstrap"].includes(key)) flags.set(key, true);
    else { if (!args[i + 1] || args[i + 1].startsWith("--")) throw new Error(usage); flags.set(key, args[++i]); }
  }
  const allowed = mode === "prepare" ? ["--sample", "--snapshot", "--now"] : mode === "promote" ? ["--bundle", "--digest", "--bootstrap", "--previous", "--now"] : [];
  if (!allowed.length || [...flags.keys()].some(key => !allowed.includes(key)) || (mode === "prepare" ? flags.has("--sample") === flags.has("--snapshot") : !flags.has("--bundle") || !flags.has("--digest") || flags.has("--bootstrap") === flags.has("--previous"))) throw new Error(usage);
  const at = flags.get("--now");
  if (at && (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(at) || !Number.isFinite(Date.parse(at)) || new Date(at).toISOString() !== at)) throw new Error(usage);
  const now = at ? Date.parse(at) : flags.has("--sample") ? Date.parse("2026-11-12T18:00:00.000Z") : Date.now();
  // Existing TypeScript dev dependency only. No Next internals or extra TS runner.
  const output = path.join(root, "build", "discover-offline-review");
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, "package.json"), '{"type":"commonjs"}\n');
  for (const name of ["policy", "nasa", "snapshot", "transport", "review-bundle", "review-staging", "nasa.fixtures"]) {
    const source = await readFile(path.join(root, `lib/discover/feeds/${name}.ts`), "utf8");
    const compiled = ts.transpileModule(source, { fileName: `${name}.ts`, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
    await writeFile(path.join(output, `${name}.js`), compiled.outputText);
  }
  const require = createRequire(import.meta.url);
  const { prepareReviewBundle, validateReviewBundle, promoteReviewBundle, isReviewDigest } = require(path.join(output, "review-bundle.js"));
  const { localReviewStage, readLocalReviewBundle } = require(path.join(output, "review-staging.js"));
  const { restoreNasaSnapshot } = require(path.join(output, "transport.js"));
  if (mode === "prepare") {
    let serialized;
    if (flags.has("--sample")) {
      const { parseNasaFeed, NASA_FEED_URL } = require(path.join(output, "nasa.js"));
      const { fixtureFeed, FEED_NOW } = require(path.join(output, "nasa.fixtures.js"));
      // Invented capture stays fixed even when preparation is evaluated later.
      const capturedAt = new Date(FEED_NOW).toISOString();
      serialized = JSON.stringify({ ...parseNasaFeed(fixtureFeed(), FEED_NOW), schemaVersion: 1, feedUrl: NASA_FEED_URL, bodyFetchedAt: capturedAt, representationCheckedAt: capturedAt, etag: null, lastModified: null });
    } else serialized = await readLocalReviewBundle(path.resolve(flags.get("--snapshot")));
    const restored = restoreNasaSnapshot(serialized, now);
    if (restored.status !== "restored") throw new Error("invalid-snapshot");
    const bundle = prepareReviewBundle(restored.snapshot, now, flags.has("--sample") ? "synthetic" : "local-snapshot");
    const stage = await localReviewStage(root);
    const target = await stage.savePrepared(bundle.digest, bundle.bytes, now);
    process.stdout.write(JSON.stringify({ offline: true, stagingOnly: true, inputKind: bundle.inputKind, bundlePath: target, digest: bundle.digest, preparedAt: bundle.preparedAt, bodyFetchedAt: bundle.snapshot.bodyFetchedAt, feedCheckedAt: bundle.snapshot.representationCheckedAt, candidates: bundle.snapshot.candidates, rejected: bundle.snapshot.rejected, inputCount: bundle.snapshot.inputCount, duplicateCount: bundle.snapshot.duplicateCount, omittedCount: bundle.snapshot.omittedCount }, null, 2) + "\n");
  } else {
    if (!isReviewDigest(flags.get("--digest")) || (flags.has("--previous") && !isReviewDigest(flags.get("--previous")))) throw new Error(usage);
    const bytes = await readLocalReviewBundle(path.resolve(flags.get("--bundle")));
    const bundle = validateReviewBundle(bytes, flags.get("--digest"), now);
    const selection = await promoteReviewBundle({ store: await localReviewStage(root), bytes, expectedDigest: bundle.digest, expectedPreviousDigest: flags.has("--bootstrap") ? null : flags.get("--previous"), now });
    process.stdout.write(JSON.stringify({ offline: true, stagingOnly: true, inputKind: bundle.inputKind, selection }, null, 2) + "\n");
  }
} catch (error) {
  const message = error instanceof Error && (error.message === usage || /^[a-z]+(?:-[a-z]+)*$/.test(error.message)) ? error.message : "review-command-failed";
  process.stderr.write(message + "\n"); process.exitCode = 1;
}
