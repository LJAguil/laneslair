# Discover offline review bundles

Implemented locally, 2026-11-12, following stage A of the
[refresh proposal](DISCOVER_REFRESH_PROPOSAL.md). Local HEAD remains `8d4a84d`.
This is **offline staging**, not publication or active-catalog selection. Existing
uncommitted work is preserved; privacy stays paused.

## Manual commands

```sh
npm run discover:review -- prepare --sample
```

Creates an invented review bundle at `build/discover/review/prepared/<digest>.json`
and prints its path, exact SHA-256 digest, timestamps, bounded candidate metadata and
rejection/duplicate/omission information. `inputKind: synthetic` is bound into the
bundle. Capture time stays fixed even if preparation happens later. Repeating the
same preparation refuses to overwrite the existing file; inspect/reuse that file.

```sh
npm run discover:review -- prepare --snapshot path/to/public-snapshot.json
```

Reads only the explicitly supplied local metadata snapshot, bounded to the review
input limit, then applies the stricter 256 KiB snapshot decoder. It does not read XML,
fetch, inspect environment files or manufacture capture times. `local-snapshot` means
operator-supplied bytes, **not authenticated publisher provenance**. Never supply
private files. There is no acquisition runner or scheduler in this stage.

Review the printed content and exact bundle bytes. Then use their digest explicitly:

```sh
npm run discover:review -- promote --bundle path/to/prepared.json --digest <reviewed-sha256> --bootstrap
npm run discover:review -- promote --bundle path/to/next.json --digest <reviewed-sha256> --previous <currently-selected-sha256>
```

`--bootstrap` explicitly expects no staged selection; `--previous` expects that exact
prior digest. They are mutually exclusive. Promotion writes only
`build/discover/review/artifacts/<digest>.json` and staging `selection.json`.
There is no active app manifest/import change. A synthetic bundle is allowed in
staging and remains visibly synthetic; it must never become real Discover content.

Optional `--now` uses canonical UTC ISO format, e.g. `2026-11-12T18:00:00.000Z`.
Samples default to that fixed test clock; other commands use the current clock.
For sample promotion evaluated at the fixed instant, supply `--now` explicitly.
All timestamp evidence survives unchanged. Clock overrides are for offline evaluation,
not proof of current publisher verification.

## Implemented checks and failure behavior

- `review-bundle.ts` requires exact envelope fields/version/source/input kind,
  bounded UTF-8 bytes (1 MiB), canonical valid preparation time, matching inner
  snapshot hash, and a fully validated snapshot. Snapshot check cannot postdate
  preparation. The separately supplied review digest covers **all exact bundle bytes**,
  including whitespace, input kind, preparation time and embedded snapshot string.
- Preparation accepts only importer/restore capabilities. Validation reconstructs a
  frozen snapshot. No digest or preparation/release review becomes editorial evidence;
  summaries remain unavailable and access remains unknown.
- Promotion validates before storage access, takes an exclusive single-host lock,
  checks expected selection, validates prior artifact, and rejects older preparation,
  body-fetch or representation-check times. Identical current selection is a no-op.
  Lost selection does not silently bootstrap when a previous digest was supplied.
- Immutable artifacts use exclusive creation and readback. An identical orphan artifact
  can be reused after interruption; conflicting/partial existing files are preserved
  and refused. New artifacts alone never become selected.
- Selection is written to an exclusively created same-directory temporary file,
  flushed, read back and selected via rename while the promotion lock is held. Failures
  before successful rename preserve the previous selection. Preparation never changes
  selection. Failed preparation can leave an incomplete unselected file; no automatic
  overwrite/cleanup hides that failure.
- Only the current invocation's lock is removed in normal cleanup. Existing locks
  cause `staging-locked`; they are never automatically broken. A crash can leave a
  lock, temporary file or unselected artifact. Inspect/reconcile manually before
  explicitly cleaning up; do not assume a lock is stale because it is old.
- Fixed output subdirectories and digest-only filenames prevent caller path traversal.
  Existing symlink/non-directory staging components are refused, and input files are
  bounded regular files decoded with fatal UTF-8 handling. No recursive deletion or
  arbitrary output-directory option exists in the command.

This adapter assumes a trusted local workspace and filesystem rename semantics.
It is not a distributed lock, a power-loss durability guarantee, defense against
hostile local processes/path replacement, or global rollback protection. Cleanup
failure or process termination after selection rename can leave a completed selection
despite an interrupted command; inspect selection before retrying. A colocated digest
does not authenticate data, and deleted/rolled-back staging history cannot prove its
own loss. No publisher request is made during recovery.

## Verification

- **229 Discover tests passed** across eight suites, including 38 new review-bundle
  cases. Synthetic tests cover exact-byte integrity, nested schema/hash failures,
  clocks, stale preservation, expected-selection conflicts, rollback, malformed prior
  state, injected write/readback/commit failures, and unchanged last-good selection.
- Real temporary-filesystem checks on Windows cover exclusive creation, complete
  selection replacement, preserved previous artifacts, lock contention/orphan locks,
  partial artifacts, interrupted-operation reuse, unsafe paths, size and encoding.
  Cleanup is restricted to the test-created temporary workspace.
- Project TypeScript, changed-file ESLint, sample importer and whitespace checks pass.
  Manual sample preparation/promotion succeeded. A wrong-digest promotion exited with
  `invalid-review-bundle` and left the staged selection unchanged. Generated output
  is confirmed Git-ignored. The retained staged selection is invented, not live data.
- Installed Next.js cache documentation was read before coding. No app build, browser,
  physical phone, private-data or paused-work checks ran; earlier release gates remain.

## Overview & Roadmap handoff

**Recommended MVP/sources:** curated nearby outings, chain deals with complete terms,
and broader curated news remain the first useful version. NASA metadata can supplement
science after reviewed provenance and release selection; it is not the requested
complete news mix. This workflow does not add a new source or maintenance commitment.

**Verified:** synthetic offline review/promotion and local filesystem behavior above.
**Uncertain:** actual source capture/provenance for future local snapshots, ownership,
cadence, hosting quotas, long-term feed behavior, production build and phone acceptance.

**Free limits/dependencies:** no new package/service/account. The command uses Node
built-ins and the existing TypeScript dev dependency to compile exact local modules
into ignored `build/discover-offline-review/`. A 1 MiB envelope wraps a maximum
256 KiB decoded snapshot; these are application limits, not hosting guarantees.

**Affected files:** new `lib/discover/feeds/review-bundle.ts`, `review-staging.ts`,
`review-bundle.test.ts`, `scripts/discover/review-nasa.mjs`, one package script and
Discover documentation. Earlier package/dependency changes are preserved. No shared
auth/store/journal/privacy source, database, app route/view, source approval or active
catalog values changed. No commit, push, deployment or live request occurred.

**Decisions before live use:** choose curator/operator and sustainable cadence;
select actual source acquisition/release scope separately. No ownership decision
blocks further synthetic local work.

**Next bounded task:** implement a server-side bundled loader with a trusted expected
digest and explicit rejection of synthetic bundles, plus curated fallback and a
visible feed-unavailable message. Test missing/invalid/stale bundles, duplicates and
withdrawals using invented inputs; keep default source content unchanged and do not
promote the retained synthetic staging selection into the app. Propose Discover
route/view wiring and an eventual reviewed artifact location before editing them.
Actual capture, publication and shared refresh remain separate authorized stages.

## Bundled loader update — 2026-11-12

The [bundled loader handoff](DISCOVER_BUNDLED_LOADER.md) now records server-only route
wiring, trusted-digest validation, synthetic rejection and curated fallback with a
News availability notice. The release selection stays empty and default content is
unchanged. All 243 Discover tests pass; isolated client separation and Next compilation
pass, but the isolated full build hit output `EPERM`. Mobile/full-build gates remain
open. No ignored staging artifact was selected for the app or published.
