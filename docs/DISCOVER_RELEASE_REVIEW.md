# Discover final release review — November 13, 2026

**Owner authorization received:** the owner replied “yes do it” to the explicit
Discover-only commit request on November 13, 2026. This authorizes the reviewed
commit only. Push and deployment remain unauthorized; phone acceptance is pending.
The review-time statements below are retained as the decision record.

**Result: ready for the owner's Discover-only commit authorization.** The release
scope review is complete. Deployment still requires device/authenticated acceptance,
release-time content review and separate publication authorization. No index change,
commit, push, deployment or source request was made during this review.

## Reviewed scope

Local HEAD is `8d4a84dad370955cdaa31cafded7ab48fc20ada8`. The proposed code/tooling/test
scope contains **51 files: six modified and 45 added**. A review-only unified patch
is saved under `build/discover-release-review/discover-release.patch`, with parsed
statistics of 4,003 insertions and 85 deletions. The patch is not applied to the Git
index. Documentation/evidence paths are listed separately in the
[manifest](discover/RELEASE_SCOPE_2026-11-13.json).

Reviewed runtime boundaries: route/loading/streamed view, explicit bundle selection,
digest/schema validation, mapped client props, lifecycle/deduplication, unknown terms,
links, visit-only state and manual acquisition/tool entry points. The selected code
hashes still match the release-check tree; whole-file selections also match the
working files. The mixed Vitest file is deliberately reconstructed from baseline
plus only `build/**` exclusion, leaving the existing worker-limit hunk out.

No blocking runtime finding was identified in this review. One scope finding was
resolved: `scripts/discover/check-nasa-feed.ps1` is a superseded research probe that
can make requests without the newer admission ledger. It is **excluded from this
release**, removed only from the generated release-check copy, and preserved in the
owner's working directory. The budgeted `discover:capture` command remains included.
Do not run the old probe to refresh this catalog. The historical source-research
guide now points to the current manual-capture workflow.

The six modified tracked files are:

- `app/(app)/discover/page.tsx`
- `components/discover/discover-view.tsx`
- `lib/sample-data/events.ts` — labels fictional legacy data as samples
- `package.json` — Discover tools and the pinned XML dependency
- `package-lock.json` — matching dependency entry only
- `vitest.config.mts` — generated-build exclusion only

The added code/tooling/tests are confined to `lib/discover/` and the selected
`scripts/discover/` files. No migration, hosting configuration, shared layout,
auth/proxy/store, journal, assistant or privacy change is selected. All of the
owner's paused/uncommitted work stays in place. Do not use blanket staging commands.

## Evidence carried forward

The exact selected runtime/test implementation passed **688 tests in 72 suites**,
full-release ESLint, TypeScript and the full Next 16.4.1 Webpack production build.
The public-only actual-route fixture passed 320/390px checks, pagination and the
corrected noninteractive loading state. These checks were reported in
[release readiness](DISCOVER_RELEASE_READINESS.md) and were not repeated for this
review, which changes only scope/documents. Excluding an unreferenced research
PowerShell probe does not alter those runtime/test results.

Known limits remain: no authenticated browser/physical-iPhone acceptance, no new
hosting-plan/remote-deployment check, and no fresh online source inspection during
this review. Desktop viewport checks are not phone acceptance. NASA remains the
saved November 13 capture; the package does not renew it.

## Approved maintenance decision

The owner explicitly answered **“Yes, manual refresh is fine initially”** on
November 13, 2026. The first release therefore uses manual refresh on request.
No automatic source fetch, scheduler, subscription, key, new account or paid fallback
is part of this release. Stale items leaving current results is accepted behavior;
the decision does not authorize fabricated freshness or incomplete active deals.

The next manual refresh must still inspect the relevant official/publisher pages
and preserve the capture ledger's admission limits for NASA. A request to review,
commit or deploy is not automatically a request to fetch another NASA snapshot.

## Short acceptance checklist

This checklist is **pending**, not a claim that a phone or authenticated session has
been tested. Record device/browser, build/commit, local date/time and pass/fail notes.
Use public Discover content only; no journal, habit or recovery data is needed.

| Check | Expected result | Result |
| --- | --- | --- |
| Open Discover from the authenticated app navigation | Correct page; loading status resolves; no early clickable fallback tabs | Pending |
| Use all three tabs in portrait Safari/Home Screen | Readable cards, working taps, no horizontal scrolling or obscured controls | Pending |
| Filter nearby/trips and free/under-$20 | Unknown prices are not free; empty trip results are honest | Pending |
| Change news interests and load more | Topics change results; pagination adds current stories without duplicate cards | Pending |
| Open one source/article link | Correct direct source opens; return to Discover works | Pending |
| Save a pick, use Saved this visit, then reload | Saved filter works during visit; reload clears it as stated | Pending |
| Background/foreground and check timestamps | View reevaluates freshness; never treats foreground/reload as a source check | Pending |
| Inspect Food deals | No false confirmed-nearby claim; incomplete offers stay under Needs a check | Pending |

The localhost public preview at `127.0.0.1:4324` is computer-only and omits auth. The
deployed baseline does not yet contain this change. Testing that old deployed page
cannot satisfy this checklist. No LAN listener, tunnel, new account or external
preview deployment has been created; a suitable permitted device-access route is
still needed. Do not enter credentials into the public-only fixture.

## Commit versus deployment

The reviewed code is ready for a **Discover-only commit**, once separately authorized.
Use the manifest and the baseline-derived Vitest hunk; verify the staged diff before
committing. Recheck HEAD/hashes first if another chat or developer has changed files.

Before deployment, finish the checklist on this build and evaluate the actual source
clock. Without rechecks, NASA becomes stale November 14 at 1:30 PM Central and the
two current reporting stories at 4:07 PM; outings have their own end/check windows.
Confirmed food deals remain empty. Manual maintenance is now settled; broad automatic
discovery is future work, not an additional implementation prerequisite for this slice.

The owner's original instruction says no commit, push or deployment without separate
authorization. This review supplies the concrete scope for that decision and does not
grant it. Commit authorization would not authorize pushing or deploying.

**Next action:** obtain the explicit scoped commit instruction, then stage/review/
commit only these changes while preserving paused work. Device acceptance and
publication remain separate pending actions.
