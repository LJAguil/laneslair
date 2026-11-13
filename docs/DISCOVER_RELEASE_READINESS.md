# Discover release readiness — November 13, 2026

**Final review complete:** see [release review and acceptance checklist](DISCOVER_RELEASE_REVIEW.md).
Manual refresh on request is owner-approved. The final manifest excludes the retired
research probe (51 code/tooling/test files); the earlier 52-file build audit below is
retained as historical evidence. No commit or publication is authorized yet.

**Status: ready for final scoped commit review. Deployment still needs authenticated/
physical-phone acceptance, release-time freshness review and separate authorization.**
Local Git HEAD remains `8d4a84d`. No index changes, commit, push or deployment occurred.
All paused privacy/auth/store/journal/assistant work remains preserved and excluded
from the proposed release.

## What changed this stage

The packaged NASA bundle is now explicitly selected in the local server entry with
its independently pinned digest. Validation runs after `await io()` using the actual
clock. No source request occurs on build/render. The bundle still carries its real
November 13, 1:30 PM Central check, metadata-only summaries, unknown article access
and institutional-update labels. Candidate editorial records retain their own dates.

A mobile check caught an early-interaction problem: the interactive Suspense fallback
could accept a tab click that was lost when the streamed view replaced it. The route
now uses a noninteractive loading section with the partial-check note and accessible
status. A regression test covers the lack of premature controls. Browser inspection
observed that loading state followed by a successful News selection and loaded feed.

The selected view has six main outings, twelve main news items (ten NASA and two
reporting stories), and zero confirmed nearby deals at inspection. Both incomplete
offers and the disputed venue remain under “Needs a check.” Coverage is still narrow;
this release would be a manually maintained first version, not comprehensive automatic
local/news/deal discovery.

## Final verification

An isolated directory was reconstructed from **Git HEAD**, then overlaid with only
the selected Discover runtime/tooling/tests and dependency changes. It did not copy
the paused working-tree layout, auth, store, proxy, journal, assistant or privacy
changes. The baseline `.env.example` template is present; no actual environment file
or credential was copied. Child checks received an explicit system-variable allowlist,
without Supabase/application credentials. No authenticated session or personal records
were accessed. SQL-related baseline tests use invented local test data, not remote SQL.

| Check | Result |
| --- | --- |
| Discover tests in release set | 336 passing |
| Full proposed release tests | **688 passing across 72 suites** |
| Full proposed release ESLint | Passed |
| Project TypeScript / changed-file lint | Passed |
| Full proposed release production build | **Passed**, Next 16.4.1 Webpack, baseline Cache Components/Partial Prefetching configuration |
| Public-only build of actual Discover route | Passed, partial prerender with streamed supplemental content |
| Mobile browser widths | 320/390px; document/available widths both 310/380px, no horizontal overflow |
| News pagination | 4 → 8 → 12 main cards |
| Browser warnings/errors | Zero |
| Release file hashes | 52 selected runtime/tooling/test files match the audited tree |

The first credential-free build failed downloading existing Google Fonts within the
sandbox. The approved outside-sandbox build succeeded with the same sanitized child
environment; the final build also passed after the loading fix. Nested lockfiles
produced a workspace-root inference warning in the reconstructed directory. No
production config change was made to suppress that test-directory warning.

The initial release test identified one omitted dependency: Discover's existing
`Sample:` labels in `lib/sample-data/events.ts`. Its small, public-content-only hunk
is included. Generated release-check copies also exposed duplicate test discovery,
so `vitest.config.mts` adds `build/**` to exclusions. Only that new exclusion belongs
to this release; the working tree's preexisting worker-limit hunk stays excluded.
The final 688-test pass includes both corrections and the loading regression test.

Evidence: [file/hunk manifest](discover/RELEASE_SCOPE_2026-11-13.json),
[readiness summary](discover/RELEASE_READINESS_2026-11-13.json).
Generated release input/build outputs remain ignored under
`build/discover-release-readiness-20261113/`; public route fixture output remains
under `build/discover-next-loader-check/.next-selected-integration/`. The main
application's existing `.next` was not cleaned or used for these checks.

## Exact commit boundary

The manifest lists hashes for the Discover route/view, all `lib/discover/` files,
`scripts/discover/` tools, package/lock changes, sample-event labels and the selected
Vitest exclusion. Package diffs contain only Discover scripts and the pinned MIT
`@xmldom/xmldom` 0.9.12 dependency. No other dependency change is proposed.

Include Discover guides/evidence as the associated documentation; the manifest lists
those documentation paths separately. Do not stage all uncommitted files. In
particular, exclude `app/(app)/layout.tsx`, auth, proxy, stores, journal, assistant,
privacy code/SQL/docs, current `next.config.ts` edits, and the preexisting Vitest
worker-limit hunk. Preserve those files/hunks locally. Review the staged diff only
after commit/staging is authorized; no Git index operation has been done here.

This is the first full build of the proposed Discover release against the reported
deployed baseline, rather than a certification of the entire mixed working tree.
Remote deployment/branch state was not queried; recheck local HEAD and any remote
release changes before eventual publication.

## What remains before commit and deployment

1. **Commit review:** review the explicit file list and mixed Vitest hunk, then
   separately authorize the Discover-only commit. No further major feature work is
   needed for this bounded manually maintained version.
2. **Authenticated/iPhone acceptance:** test Discover navigation, tabs, scrolling,
   source links, filters, visit-only bookmarks, reload and foreground behavior using
   public catalog content. Check Safari/Home Screen layout and loading. No journal,
   habit, credential or recovery data is needed. A desktop narrow viewport and a
   credential-free full build do not establish this result.
3. **Release content/maintenance:** explicitly accept manual refresh on request or
   name a sustainable curator/cadence. NASA becomes stale November 14 at 1:30 PM
   Central; selected reporting becomes stale at 4:07 PM, and outing checks have their
   own deadlines. Release time cannot reset those clocks. Recheck selected sources
   when needed, or accept honest empty/stale sections. Local food participation and
   full terms remain incomplete; do not advertise confirmed deals.
4. **Publication:** separately authorize push/deployment of the reviewed Discover
   commit. No migration, new account/service, key purchase or paid plan is required.
   Existing hosting quotas/plan have not been newly verified here; no automatic
   refresh, paid fallback or overage path was introduced.

## Overview & Roadmap handoff

**Completed:** local NASA selection, lifecycle/request-free validation, loading fix,
clean release-scope reconstruction, full tests/lint/build and narrow-screen checks.
The earlier isolated-build/full-build uncertainty is now closed for this exact
proposed release set. Authenticated and physical-device acceptance remain open.

**Sources:** official Ruston event listings, manually reviewed Illuminator/Stateline
reporting and the saved official NASA metadata bundle. No online source inspection
or new NASA request occurred this stage. Fast-food offer uncertainties remain visible.

**Next bounded task:** final scoped diff review and authenticated/phone acceptance
within the owner's permitted scope, then request explicit commit/publication
authorization. Keep manual maintenance and release-time freshness explicit; this
does not require another artifact/ingestion implementation stage.

The public-only [localhost route preview](http://127.0.0.1:4324/) is retained for
desktop review. It excludes authentication and is not a physical-phone test target.

![Selected feed at 390px](discover/DISCOVER_SELECTED_390_2026-11-13.png)
