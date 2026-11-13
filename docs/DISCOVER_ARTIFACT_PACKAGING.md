# Discover optional NASA artifact prepared

**Latest:** [local selection and release readiness](DISCOVER_RELEASE_READINESS.md)
now supersede the disabled-selection status below. The proposed release passes
688 tests and its full build; commit/publication remain unauthorized.

November 13, 2026. Completed under the owner's instruction to continue from the
[local integration handoff](DISCOVER_LOCAL_INTEGRATION.md). Local Git HEAD remains
`8d4a84d`; preexisting changes are preserved and privacy remains paused. The app's
feed selection is still null. No new NASA request, source check or publication
occurred.

## Packaged evidence

`lib/discover/feeds/releases/nasa-2026-11-13.ts` exports the reviewed bundle as a
string literal, guarded by `import "server-only"`. It contains exactly the original
**5,614 UTF-8 bytes**, not parsed/reformatted JSON. Its SHA-256 is independently
checked against:

`94bd1b2083a41695fe9b33f7cd4779647d13c0979147fb4acf31bd1c02f06bfb`

The capture's ten institutional metadata items retain their actual feed check at
`2026-11-13T19:30:14.739Z` (1:30 PM Central), with bundle preparation at
`2026-11-13T19:30:14.752Z`. Packaging does not renew either time. The source check
reaches the existing 24-hour stale boundary November 14 at 1:30 PM Central. Each
feed story also retains its seven-day publication-age limit.

The snapshot schema includes public ETag/Last-Modified validators. Exact-byte
preservation requires retaining those fields on the server; the mapped UI data
does not expose them. The proposal's earlier instruction to exclude these fields
from the server artifact conflicted with preserving its digest and has been
corrected. No raw response-header collection, XML, article body, media, ledger,
lock or personal data was copied into the artifact. Integrity is relative to the
reviewed digest; it is not cryptographic publisher authentication.

## Checks

- **335 Discover tests passed** across 14 suites. Six new artifact tests exercise
  independently pinned identity, mapped metadata/serialization, unchanged candidate
  data, exact 24-hour boundary, publication expiry, absent/altered/future-dated
  fallback and continued disabled app selection with zero network/runtime IO.
  Tests import the packaged module; they do not require ignored capture files.
- Project TypeScript, new-file ESLint and whitespace checks passed.
- A public-only Next 16.4.1 Webpack server fixture built successfully with Cache
  Components and Partial Prefetching. It imports the actual artifact, validates it
  server-side after `await io()`, and passes mapped props to the actual Discover
  view. It does not import the authenticated layout, app store or environment files.
- A separate deliberately invalid Client Component fixture failed compilation at
  the artifact's `server-only` import, as expected. This is a successful negative
  boundary check, not an outstanding application build failure.
- All **18 client JavaScript chunks** from the positive fixture were inspected for
  the pinned digest, `snapshotDigest` and `invalid-review-bundle`: zero matches.
  This marker check supplements the framework's enforced import boundary; it is
  not a universal information-flow proof.
- The module's literal was decoded with the TypeScript parser and compared byte
  for byte against the known original capture. Source AST inspection confirmed
  `publishedFeed` remains null. See the [offline audit](discover/ARTIFACT_PACKAGING_AUDIT_2026-11-13.json).

Both builds ran outside the sandbox using approved build commands after the prior
stage established sandbox directory-creation failures. Fixtures and build outputs
remain ignored under `build/discover-artifact-server-check/` and
`build/discover-artifact-client-check/`. No app build directory was cleaned, no
permissions changed and no account/service was accessed. The UI was unchanged, so
no new browser or physical-device acceptance is claimed. The prior local-route
preview still represents the actual, curated-only app selection.

## Concrete optional-selection diff for review

The next local integration would change only the selection/import in
`lib/discover/feeds/published.ts` (plus focused tests/documentation):

```diff
 import "server-only";
+import { nasaReviewBundleBytes } from "./releases/nasa-2026-11-13";
 ...
-const publishedFeed: BundledFeedSelection | null = null;
+const publishedFeed: BundledFeedSelection | null = {
+  bytes: nasaReviewBundleBytes,
+  expectedDigest: "94bd1b2083a41695fe9b33f7cd4779647d13c0979147fb4acf31bd1c02f06bfb",
+};
```

This diff is **not applied**. Keep the expected digest literal independent of the
artifact bytes. Preserve `await io()` and `Date.now()` in the selected branch,
existing candidate fallback, individual timestamps, metadata-only labels and stale
handling. No environment switch, filesystem scan, scheduler, acquisition trigger,
database, package or hosting change is needed. Restoring the selection to null
disables the supplement locally; neither selection change is itself a deployment.

## Overview & Roadmap handoff

**Completed/files:** new server-only artifact and six tests under
`lib/discover/feeds/releases/`, this guide, the audit JSON, the corrected packaging
proposal and links in earlier handoffs. Route/view/server-selection code and all
paused auth/store/journal/assistant/privacy files are unchanged this stage.

**Verified versus uncertain:** exact reviewed identity, original clock, whole-candidate
fallback, stale/expiry behavior, framework import guard and isolated build are
verified. Source availability since capture, broad news coverage, local food terms,
full authenticated-app build and physical-phone acceptance remain unverified.

**Free limits/dependencies:** existing installed tools only. The unselected artifact
adds no request, account, key, subscription, service or automatic overage exposure.
Manual capture's conservative local attempt/gap limits still apply to any separately
requested acquisition. Neither artifact packaging nor bundling grants scraping or
redistribution permission beyond the previously reviewed source scope.

**Decisions:** optional NASA inclusion, curator/check cadence and eventual release
scope remain for owner review. No commit, push or deployment occurred or is implied.

**Next bounded task:** apply the concrete optional selection locally if the owner
continues with this supplement, adjust configured-entry tests while retaining
disabled/fallback coverage, and verify the built route at 320/390px with its actual
clock. If stale at that time, show it as stale; do not fetch or renew its timestamps
to fill the feed. Publication and any new manual capture remain separate actions.
