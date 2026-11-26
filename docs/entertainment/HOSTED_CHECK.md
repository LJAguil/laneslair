# Authenticated Entertainment acceptance

Prepared 2026-11-21. **Hosted CRUD/refresh is pending an existing-account sign-in.** No credentials belong in chat, logs or this document. No new account, signing key, service-role access, SQL, schema change or deployment is needed.

## Resumed checkpoint — 2026-11-26

Local HEAD remains `ead6c7f`; paused work is preserved. The connected project's table/migration metadata was rechecked: `entertainment_items` exists with RLS enabled, and `20261122041045_entertainment_library` is recorded. No SQL was replayed or personal row contents requested.

The local page now includes an automated, explicitly started hosted check. In your desktop browser:

1. Open `http://127.0.0.1:4178` and sign in with your existing account if needed. Enter credentials only on that page.
2. Click **Run hosted checks** once. It writes three invented titles, cycles show statuses while checking progress, tests pre-write failure and lost-response retry, archives/restores the game, then reads back exact values through a fresh repository session. Watch the seven result lines; any failure stops further steps. No record is deleted.
3. Once the save/retry checks pass, refresh the browser tab. Click **Verify after page refresh** for a read-only comparison against the saved synthetic expectations. The button is disabled until the document's `performance.timeOrigin` changes; a library remount or module hot update does not count as a page refresh.
4. Report the displayed pass/fail result, without credentials, session information or personal records. The manual checks below remain useful for editor and phone behavior.

The runner uses the production repository and LibrarySession. Expected data and progress are synthetic; only known test IDs and a receipt of invented expected fields are kept in this tab's sessionStorage. Tokens/passwords/user IDs are not part of that receipt. Changing account/view stops the runner before further operations, fences late results and clears its manual-control busy state. The normal library controls are disabled during the automated run to avoid overlapping mutations. Test titles remain for inspection afterward; cleanup is a separate explicit action.

On 2026-11-26, **30 tests / seven suites**, project TypeScript and tooling ESLint passed. Tests exercise the orchestration, failure detection, response-loss retry, cancellation, ownership mismatch, exact refresh comparisons and refusal to count same-page verification. A read-only HTTP probe confirmed the page, main module, runner/panel/client modules and CSS return 200. Browser automation is unavailable in the resumed chat, so no new interactive-browser or authenticated hosted pass is claimed. The owner must run the steps above. Production source was unchanged; the production build was not repeated for this local-only tooling.

## Local test page

Run from the repository root:

```powershell
node scripts/entertainment/hosted-check/serve.mjs
```

Open `http://127.0.0.1:4178`. The server binds only to loopback. It reuses the existing public Supabase URL/publishable key, and requires CSS from the successful ignored `build/entertainment-feature-only/.next` build. It copies only compiled CSS/font assets into ignored `build/entertainment-hosted-check`, never credentials. If a local sandbox blocks sockets, authorize only the bounded local server process. Do not bind to a LAN/public address or open firewall permissions as an incidental workaround.

This page uses the real Entertainment view, session/model and production repository, with a test-only browser-client fetch guard. It deliberately avoids the ordinary app shell/store and Next sign-in redirect so no Journal, Inbox, habits or tasks are loaded.

The guard only permits the approved Supabase origin, ordinary existing-session Auth endpoints, and `entertainment_items`. Reads add an ID filter for this tab's test UUIDs while preserving the production owner filter. Writes require titles starting **`[Entertainment test] `** and valid UUIDs; deletes must target known test IDs. Unrelated tables, RPCs, account creation and account-management endpoints are blocked. Supabase RLS remains authoritative; this harness adds a test data boundary, not authorization.

Only synthetic IDs and the automated run's invented expected-field receipt are retained in tab sessionStorage for refresh; entertainment records persist through the actual Data API. Auth uses the existing Supabase browser-session/cookie mechanism. Password fields are uncontrolled, reset after submission, and not logged; user identity, email, keys and tokens are not displayed in acceptance results. Close the tab and stop the server after completion. Do not copy sessions into test scripts or use SQL impersonation as a substitute for actual sign-in.

## Run after the owner signs in

1. Verify the page says **Existing account signed in** and only scoped test titles are shown. An empty test library is expected on a fresh tab even if the account has personal entertainment records.
2. Add `[Entertainment test] Copper Observatory` as a show, In progress, season 2 / episode 4, cozy/mystery tags and an invented note. Add a movie and game with the same prefix and invented details.
3. Refresh the browser and verify the exact show/game progress, notes, status, tags and session estimates. This is the hosted-refresh acceptance that fixture sessionStorage tests cannot establish.
4. Click **Fail next test save** before editing. Save and confirm the editor retains all input and only displays an error. Retry and refresh; confirm one saved title.
5. Click **Lose next test response** before a new prefixed title. The real write succeeds but the harness discards the response and reports a failure. Retry the same editor, refresh and confirm exactly one title. This injects a response fault; it is not a physical network disconnect test.
6. Exercise status/type filters, grouping, archive/restore, time/tag preferences, default variety, unknown-length warnings/exclusion and alternatives against those invented records.
7. Test a real local-session sign-out/account change only through the existing normal Auth path, with any second **existing** account available. Do not create a test account or change auth settings without a separate decision. If unavailable, record real multi-account acceptance as pending rather than inferring it from local synthetic tests.
8. Archive the invented titles at the end. Confirm cleanup scope with the owner before permanent deletion; never remove personal titles or broad owner-scoped rows.

Record actual pass/fail results in [REVIEW_AND_ACCEPTANCE.md](REVIEW_AND_ACCEPTANCE.md), distinguishing this guarded Vite page from the real Next route/cookie/shell lifecycle. No hosted result is claimed until observed.

## Physical iPhone work

This loopback desktop page is not reachable as the installed iPhone app. Physical acceptance remains pending until a separately approved delivery path exists; do not deploy, expose the localhost server or create a tunnel as part of this test.

When the feature is available through an approved path, use the main feature guide's invented-record checklist: More navigation, portrait/landscape, keyboard/caret behavior, dialog scrolling/save reachability, refresh, connection loss/retry, progress/status, archive/restore and picker explanations. Desktop 320/390px checks do not establish Safari keyboard/PWA behavior.

## Preparation checks

Guard coverage verifies scoped read filters, blocked unrelated destinations/tables/RPCs/account creation, allowed ordinary Auth, synthetic-title/UUID restrictions, unrecognized-delete rejection and failures before/after a write. TypeScript and changed-tooling ESLint are required alongside these tests. The earlier product production build remains the product evidence; this tooling is not imported by any production route.
