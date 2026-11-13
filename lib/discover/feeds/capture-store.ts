import { lstat, open, rename, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { boundedFile, directory, exclusiveFile } from "./review-staging";
import { isReviewDigest, REVIEW_BUNDLE_BYTES, reviewDigest } from "./review-bundle";
import { CAPTURE_STATE_BYTES, type CaptureKind, type CaptureStore } from "./capture";

const errorCode = (error: unknown) => error && typeof error === "object" && "code" in error ? error.code : null;

/** Trusted local single-host store only. Never reads app/staging selection or env.
 * Token checks fence accidental lock loss; not protection against hostile local code.
 */
export async function localCaptureStore(workspace: string, inputKind: CaptureKind): Promise<CaptureStore & { directory: string }> {
  if (inputKind !== "manual" && inputKind !== "synthetic") throw new Error("invalid-capture-state");
  let root = path.resolve(workspace);
  const info = await lstat(root);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("unsafe-staging-path");
  for (const segment of ["build", "discover", "capture", inputKind]) { root = path.join(root, segment); await directory(root); }
  const artifacts = path.join(root, "artifacts"); await directory(artifacts);
  const statePath = path.join(root, "state.json"), lockPath = path.join(root, "capture.lock");
  const readState = async () => {
    try { return await boundedFile(statePath, CAPTURE_STATE_BYTES); }
    catch (error) { if (errorCode(error) === "ENOENT") return null; throw error; }
  };
  const artifactPath = (digest: string) => {
    if (!isReviewDigest(digest)) throw new Error("invalid-capture-state");
    return path.join(artifacts, `${digest}.json`);
  };
  return {
    directory: root,
    async withLock(work) {
      const token = randomUUID(); let handle;
      try { handle = await open(lockPath, "wx"); }
      catch (error) { if (errorCode(error) === "EEXIST") throw new Error("capture-locked"); throw error; }
      let ownsToken = false;
      const assertLock = async () => {
        let current;
        try { current = await boundedFile(lockPath, 128); } catch { throw new Error("capture-lock-lost"); }
        if (current !== token) throw new Error("capture-lock-lost");
      };
      try {
        await handle.writeFile(token, "utf8"); await handle.sync(); ownsToken = true;
        return await work({
          assertLock, readState,
          readArtifact: digest => boundedFile(artifactPath(digest), REVIEW_BUNDLE_BYTES),
          async writeArtifact(digest, bytes) {
            await assertLock();
            if (Buffer.byteLength(bytes) > REVIEW_BUNDLE_BYTES || reviewDigest(bytes) !== digest) throw new Error("invalid-capture-state");
            try { await exclusiveFile(artifactPath(digest), bytes); }
            catch (error) { if (errorCode(error) !== "EEXIST" || await boundedFile(artifactPath(digest), REVIEW_BUNDLE_BYTES) !== bytes) throw error; }
            await assertLock();
          },
          async commitState(bytes, expected) {
            await assertLock();
            if (Buffer.byteLength(bytes) > CAPTURE_STATE_BYTES || await readState() !== expected) throw new Error("capture-write-uncertain");
            if (expected === null) await exclusiveFile(statePath, bytes);
            else {
              const temporary = path.join(root, `state-${randomUUID()}.tmp`);
              await exclusiveFile(temporary, bytes);
              if (await boundedFile(temporary, CAPTURE_STATE_BYTES) !== bytes) throw new Error("capture-write-uncertain");
              await assertLock();
              if (await readState() !== expected) throw new Error("capture-write-uncertain");
              await rename(temporary, statePath);
            }
            await assertLock();
            if (await readState() !== bytes) throw new Error("capture-write-uncertain");
          },
        });
      } finally {
        await handle.close();
        // Never remove somebody else's replacement lock or automatically break an
        // orphan. Cleanup uncertainty is reported; inspect state before retrying.
        if (ownsToken) {
          let stillOwned = false; try { await assertLock(); stillOwned = true; } catch { /* preserve replacement */ }
          if (stillOwned) await unlink(lockPath);
        }
      }
    },
  };
}
