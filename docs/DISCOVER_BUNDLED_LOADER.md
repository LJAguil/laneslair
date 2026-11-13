# Discover bundled loader and curated fallback

Implemented locally, 2026-11-12, following the owner-authorized next task from
[review bundles](DISCOVER_REVIEW_BUNDLES.md). Local Git HEAD remains `8d4a84d`.
No live source, reviewed release artifact or published content was added. The
default catalog values and timestamps remain unchanged; privacy work is paused.

## Server and client behavior

`feeds/bundled-catalog.ts` validates exact review-bundle bytes against a trusted expected
digest, rejects `synthetic` input even with a matching hash, maps valid snapshots to
plain news items and validates those items against the source registry. Missing,
malformed, unsupported or invalid supplemental data falls back as a whole to a copy
of the existing curated catalog. Raw snapshot bytes, HTTP validators and review
artifacts are not passed to the client. No disk, network or global store is accessed.

`feeds/published.ts` is the `server-only` application entry. Its explicit release
selection is **null**. It does not read the staged synthetic selection, scan directories,
accept request parameters, read environment values or compute an expected digest from
untrusted content. Any future artifact must be imported as exact bytes under
`lib/discover/feeds/releases/` with an independently pinned digest in release code;
no such file or directory is populated by this stage. `local-snapshot` only identifies
operator-supplied data; it does not authenticate capture provenance. That remains a
review/release requirement.

The Discover route now calls this server entry inside Suspense and passes serializable
items and availability to the client view. With no selected artifact, it returns
curation without runtime clock/IO work. If a reviewed artifact is explicitly selected
later, the entry awaits Next.js `io()` before reading `Date.now()` for validation.
This follows installed Next.js 16.4.1 Cache Components guidance; the route's Suspense
boundary provides a curated fallback. No cache directive, endpoint, storage adapter,
refresh trigger or publisher request was introduced.

The News tab shows a concise NASA availability notice. Unavailable supplemental content
does not imply that curated stories are current: their existing clock rules still
apply. A loaded feed reports its successful check time, or needs a fresh check after
24 elapsed hours. Empty valid snapshots are distinguished from unavailable data.
The client waits for its clock before claiming freshness and handles clock rollback
conservatively. Display stays in America/Chicago; lifecycle comparisons use instants.

The loader does not reset timestamps, discard stale items or merge story fields.
The existing client catalog policy still chooses curated/feed duplicates, preserves
withdrawals/conflicts, moves stale stories to review and expires stories after seven
publication days. Saved-item behavior remains visit-only. Existing metadata-only,
unknown-access, unavailable-summary and institutional-update labels are preserved.

## Verification and limits

- **243 Discover tests passed** across nine suites, including 14 new loader/server-entry
  and static-rendering cases. Inputs are invented fixtures; none is a release artifact.
- Tests cover absent/bad/synthetic/empty bundles, digest/schema/clock failures, registry
  mismatch, unchanged curation, plain serializable output, stale/expired visibility,
  duplicate selection, withdrawals, no inherited summary, status copy and the default
  server entry without global fetch or runtime IO.
- Project TypeScript, changed-file ESLint and whitespace checks passed.
- An isolated Vite client build produced one chunk containing 20 modules and **zero**
  XML parser, transport, snapshot, review, hashing or server-loader modules. This checks
  the actual client import graph; it is not a production Next build.
- An isolated public-only Next.js fixture imported the actual Discover route, excluding
  the authenticated layout, private store and font/CSS pipeline. After fixing the
  fixture's alias and selecting a fresh output directory, Next.js 16.4.1 Webpack
  compilation and its TypeScript phase passed with Cache Components and Partial
  Prefetching enabled. Static generation then failed with `EPERM` while creating the
  fixture's `_global-error` output directory. **No complete production build passed.**
  An earlier retry also hit `EPERM` cleaning fixture output; no permissions or cleanup
  were forced. The application's existing `.next` directory was not used or cleaned.
- Generated checks remain under ignored `build/`; no credential/environment files
  or personal records were inspected. No authenticated-browser or physical-phone
  acceptance was performed. Existing full-build, 320/390px acceptance for the new
  notice and physical-iPhone gates remain open.

## Overview & Roadmap handoff

**MVP/source recommendation:** retain curated Ruston/Monroe outings, fast-food/chain
offers with complete terms, and broader curated news. The NASA pilot has a validated
bundled input path but no selected source artifact; it supplements science, not the
full requested news mix. Local events/deals still need manual checks. No automatic
update or ongoing maintenance commitment is implied.

**Verified:** synthetic loader/fallback behavior, default curated output, source labels,
client module separation and isolated framework compilation. **Uncertain:** provenance
and approval of an actual capture, sustainable maintenance cadence, actual hosting
plan/quotas, complete production build and new notice's browser/phone acceptance.

**Free limits/dependencies:** no added package, service, account, key or database.
Existing bundle/snapshot size bounds remain. The loader makes zero publisher/storage
requests on render or build. Earlier provider research remains conditional; no paid
fallback or source automation was enabled.

**Affected files:** new `lib/discover/feed-availability.ts`,
`feeds/bundled-catalog.ts`, `feeds/published.ts`, `feeds/bundled-catalog.test.ts`,
Discover route/view wiring and this documentation. No shared auth/store/journal/privacy
source, app layout, hosting config or source approval was edited. Existing changes
were preserved. Nothing was committed, pushed or deployed.

**Decisions before real content:** name the curator/operator, select a maintainable
cadence and approve a concrete capture/release scope separately. Retained staged
synthetic artifacts remain ineligible for release. Do not fill an empty selection by
relabeling fixtures or blessing whatever happens to exist in ignored staging.

**Next bounded task:** close public-only mobile acceptance and the isolated build
output-permission issue for this loader/notice, with 320/390px viewports and keyboard
tab/status checks, before proposing any real capture. Use only invented metadata
outside the default catalog; preserve paused work and avoid the authenticated app.
Then prepare one explicit real-source acquisition/review plan, including admission
state and operator ownership, without enabling automatic refresh or publication.

## Public-only acceptance update — 2026-11-12

[Acceptance evidence](DISCOVER_MOBILE_ACCEPTANCE.md) now closes the isolated Next
production-build and 320/390px public-only preview gates. The same fixture completed
outside the sandbox with fresh output; full authenticated app/physical-iPhone gates
remain open. Five feed states, keyboard navigation/focus and saved expiry passed with
invented inputs. No product-code fix or live source was added. The
[manual capture plan](DISCOVER_CAPTURE_PLAN.md) specifies admission/history and the
next bounded implementation; release selection stays empty.
