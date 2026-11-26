# Entertainment setup review and synthetic acceptance

Started 2026-11-21. Local readiness and authorized hosted setup record; later checkpoints supersede the earlier authority/status statements.

## Publication authorization — 2026-11-26

The owner subsequently explicitly instructed **“Commit and deploy.”** The [scoped release record](RELEASE_2026-11-26.md) covers the candidate, exclusions and current checks. HEAD plus only Entertainment and the Next.js/ESLint security patch to 16.4.6 passed 769 tests / 87 suites, lint, TypeScript and production build on isolated locked dependencies. Authenticated hosted and physical-iPhone checks remain unverified; this new authorization permits publication without claiming those checks passed. No additional SQL or paused work is authorized by this release.

## Resumed work — 2026-11-26

Verified HEAD remains `ead6c7f` and existing paused changes remain preserved. Fresh Supabase metadata confirms the Entertainment table with RLS and the previously applied migration; no SQL was replayed and no row contents were inspected.

The [hosted check page](HOSTED_CHECK.md) now runs save/retry/status/progress/archive/readback checks on demand and offers a separately gated read-only verification after an actual document refresh. It uses production repository/session code behind the same synthetic-ID and endpoint guard, stops at failures/account changes, does not mutate unrelated records and performs no deletion. No new provider, key, account, dependency or production route was added.

Actual fresh results: **30 tests across seven suites passed**, project TypeScript passed, changed-tooling ESLint passed, and localhost page/module/CSS requests returned HTTP 200. The server is loopback-only. Browser control is unavailable in this resumed chat, and no authenticated hosted records were written or checked here. The displayed runner results remain pending until the owner signs in and explicitly starts it. These preparation tests are not a hosted pass. Existing production-build and narrow-browser evidence below is historical and was not rerun for this local test tooling.

Next: owner signs in on the desktop local page, runs the hosted checks, refreshes and verifies; resolve any actual failures. Then address the previously reported Next.js advisory and select an explicitly approved delivery path for physical-iPhone acceptance. Commit/push/deployment, additional SQL, tunnels/LAN exposure, new accounts and privacy work remain outside this checkpoint.

## Authorized database setup — completed

After reviewing the concrete scope, the owner explicitly replied **“Yes I authorize it”** to applying only the reviewed Entertainment SQL, including its new-table grants/policies, to LJAguil's Project (`wbkeczowdtdysdytbhfx`).

Before execution, rechecked table absence and artifact SHA-256 `9e0614f728be1b50d48f5ad995b55a4d2bfd05a13e8730e6a52e954f45a1485a`. Supabase `apply_migration` successfully applied that exact SQL as **`20261122041045_entertainment_library`** (UTC 2026-11-22 04:10:45). A byte-identical local receipt is saved at `database/migrations/20261122041045_entertainment_library.sql`, using the actual remote migration version rather than inventing a new version. The proposal remains unchanged as the reviewed artifact. **Do not run either copy again or replay older migrations.**

Hosted verification queried schema metadata only and confirmed:

- New table and its primary key, owner/creation-time index, auth-user foreign key and all reviewed constraints exist.
- RLS is enabled; SELECT, INSERT, UPDATE and DELETE are restricted to authenticated owners. UPDATE includes both ownership predicates.
- `anon` has no SELECT/INSERT/UPDATE/DELETE privileges; `authenticated` has exactly those intended CRUD privileges, subject to RLS.
- The existing public client configuration's Data API recognizes the table and rejects an anonymous **zero-row** SELECT with HTTP **401**, SQL code **42501**, as expected. No session/token was loaded or persisted by this probe, no row contents were returned, and no record was inserted.
- The security advisor returned no Entertainment-specific finding. It did return unrelated project-wide notices for existing RPCs/tables and auth configuration; none were changed. Relevant documentation: [security-definer RPC review](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). This is not a general security audit or authorization to resume paused work.

No older migration, existing permission, personal record, auth setting, dependency, commit, push or deployment was changed. Authenticated Data API CRUD/ownership lifecycle, refresh persistence and physical-iPhone acceptance remain pending. The successful anonymous probe establishes table visibility and denied anonymous access, not authenticated acceptance.

The pre-approval review below is retained as historical evidence; its table-absence and pending-authorization statements describe the checkpoint before the execution above.

## Feature-only validation

Follow-up preparation: [guarded hosted acceptance page and runbook](HOSTED_CHECK.md) now use the actual Entertainment component/repository with only ordinary Auth endpoints and this tab's synthetic Entertainment IDs allowed. The page loads locally at `http://127.0.0.1:4178`; the browser currently requires the owner to sign in with an existing account. All 24 Entertainment/tooling tests across six suites, project TypeScript and changed-tooling ESLint passed. No hosted records have been written by this preparation pass. The production build was not repeated for this unimported local tooling. Physical-iPhone delivery is still separately gated; no tunnel/LAN exposure/deployment was introduced.

Created ignored `build/entertainment-feature-only` from `git archive HEAD` at `ead6c7f`, then overlaid only the Entertainment file allowlist in [the feature guide](../ENTERTAINMENT.md). This is a source snapshot, not a branch, commit or deployment. No environment files or credentials were copied. Build uses invented Supabase URL/key values only.

Audited all **393 tracked baseline files**, allowing only the navigation change and Windows CRLF/LF normalization; all other baseline contents match HEAD. All seven product source files and the SQL proposal match the working copy exactly. Paused-only account-boundary, assistant-context, privacy-lab, encrypted-data and privacy implementation paths are absent. No paused code is needed to compile or test Entertainment.

Results on this feature-only copy, including the owner's final unknown-length preference:

| Check | Actual result |
| --- | --- |
| `npm test -- --maxWorkers=4` | 758 tests / 85 suites passed, including all 19 Entertainment tests |
| `npm run lint` | Passed |
| `npm run build` | Passed, exit 0, including TypeScript and `/entertainment` |
| First build attempt | Compiled, typechecked and generated routes, then exited at Next.js security advisory; same-command retry passed while retaining advisory |
| Snapshot audit | 393 baseline files checked; allowed nav delta only; current feature/SQL match |

The nested source copy emits a multiple-lockfile/workspace-root warning. Its successful build used the committed Next config unchanged. The installed Next.js 16.4.1 reports a known security vulnerability and recommends an upgrade. No dependency change, upgrade command or new worktree was initiated. This advisory needs a separate maintenance decision before publication; a successful build does not resolve it.

## Interactive browser results

Used `build/entertainment-preview`, an ignored localhost-only Vite harness, with the actual Entertainment components/session/model. Supabase repository and browser auth imports are replaced by explicit fixture modules. Compiled project CSS is reused; native dialog and form controls are real browser controls. Strict Mode is enabled.

The harness visibly states that it has **no Supabase, real account, personal records or Next auth route**. Its invented fixture records use test-only sessionStorage so browser refresh can exercise reconstruction; this is not a test of hosted persistence. No network call to Supabase or an AI/metadata service is possible through the fixture adapter. The localhost server was stopped after testing. No synthetic fixtures are added to production routes.

Observed outcomes:

| Interaction | Result |
| --- | --- |
| Default library | Movies/Shows/Games groups; in-progress movie before alphabetically earlier planned movie; finished fixture excluded |
| Media/status filters | Shows-only and Finished views rendered their matching items |
| Show creation | Invented title, In progress status, tags, last-watched season 2 / episode 4 and note saved |
| Save failure before write | Editor stayed open with exact title/tags/counters/note; error shown; retry succeeded |
| Refresh after successful retry | Show and exact saved progress/note reappeared in the fixture library |
| Lost response after write | Game editor kept title/progress; retry and refresh displayed exactly one title |
| Game status | Planned to Finished retained the game progress note and appeared under Finished |
| Archive / restore | Finished game's status/progress survived both actions |
| Delete | Cancel retained title; confirmed deletion removed only the invented archived game and displayed success |
| Read failure | Error screen disabled Add and offered Retry; allowing fixture reads then retrying restored the library |
| Time limit | Ten-minute limit included only an unknown-length eligible movie with the explicit may-exceed-time warning; unchecking unknown lengths gave no matches |
| Tags / variety / alternatives | Thirty-minute cozy pool showed four eligible items, explicit explanations and two alternatives; Variety was selected by default |
| Account-change event | Records, picker and suggestions immediately disappeared; Add disabled; reload-account message appeared |
| Second fixture account | Opened empty; its invented new movie did not appear when the first account was reopened |
| Requested 320px width | No page overflow: content/scroll width both 310px after browser scrollbar. Expanded editor input font 16px; dialog width 278px, scroll width 267px. Cancel remained reachable through normal dialog scrolling |
| Requested 390px width | No page overflow: content/scroll width both 380px after scrollbar. Editor save/retry, picker, warning, alternatives and cards usable |

Screenshots were inspected at 320px and 390px. Browser viewport override was reset afterward. No physical Safari keyboard, installed-PWA navigation or real sign-in/cookie flow was exercised; those remain acceptance work.

## SQL review and exact approval scope

Review artifact: [schema-proposal.sql](schema-proposal.sql).

SHA-256: `9e0614f728be1b50d48f5ad995b55a4d2bfd05a13e8730e6a52e954f45a1485a`.

Connected project metadata identifies **LJAguil's Project**, project ref `wbkeczowdtdysdytbhfx`. The existing app's public Supabase URL has that same project host. Public-schema table metadata confirms `entertainment_items` is absent. Only project/table metadata and the public URL were inspected; no personal row contents, keys or tokens were requested. No remote SQL was executed.

The proposed transaction only:

1. Creates `public.entertainment_items` with a supplied UUID primary key, owner foreign key, manual metadata/progress fields and bounded checks.
2. Creates the owner/creation-time index.
3. Enables RLS; revokes public/anonymous access to the new table and grants authenticated CRUD on it.
4. Adds owner-only SELECT/INSERT/UPDATE/DELETE policies. UPDATE has both USING and WITH CHECK. No security-definer function, view or cross-table data read is introduced.

Disposable PGlite tests verify ownership separation, denial of owner reassignment/guessed-ID cross-account upsert/anonymous access, progress constraints, identity retries and deletion. This is not hosted policy verification.

Known first-version tradeoffs remain: ordinary readable cloud data, last-save-wins editing, and stable-ID upsert can recreate an item removed by another device while an old editor remains open. No encryption, offline queue, multi-device merge or automatic metadata lookup is promised. These do not authorize changes to paused privacy work.

**Required next authorization:** applying exactly this reviewed additive SQL to the identified existing project, including grants/policies only for the new table. This is required by the owner's original explicit prohibition on production SQL and permission changes without separate authorization. It is not an approval inferred from “begin working on the next steps.”

Any approval is separate from running older migrations, changing existing permissions, deploying the app, committing/pushing, creating accounts or migrating real records. Recheck table absence and SQL hash at execution time; if either differs, stop and review rather than replaying or altering existing schema. After approved setup, verify new-table metadata/policies/grants and intended Data API exposure before authenticated invented-record and installed-iPhone acceptance. No broad migration command is appropriate.

## Remaining acceptance

- Hosted account-owned CRUD, response-loss retry and refresh persistence through the actual Supabase Data API.
- Existing committed sign-in/sign-out/cookie lifecycle, including an account change during actual in-flight requests; synthetic/unit fences do not establish that full flow.
- Physical installed iPhone: More navigation, keyboard/caret behavior, modal scrolling and action reachability, orientation, all status/progress/filter/archive/picker flows.
- Feature-only publication review after a separately scoped Next.js security maintenance decision. No publication action is authorized by this checkpoint.
