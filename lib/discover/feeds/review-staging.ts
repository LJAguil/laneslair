import { lstat, mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { isReviewDigest, REVIEW_BUNDLE_BYTES, validateReviewBundle, type ReviewStageStore } from "./review-bundle";

const code = (error: unknown) => error && typeof error === "object" && "code" in error ? error.code : undefined;
export async function directory(target: string) {
  try { await mkdir(target); } catch (error) { if (code(error) !== "EEXIST") throw error; }
  const info = await lstat(target);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("unsafe-staging-path");
}
export async function boundedFile(target: string, limit: number): Promise<string> {
  const info = await lstat(target);
  if (!info.isFile() || info.isSymbolicLink() || info.size > limit) throw new Error("invalid-staging-file");
  const handle = await open(target, "r");
  try {
    // Bound even a file that grows after lstat; reject invalid UTF-8 rather than replacing it.
    const buffer = Buffer.alloc(limit + 1);
    let size = 0;
    while (size < buffer.length) {
      const result = await handle.read(buffer, size, buffer.length - size, null);
      if (!result.bytesRead) break;
      size += result.bytesRead;
    }
    if (size > limit) throw new Error("invalid-staging-file");
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, size));
  } finally { await handle.close(); }
}
export async function exclusiveFile(target: string, bytes: string) {
  const handle = await open(target, "wx");
  try { await handle.writeFile(bytes, "utf8"); await handle.sync(); }
  finally { await handle.close(); }
}

/** Trusted single-host staging, always under <workspace>/build/discover/review.
 * No active catalog writes or cleanup of preexisting files/locks. Not a distributed
 * lock, hostile-local-user defense, or power-loss durability guarantee.
 */
export async function localReviewStage(workspace: string): Promise<ReviewStageStore & { directory: string; savePrepared(digest: string, bytes: string, now: number): Promise<string> }> {
  let current = path.resolve(workspace);
  const rootInfo = await lstat(current);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("unsafe-staging-path");
  for (const segment of ["build", "discover", "review"]) { current = path.join(current, segment); await directory(current); }
  const staging = current, artifacts = path.join(staging, "artifacts"), prepared = path.join(staging, "prepared");
  await directory(artifacts); await directory(prepared);
  function artifact(digest: string, dir = artifacts) {
    if (!isReviewDigest(digest)) throw new Error("invalid-review-bundle");
    return path.join(dir, `${digest}.json`);
  }
  return {
    directory: staging,
    async savePrepared(digest, bytes, now) {
      validateReviewBundle(bytes, digest, now);
      const target = artifact(digest, prepared);
      await exclusiveFile(target, bytes);
      if (await boundedFile(target, REVIEW_BUNDLE_BYTES) !== bytes) throw new Error("staging-readback-failed");
      return target;
    },
    async withLock(work) {
      const lockPath = path.join(staging, "promotion.lock");
      let lock;
      try { lock = await open(lockPath, "wx"); }
      catch (error) { if (code(error) === "EEXIST") throw new Error("staging-locked"); throw error; }
      try {
        return await work({
          async readSelection() {
            try { return await boundedFile(path.join(staging, "selection.json"), 1024); }
            catch (error) { if (code(error) === "ENOENT") return null; throw error; }
          },
          readArtifact: digest => boundedFile(artifact(digest), REVIEW_BUNDLE_BYTES),
          async writeArtifactExclusive(digest, bytes) {
            try { await exclusiveFile(artifact(digest), bytes); }
            catch (error) {
              if (code(error) !== "EEXIST" || await boundedFile(artifact(digest), REVIEW_BUNDLE_BYTES) !== bytes) throw error;
              // Exact existing artifacts can be reused after an interrupted promotion.
            }
          },
          async commitSelection(bytes) {
            const temporary = path.join(staging, `selection-${randomUUID()}.tmp`);
            await exclusiveFile(temporary, bytes);
            if (await readFile(temporary, "utf8") !== bytes) throw new Error("staging-readback-failed");
            // Same-directory rename selects one complete record. On failure the old
            // selection remains; abandoned temporary/artifact files are not selected.
            await rename(temporary, path.join(staging, "selection.json"));
          },
        });
      } finally { await lock.close(); await unlink(lockPath); }
    },
  };
}

export const readLocalReviewBundle = (target: string) => boundedFile(target, REVIEW_BUNDLE_BYTES);
