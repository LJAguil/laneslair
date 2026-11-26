# Entertainment library — local milestone

Updated 2026-11-26. The owner has explicitly authorized the scoped commit, push and deployment; see the [release record](entertainment/RELEASE_2026-11-26.md) for source scope, current checks and acceptance limits. Earlier publication-pending notes below are historical.

Release candidate: committed baseline plus only Entertainment and a bounded Next.js/ESLint patch to 16.4.6. Its isolated locked-dependency checks passed: **769 tests / 87 suites, full lint, TypeScript and production build**. Paused work remains excluded. Authenticated hosted and physical-iPhone acceptance are still unverified; publication authorization does not mark them passed.

Resumed November 26: checkout and hosted schema metadata rechecked; no new publication or SQL execution. [The local hosted-check page](entertainment/HOSTED_CHECK.md) now runs the save/retry/status/progress checks itself after existing-account sign-in, then requires a real browser refresh for final read-only verification. All 30 targeted tests, TypeScript and tooling lint pass; localhost assets return 200. Browser automation is unavailable in this chat, so authenticated hosted and physical-iPhone acceptance remain pending rather than inferred.

Latest checkpoint: [feature-only review, synthetic browser acceptance and authorized database setup](entertainment/REVIEW_AND_ACCEPTANCE.md). HEAD plus only Entertainment passed 758 tests / 85 suites, lint and production build, excluding paused work. Browser fixture checks passed at requested 320/390px widths. Owner-authorized SQL is now applied as `20261122041045_entertainment_library`; hosted metadata confirms owner-only RLS/grants, and a zero-row anonymous Data API probe was denied as expected. Authenticated CRUD/refresh, real auth lifecycle and physical-iPhone acceptance remain pending. No publication occurred.

## Baseline and scope

Verified local HEAD: `ead6c7f` (Discover daily-update preparation), with recent Discover releases and deduction games in history. Read AGENTS.md, current status/roadmap/decisions/chat workflow, navigation, task persistence/form patterns, installed Next.js routing/client-component/data-fetching guides, and the existing mock assistant. Latest coordination documents supersede their older handoffs. Hosting was not independently checked.

The working tree already contained substantial paused privacy/auth/store/journal/assistant work. This milestone leaves those source files and existing coordination documents untouched. The only existing tracked file edited for Entertainment is `components/shell/nav-items.ts`. Sidebar and mobile More consume this registry automatically. No store/provider/layout/auth/mock-assistant/config changes are needed for the feature.

## Using the library

- Open **Entertainment** from the sidebar or mobile **More** menu.
- Add a title and type; defaults are Planned and Normal priority. Expand optional details only when useful.
- Save genre/mood tags, service/platform, estimated session minutes, a short note, last-watched season/episode for shows, and a game progress note.
- Choose Planned, In progress, Finished or Dropped explicitly. Recording progress does not auto-change status or invent completion totals. Show counters mean **last watched**, not next episode.
- Default view: unfinished items grouped into Movies, Shows and Games, with in-progress titles first inside each group; remaining ties sort by title. This combines the owner's requested organization choices.
- Filter by type/status. Archive is reversible and preserves status/progress. Switch to archive view to restore or permanently delete, with confirmation. Status/type filters still apply in archive view.
- Save failures keep the editor and its input open. Retry the same Save action. Cancel, closing the editor or leaving/reloading the route discards an unsaved draft. Drafts and picker preferences stay in memory only; there is no offline write queue or localStorage copy.

## Choosing something

**Help me choose** is explicitly labeled local rules, not AI. It does not call or modify the existing assistant, which remains a local keyword mock.

Eligibility: only unarchived Planned/In progress records from the loaded account library; optional exact media match; known estimated session length no greater than available minutes. Per owner preference, unknown lengths are included by default with a warning that they may exceed the time limit. The checkbox can exclude them. Without a limit, unknown lengths are eligible and labeled. Mood/genre preferences match **any** supplied exact saved tag, case-insensitively, rather than inferring meaning or mood.

Owner preference: **Variety** is the default. Choose for me picks randomly from all eligible titles. Repeats are possible; no viewing history or hidden behavioral profile is collected. Optional priority mode scores `priority × 10 + in-progress bonus`; continuation mode scores `in-progress × 10 + priority`. Ranking ties use title then ID. The separate random action samples the entire eligible pool regardless of ranking. Up to two alternatives include their own explanations. Suggestions never mutate status/progress.

`RecommendationRequest`, `Suggestion` and `Recommender` in `lib/entertainment/model.ts` are the future Jarvis seam. A future adapter can consume only deliberately supplied entertainment items and explicit preferences and return suggestions/reasons. No journal, Inbox, tasks, habits or other records are accessed to build entertainment recommendations. Any real AI provider, transmission, discovery source, API key, account or paid service requires a separate decision. Choosing from this library remains distinct from discovering titles.

No artwork/metadata imports, access/ownership checks, prices, automatic streaming availability assumptions, social sharing or new dependencies are included. Platform/service is the owner's unverified note.

## Persistence and setup — applied with owner approval

Reviewed additive SQL: [entertainment/schema-proposal.sql](entertainment/schema-proposal.sql). The owner subsequently explicitly authorized only this SQL and its new-table grants/policies on the identified project. It was applied once through Supabase as `20261122041045_entertainment_library`; `database/migrations/20261122041045_entertainment_library.sql` is a byte-identical receipt of the actual applied version. The proposal's original review-only comments are retained for hash/evidence continuity. **Do not rerun either artifact or replay older migrations.** No existing permissions or personal records were changed.

Proposal: new `public.entertainment_items` table, UUID identity, auth-user foreign key, bounded field/status/progress constraints, owner/creation index, RLS, explicit authenticated CRUD grants and per-operation ownership policies. UPDATE has both USING and WITH CHECK. Anonymous/public access is revoked. This is ordinary account-owned cloud storage, not encrypted journal storage; database administrators can access it.

The adapter verifies the expected account before and after operations, scopes reads/deletes by owner, and uses an owner-forced stable-ID upsert. A lost save response can be retried without creating another title. Reads page in batches of 500 rather than silently using the default row limit. No optimistic success is displayed. Auth changes clear in-memory records/editor/results, fence late work and require reload. A new route mount fetches saved records again.

Concurrent edits are last successful save wins. There is no multi-device conflict merge or revision history; a stale editor can recreate a title deleted on another device because saves use upsert. Confirm whether conflict detection is worth a separate milestone before heavy concurrent use. No automatic retries occur behind the user's back.

If connection or setup fails, loading shows a recoverable error instead of pretending an empty library was loaded. The table now exists and the Data API recognizes it; an anonymous zero-row request was correctly denied (401 / 42501). No authenticated hosted refresh-persistence claim is made from synthetic or anonymous tests alone.

Next, use invented titles for authenticated hosted acceptance and the phone checklist below. Do not replay existing migrations, activate privacy proposals or change additional settings as an incidental setup step. The executed SQL's table/index/constraint/policy/grant metadata and migration version were verified without reading personal row contents. No synthetic records were inserted remotely in this setup pass.

Documentation consulted: [Supabase changelog](https://supabase.com/changelog.md), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [JavaScript inserts](https://supabase.com/docs/reference/javascript/insert). Supabase skill read; synthetic behavior tests used disposable PGlite. After explicit authorization, hosted schema metadata and a zero-row anonymous Data API probe were also verified as recorded in the review.

## Feature files / publication allowlist

Only these paths belong to this milestone:

- `app/(app)/entertainment/page.tsx` — verified-account route with Suspense for runtime cookies/data.
- `components/shell/nav-items.ts` — one Entertainment destination and icon import.
- `components/entertainment/entertainment-view.tsx` — library, editor, progress, filters, archive and delete.
- `components/entertainment/picker.tsx` — explicit preferences and transparent suggestions.
- `lib/entertainment/model.ts` — types, normalization, grouping, filtering and recommendations.
- `lib/entertainment/repository.ts` — isolated Supabase adapter.
- `lib/entertainment/session.ts` — confirmed state, retry handling and account fences.
- `lib/entertainment/{model,repository,session,sql,ui}.test.ts` — synthetic coverage.
- `docs/entertainment/schema-proposal.sql` and this guide.
- `docs/entertainment/REVIEW_AND_ACCEPTANCE.md` — feature-only evidence and concrete database approval scope.
- `database/migrations/20261122041045_entertainment_library.sql` — exact receipt of the owner-authorized, already-applied remote migration; do not rerun.
- `scripts/entertainment/hosted-check/` and `docs/entertainment/HOSTED_CHECK.md` — local-only authenticated acceptance tooling/runbook; no production route imports it.
- `docs/entertainment/RELEASE_2026-11-26.md`, `package.json` and `package-lock.json` — authorized release evidence and bounded framework/lint patch.

This is an allowlist for future review, not permission to publish. Do not stage the whole checkout. Paused privacy/auth/store/journal/assistant changes and unrelated Discover/coordination work must remain excluded. The ignored `build/entertainment-validation` copy is a local verification artifact containing the broader working tree, never a release source or deployment artifact.

## Checks actually run

- Full working-tree `npm test`: **839 tests / 99 files passed** before the final organization preference. Final Entertainment tests: **19 tests / 5 files passed**, including that added grouping case.
- Full `npm run lint` passed; final changed-source ESLint and `npx tsc --noEmit` passed after preference changes.
- PGlite applies only this proposal to a disposable synthetic auth schema. Tests exercise CRUD, progress constraints, owner isolation, reassignment denial, guessed-ID upsert denial, anonymous denial and archive/restore/delete.
- Adapter/session tests cover account checks, late reads/writes, failed reads, retained confirmed state/input, stable-ID response-loss retry, double submissions, delete failure, reload reconstruction, read pagination failure and development Strict Mode restart.
- Filtering/recommendation tests cover all statuses, progress preservation, archive/type/time/tag eligibility, unknown estimates, ranking and random-pool boundaries. Static React rendering checks picker labels and explicit numeric/mobile preferences. These are not interactive-browser checks.
- Production build: **isolated `npm run build` passed (exit 0)**, including partially prerendered `/entertainment`. All seven product source files matched that successful copy by SHA-256 at that checkpoint. The original root build hit EPERM cleaning old nested `.next` output; existing artifacts were not manually removed. The isolated copy uses a dependency junction, synthetic build-only Supabase environment values and a fresh `distDir` in its copied config; the root config remains unchanged. No credentials were copied. Earlier sandboxed retries hit a Turbopack CSS-worker process error. Initial isolated builds exited at Next.js's security advisory for installed 16.4.1; the final retry passed while still emitting the advisory. A security upgrade is recommended by that diagnostic and needs a separately scoped maintenance decision; no dependency upgrade was made. The isolated nested-copy workspace-root warning remains a validation-harness limitation.
- Owner follow-up: unknown session lengths now default to included, with an explicit may-exceed-time warning. All 19 Entertainment tests, TypeScript and changed-file ESLint passed again. The production build above predates this small default/copy adjustment; it was not repeated for this follow-up.

## Acceptance still needed

Synthetic interactive browser acceptance is now recorded in [the review](entertainment/REVIEW_AND_ACCEPTANCE.md); this uses fixtures and does not establish actual authentication/database behavior. No authenticated Next browser, physical iPhone or authenticated hosted CRUD acceptance has been performed. With synthetic records against the applied schema:

1. On installed iPhone, navigate via More; add one movie, show and game. Confirm title/type quick entry, optional detail expansion, 16px inputs, keyboard toolbar, caret behavior, modal scrolling and save/cancel reachability at 320/390px portrait and landscape.
2. Set show season/episode and game progress; transition each status, refresh and verify exact saved state. Confirm grouping and in-progress ordering, all filters, empty results and archive/restore/delete confirmation.
3. Disconnect before saving, verify input remains, reconnect/retry and refresh to confirm one title. Repeat an interrupted response; ensure no duplicate identity.
4. With two invented accounts, verify empty separation, sign-out/account switch during read/save, no previous library/editor/suggestions, and fresh mount reads only the active account. Confirm this also works against the committed auth baseline before a feature-only release.
5. Test time limits, exact tags, default unknown-length inclusion/warning and exclusion toggle, excluded finished/dropped/archived titles, default variety, explanations, alternatives and repeated random picks. Confirm no API/provider calls from picker actions.

## One handoff for Overview & Roadmap

**Milestone:** Entertainment manual library + local chooser implemented locally on verified `ead6c7f`, with feature paths isolated above. Owner choices incorporated: media grouping with in-progress first, variety-first suggestions and unknown lengths included with warning. Owner-authorized additive SQL was applied as `20261122041045_entertainment_library`; hosted ownership metadata and anonymous Data API denial verified. Paused work remains preserved and excluded; no commit, push, deployment, external sharing, existing-permission change or real-data migration.

**Checks:** newer feature-only checkpoint supersedes the earlier mixed-tree limitation: committed `ead6c7f` plus only Entertainment passed 758 tests / 85 suites, lint and production build with final preferences. All 393 baseline tracked files were audited (only the allowed nav delta); product source/SQL match. Synthetic browser flows passed at requested 320/390px widths. No hosted-auth/database or physical-device acceptance inferred. Next.js still emits its security advisory; no upgrade performed.

**Next bounded task:** sign in on the [local hosted-check page](entertainment/HOSTED_CHECK.md), run the invented-record checks, refresh and verify, then resolve actual failures. Hosted checks are prepared, not yet passed. Review the previously reported Next.js advisory and choose a separately approved delivery path for installed-iPhone acceptance before publication. See [setup evidence and remaining acceptance](entertainment/REVIEW_AND_ACCEPTANCE.md). Commit/push/deployment remain separately gated. Do not resume privacy work or activate Discover jobs as part of it.

**Decisions:** all three organization/picker preferences and the scoped database setup are approved. Decide separately how to address the build-reported Next.js security upgrade and when to authorize publication. External metadata/discovery and real Jarvis integration remain later milestones, not current setup requirements.
