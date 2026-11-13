# Discover local app integration proposal

**Latest implementation:** [selected feed and release readiness](DISCOVER_RELEASE_READINESS.md).
The concrete selection is now applied locally; the loading fallback is deliberately
noninteractive to avoid losing early tab clicks. Earlier proposal/status paragraphs
below are retained as design history.

**Implementation update:** [curated-only local wiring is complete](DISCOVER_LOCAL_INTEGRATION.md),
with 329 tests and the isolated Next/mobile checks passing. Feed selection remains
null. The proposal below is retained as its design record; its wiring task is no
longer outstanding. [Artifact packaging is also complete](DISCOVER_ARTIFACT_PACKAGING.md);
its optional-selection diff has not been applied.

Prepared November 13, 2026, following the candidate-preview handoff and the owner's
instruction to begin the next step. Local HEAD verified as `8d4a84d`. This step
changes documentation/evidence only. Existing uncommitted work is preserved;
privacy remains paused. No app selection, artifact release, commit or deployment
is performed by this proposal.

## Recommended first integration

Use the existing three-tab Discover route and the reviewed candidate's 16 editorial
records. Preserve individual inspection/publication dates and pass its partial-check
note through both the normal view and Suspense fallback. Keep incomplete deals and
the disputed meetup in review. Bookmarks/interests remain visit-only and preferences
stay city-level; no database, real AI connection or location tracking is needed.

Make the first local wiring task curated-only, leaving `publishedFeed` null. This
isolates the view/catalog change from selecting a feed release. The existing preview
already demonstrates the optional real NASA supplement; packaging that supplement
can follow as a separate local task after the candidate is reviewed. Neither task
authorizes publication or changes to the deployed app.

## Exact proposed edits

| File | Proposed local change | Acceptance |
| --- | --- | --- |
| `components/discover/discover-view.tsx` | Add optional `curationNote` to `DiscoverView` and forward it to `DiscoverScreen`. | Omitted prop keeps the baseline label; supplied prop displays the partial-check note. No new store/auth imports. |
| `lib/discover/feeds/published.ts` | For the local candidate integration, select `candidateCatalog` instead of `curatedCatalog`; keep `publishedFeed = null`. Preserve the current no-runtime-IO branch when no artifact is selected. | Exact candidate output and unchanged timestamps; zero fetch/storage/env access; no feed selection. |
| `app/(app)/discover/page.tsx` | Pass `candidateCurationNote` to the resolved view; pass the same candidate items/note to the Suspense fallback. | Neither render path claims the entire catalog was rechecked. Same navigation and route. |
| `lib/discover/feeds/bundled-catalog.test.ts` | Adjust default-entry expectations only when the candidate is actually selected. | Default entry returns the selected editorial records without runtime IO/network. Existing malformed/synthetic/stale bundle tests stay. |
| `lib/discover/candidate.test.ts` or a focused view test | Verify wrapper note forwarding/default and selective-refresh/uncertainty behavior. | No renewal of inaccessible news, old NASA editorial stories, unknown deal terms or disputed venue. |
| This guide and candidate-preview guide | Record the implemented local selection and new evidence. | Clearly distinguish local wiring from deployed behavior. |

Do not edit these files in advance merely to make this proposal appear integrated.
No new navigation destination, endpoint, environment switch or app-layout change is
required. `curated.ts` remains the untouched historical baseline; candidate records
remain explicitly selected rather than silently replacing that baseline.

## Optional NASA artifact packaging

The exact reviewed source file is currently ignored local operator output:

`build/discover/capture/manual/artifacts/94bd1b2083a41695fe9b33f7cd4779647d13c0979147fb4acf31bd1c02f06bfb.json`

The offline audit validated its **5,614 UTF-8 bytes**, ten accepted items and expected
SHA-256 `94bd1b2083a41695fe9b33f7cd4779647d13c0979147fb4acf31bd1c02f06bfb`.
It is `local-snapshot`, prepared at `2026-11-13T19:30:14.752Z`; the actual feed check
is `2026-11-13T19:30:14.739Z`. Digest integrity does not authenticate the publisher
or replace the capture/review provenance recorded in the manual-capture handoff.

If separately selected for a local release candidate:

1. Create a server-only module at
   `lib/discover/feeds/releases/nasa-2026-11-13.ts` exporting the **exact original
   bundle string**, escaped as a JavaScript string literal. Generate that literal
   from the reviewed bytes; do not parse/reformat the JSON or snapshot. Verify the
   imported string's UTF-8 digest against the independently pinned value above.
2. Import that string explicitly into `feeds/published.ts` and set the exact
   `{ bytes, expectedDigest }` selection. Keep the digest literal in selection code;
   never compute the trusted expected value from the supplied artifact at runtime.
3. Preserve `await io()` before `Date.now()` in the selected-artifact branch, within
   the existing Suspense boundary. Do not cache the evaluation clock or use the
   release/build time as a new feed check. This follows installed Next 16.4.1
   `io` and Server/Client Components documentation.
4. Test byte equality/digest, client import separation and whole-catalog fallback.
   Only plain mapped items/availability/note cross the server/client boundary.

No raw-loader configuration or request-time file read is required. Do not copy the
capture ledger, locks, raw response headers, XML or screenshots into runtime
release code. The exact snapshot schema includes public ETag/Last-Modified validator
fields: retain these within the server-only bundle to preserve its reviewed digest,
but never forward them to client props. This corrects the earlier instruction to
exclude all transport validators, which conflicted with exact-byte preservation.
Do not discover the newest staging file, adopt an orphan artifact,
fetch a replacement or start a timer. An old bundle may be retained as historical
evidence, but cannot be made current by packaging it again.

## Freshness and fallback audit

[Machine-readable offline evidence](discover/INTEGRATION_AUDIT_2026-11-13.json)
was produced at `2026-11-13T22:12:17.360Z` (4:12 PM Central). The audit transpiled
the current public catalog/loader modules into ignored `build/`, loaded only the
known bundle and evaluated the real lifecycle/deduplication functions. It made
zero network requests and did not read the capture ledger or personal records.
Counts use all interests and prices, before view pagination/filtering.

| Evaluation in America/Chicago | Main outings | Main news | Main food deals |
| --- | ---: | ---: | ---: |
| Nov 13, 4:12 PM | 6 | 12 | 0 |
| Nov 14, 1:30:14.739 PM — exactly 24h after NASA check | 1 | 2 | 0 |
| Nov 14, 3:53:40 PM — outing check reaches 24h | 0 | 2 | 0 |
| Nov 14, 4:07:54 PM — reporting check reaches 24h | 0 | 0 | 0 |
| Nov 21, 4:07:54 PM | 0 | 0 | 0 |

The second row also reflects the actual end of the Saturday morning events;
expiration and staleness are different outcomes. At the final clock, all ten NASA
items are archived by their seven-day publication-age policy. Editorial news keeps
its existing 24-hour check policy; this proposal does not add a seven-day editorial
publication cutoff. The date-range exhibit also needs a fresh check under the
current event policy; its long advertised run does not guarantee current access.

Missing selection, an altered byte string with the original expected digest, and
a clock before bundle preparation each returned the exact 16-record candidate
fallback with unavailable feed status. A valid but stale bundle remains loaded:
the client marks it as needing a fresh check and removes stale items from main
recommendations. A loader success is not a freshness guarantee. Client clock rollback
and malformed/synthetic input remain covered by existing tests.

The proposal audit and preview **do not renew any source timestamp**. No automatic
future source check is scheduled. Incomplete offers remain review-only; the dated
Frosty record expires after November 15 in America/Chicago even if never resolved.

## Dependencies and paused-work boundary

The integrated runtime uses the Discover route/view; `candidate.ts`,
`candidate-news.ts`, `curated.ts`, `types.ts`, `sources.ts`, `catalog.ts`,
`presentation.ts`, `clock.ts`, `feed-availability.ts`; and the existing server loader
chain: `feeds/published.ts`, `bundled-catalog.ts`, `review-bundle.ts`, `transport.ts`,
`snapshot.ts`, `to-news.ts`, `nasa.ts`, `policy.ts`, `types.ts`. The restore chain
currently imports parser code and the installed pinned `@xmldom/xmldom` 0.9.12 even
when no live fetching occurs. Keep those server modules out of the client bundle.
Existing shared UI/icon/utility imports also remain dependencies.

A later release must explicitly select these Discover changes and appropriate
tests/docs. Capture/recovery scripts, fixtures and preview tooling are development
tools, not request-time acquisition. Review package/lock changes for the pinned XML
dependency and any intentionally included Discover scripts; do not stage a directory
or whole working tree as a substitute for a release manifest.

`app/(app)/layout.tsx`, auth/proxy, journal, assistant, global stores, privacy code,
privacy SQL and `next.config.ts` contain preexisting work outside this slice. Their
changes are excluded from the proposed Discover edits/release. The `vitest.config.mts`
worker cap is also preexisting and not a Discover release requirement. No current
config hunk is needed for static string artifact packaging. Reconstruct any eventual
release against the verified baseline and inspect the exact diff; do not reset or
discard the paused checkout to obtain it. Full authenticated-app behavior remains
unverified; an isolated Discover fixture does not certify those shared changes.

## Stages and acceptance

1. **Proposal/audit — complete:** exact wiring plan, byte/digest identity, timed
   visibility counts and fail-closed evidence. Twenty focused loader/candidate tests
   passed this turn. The preceding 328-test/mobile-preview result remains historical;
   no new full build or browser check was needed for these documentation-only edits.
2. **Next bounded local task:** implement only the curated candidate wiring and note
   forwarding above. Run Discover tests, TypeScript, changed-file lint, an isolated
   Next route build and 320/390px preview checks. Preserve published feed null and
   source timestamps. Report the exact diff and any stale/empty sections honestly.
3. **Optional supplement:** prepare/validate the explicit server-only NASA artifact
   module, test absent/bad/stale behavior and recheck actual freshness. Source capture
   is a separate explicit manual action subject to the existing ledger limits.
4. **Release review:** select clean Discover-only changes; refresh selected content
   through real checks as needed; verify full build and authenticated/phone acceptance
   within an authorized test scope. Commit, push and deployment still each require
   separate authorization. No production state changes are part of stages 1–3.

## Overview & Roadmap handoff

**MVP/sources:** candidate outings from official Ruston listings, two original
publisher-reporting summaries, optional metadata-only NASA science, and food offers
kept separate until dates/terms/local participation support them. Source research
and limitations remain in the candidate/source guides; none was rechecked online
this turn. Wider Monroe/trivia/trip coverage and broader world reporting are gaps.

**Free limits:** no new package, account, key, database, subscription or hosting
resource. Bundled rendering makes zero publisher requests. Manual NASA acquisition
retains the conservative local four-attempt rolling-24h/six-hour-gap limits; these
are local safeguards, not a guaranteed publisher allowance. No provider overage path
or automatic refresh is enabled. Outings, reporting and food still require curation.

**Decisions still needed:** candidate usefulness/coverage, a curator/operator and
sustainable check cadence, and whether to include a NASA artifact in an eventual
release. Physical-phone/full-app acceptance and clean release selection remain open.
The existing direction/preferences suffice to implement the next local wiring task;
these decisions do not require another planning-only stage or authorize publication.
