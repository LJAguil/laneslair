# Daily Play: hub and account progress

## Publication update

Game hub/sync and chess are now published in `1e7befe` with owner approval; Vercel confirmed deployment. The owner reports 005 and 006 applied. Echoes is implemented locally with review-only 007; see [ECHOES.md](ECHOES.md). The original checkpoint details below describe initial preparation.

## Status

Statistics checkpoint `25c8b8e` was committed and pushed with owner approval; GitHub reported a successful Vercel deployment. Milestone 4 is local and uncommitted. The owner subsequently reported successfully applying migration 005. No remote game SQL or deployment was executed by the agent. The owner confirmed no game tables were added separately. Existing repository schemas contain no game-progress tables. `docs/inspect-games.sql` is an optional read-only metadata check before activation; conflicting names must be inspected, never dropped to force setup.

`/play` is now a compact hub; `/play/rune-lock` is the working game. Old `/play` bookmarks still offer direct play. Today’s existing shortcut/card point directly to the game, and All games returns to the hub. The four main mobile destinations and Today hierarchy remain intact. Chess and Echoes are explanatory text, not fake playable links.

## Stable identity and rules

The published `lib/games/rune-lock.ts` answer algorithm, rune order, parsing, six guesses, hints, local day source and existing storage keys are unchanged. Identity is **game ID + puzzle version + local calendar date + difficulty**: `rune-lock/v1/YYYY-MM-DD/standard`. Local midnight chooses the next puzzle. Travel/time-zone changes can select a different date; a date's answer/history never changes. No server UTC date replaces the device's chosen calendar date. Completed history can be viewed/synced without replay/resetting the same puzzle. No future-date restriction is imposed on imports; this is a casual app, not an anti-cheat competition. PostgreSQL sync accepts Gregorian dates in years 1–9999; unsupported/malformed legacy dates remain local and aren't silently discarded.

The typed catalog lists only implemented games. Milestone 5 now adds Daily chess locally; see [Daily chess](DAILY_CHESS.md). `PuzzleIdentity`/`GameProgressRecord<State>` define the extensible boundary; the Rune Lock `PlayAccountAdapter` and validator intentionally support Rune Lock v1 only. Chess has its own typed codec/transport and review-only migration 006; both games now use the extracted generic sync controller. Echoes still requires its own codec/validation/schema review. Different difficulties keep independent results; future daily streak aggregation must deduplicate solved dates across difficulties, not count each puzzle as a separate day.

Guesses are append-only compatible prefixes. Once solved or exhausted, the guess sequence cannot be extended or cleared. Assistance is monotonic metadata: hint flags are OR-merged and never cleared, including a compatible device's earlier hint arriving after a solve. Rune Lock has one revealable hint, so a boolean fully represents its usage. Hinted solves still count. Optional streaks default off and are derived from solved dates, not stored counters. An unfinished today preserves yesterday's streak; an exhausted today or missed full day breaks it. Account preferences are per game, shared across supported versions/difficulties; device sync consent remains device/account scoped.

## Reviewable migration 005

Review `database/migrations/20261108_005_game_progress.sql` **before** running it. It adds:

- `game_progress`: owned per identity, JSON state, revision and update timestamp.
- `game_preferences`: owned optional streak display and revision.
- `game_write_operations`: private idempotency receipts, with no client read/write access.
- An exact SQL v1 answer/validation implementation plus two authenticated write functions.

All three tables enable RLS. Authenticated clients can select their own progress/preferences only; direct inserts, updates and deletes are revoked. Security-definer RPCs use a locked-down search path and derive ownership exclusively from `auth.uid()` (no user ID parameter). An account-scoped transactional advisory lock serializes imports/submissions/preferences. No existing tables, ownership policies, journal content, tasks, habits or reminders change. No keys, new environment variables, service role or external service is required.

A unique operation ID and matching payload are replay-safe. Reusing an ID for another payload is rejected. Retrying with a new ID is also semantically safe: identical states don't create guesses or advance revisions. Prefix-compatible histories extend to the longer sequence, retaining assistance. Divergent guesses reject the whole day's transaction without replacing either branch. A solved sequence can't be replaced with a different solve. Preference changes use an expected revision; stale differing preferences conflict instead of last-writer-wins. Replaying a confirmed preference request doesn't restore an older preference.

Import consists of independent atomic day writes followed by the preference, not one all-history transaction. A connection failure can leave some days already uploaded, which the UI reports as incomplete; re-preview/retry safely combines those committed days. Receipts and original local data remain intact. This personal-use foundation has no automatic receipt cleanup; review retention before expanding to many users. Reads are paginated, but several read requests aren't one database-wide snapshot. Conflicting changes detected during a write surface for review.

## Explicit import and activation

Before SQL approval and activation, **everything remains device-local**. No game data is uploaded on first render, guessing, or opting into a streak. Preview is the first account read, initiated by the user. Missing setup gives a useful error without changing local history.

After approving/applying SQL and separately approving deployment:

1. Open Daily Play → Preview account import on each device separately.
2. Review device/account day counts, dates, guess counts, hints and any conflicts. No guesses or preferences are written during preview.
3. Choose whether to keep the account's streak setting (default, off if absent) or import this device's setting. Confirm explicitly.
4. The original raw device save is copied once to a separate account-scoped backup key before merging. The existing Rune Lock storage key stays unchanged; neither original history nor cloud branches are deleted. If the device changes after preview, confirmation requires a new preview.
5. On success, this device saves its sync consent and last-confirmed preference baseline locally. New saved guesses/hints/preferences sync automatically, with visible busy/error/last-success states. Opening/focusing the app or Sync now refreshes other-device changes. This is not real-time socket sync or an offline background queue; pending local state retries when the app reopens or you tap retry. Do not close the app until a successful sync if you need immediate transfer.
6. Stop sync on this device disables subsequent automatic sync here. It doesn't delete local/account data or disconnect another device. A request already accepted by the server may finish. Clearing site data loses that device's local saves/consent; confirmed account progress survives and can be previewed again.

Malformed/blocked browser storage is reported and blocks import rather than replacing unreadable data. Divergent branches block the import, even if other days are compatible. Use **Export device copy** and **Export account copy** in the preview to keep both JSON histories. File sharing/downloading behavior needs testing in the installed iPhone app. Automatic branch replacement and file re-import are deliberately not offered; keep playing locally and review any later reconciliation separately. Do not clear storage or manually edit JSON to bypass a conflict.

Authentication is checked when establishing the local account and before each account operation. Account changes clear the visible game context and dispose the old sync controller; reload to initialize the new account. Private progress never enters a service-worker cache, shared server cache, analytics service or game Statistics totals. Statistics still excludes games until meaningful synced metrics are designed.

## Files and boundaries

- `lib/games/catalog.ts`: typed identities/catalog, pure preview and retryable import boundary.
- `lib/games/play-store.ts`: existing local adapter plus compatible merge entry point.
- `lib/games/play-sync.ts`: explicit opt-in, preservation backup, serialized sync, stale-device/conflict handling and preference persistence.
- `lib/data/play.ts`: verified owned reads and RPC transport.
- `components/play/`: compact hub, existing game, preview/import/export controls and provider.
- `app/(app)/play/`: hub and dedicated Rune Lock routes.
- `database/migrations/20261108_005_game_progress.sql`: review-only additive setup.

## Verification and two-device checklist

Automated tests use simulated transport/storage/devices and temporary local PostgreSQL. They are **not** actual Supabase activation, browser interaction or physical-iPhone delivery tests. Final checks passed: `npm test` — **252 tests across 37 files**; `npm run lint` — no errors or warnings; `npm run build` — both `/play` and `/play/rune-lock` included; `npx tsc --noEmit` — passed. Tests also cover date insertion order so imports cannot trigger an endless sync loop. An initial new-test lint issue was fixed before the final clean run.

After SQL review/application and approved deployment:

1. On iPhone and desktop, sign into the same account. Before connecting, confirm existing local guesses/hints/streak settings remain. Open old `/play` links, Today’s shortcut and More → Daily Play; all should reach the game without changing primary navigation.
2. Preview iPhone history. Cancel once and confirm nothing uploaded. Preview again, choose the streak setting and confirm. Close/reopen after success; consent/preference should persist. On desktop, preview and import: compatible older prefixes should gain the longer history and hints, with no duplicate guesses.
3. Play a guess on one device, wait for success, then focus/refresh the other or tap Sync now. Verify attempts and hints transfer. Finish a lock; neither device should reset or add guesses afterward. Check the next local date has a fresh independent puzzle.
4. Test incompatible branches only with a disposable test account/day: make different first guesses while both devices are disconnected. Reconnect; conflict should preserve both branches, block replacement, and allow exporting each copy.
5. Interrupt an import/network request, then reconnect and preview/retry. Already-uploaded days must not duplicate guesses; all unuploaded local days must remain. Don't clear browser storage to test this.
6. Toggle streaks on one device and refresh the other. Test offline preference changes; a competing newer differing revision must request review instead of replacing it. Stop sync on one device; the other should remain connected and local play still work.
7. Sign out and use another account. No prior account's game history should appear or upload. Check touch/keyboard/VoiceOver, preview scrolling/downloads and all themes on iPhone. Restore normal account/settings afterward.

No remote migration, milestone-4 commit/push/deployment or physical two-device test has been performed by the agent.
