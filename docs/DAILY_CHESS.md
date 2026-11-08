# Daily chess — milestone 5

## Status and scope

The owner reports applying migration 005 successfully. Existing milestone-4 files remain in the working tree, uncommitted; this milestone builds on them without resetting or publishing them. No remote SQL, commit, push or deployment was performed for milestone 5. Migration 006 is prepared for separate review. Rune Lock's v1 algorithm, storage keys and all existing history are preserved.

`/play` is a compact hub with two real games: Rune Lock and Daily chess (`/play/chess`). Echoes remains a short planning note, not a fake playable link. Today still opens Rune Lock directly. The primary phone destinations are still Today, Inbox, Tasks and Projects. Other productivity features and Statistics are unchanged.

## Verified dependencies, sources and cost

Checked on **2026-11-08**:

- [Official chess.js documentation](https://jhlywa.github.io/chess.js/) describes version 1.4.0, TypeScript types, browser/Node support, validated FEN loading, legal moves, promotion and checkmate detection. The npm registry reported 1.4.0 and BSD-2-Clause. We installed exactly `chess.js@1.4.0`; it is the only added package. The current Node 26 environment satisfies Next's Node requirement. Chess.js is headless and needs no React peer integration, board library or server engine.
- [Official Lichess database](https://database.lichess.org/#puzzles) licenses the export under CC0 1.0 and documents the first move as **opponent setup**, with the second move beginning the solution. It also explicitly permits any immediate checkmate as an alternative winning move. Only four sample records from that page are bundled, not the full download and not a third-party subset. Source IDs/URLs and source ratings are retained in `pack.ts`; current explanations are original text.
- Two simple composed positions supplement those records: a rook mating net and a queen/rook promotion mate. These positions and explanations are dedicated to CC0 1.0. No game artwork, Lichess logo or copied piece sprites are used; the board uses system chess glyphs with accessible piece names.
- The chess.js copyright/license is retained in [public/chess-credits.txt](../public/chess-credits.txt), linked from the game. Lichess and composed-position credits are there too.

There is **no ongoing API, puzzle-feed or engine-service cost**. No external service is connected. The board, legality rules and content pack run in the browser. Optional sync uses existing Supabase infrastructure; normal project storage/usage quotas still apply. No credentials or environment variables were added. Local persistence is not a promise that the authenticated app loads completely offline.

Installation/audit reported **8 moderate advisories** in existing lint tooling (TypeScript ESLint packages, eslint-config-next and minimatch). Their versions are unchanged from the Git baseline, and chess.js is not in the audit report. No forced dependency upgrades or unrelated configuration changes were made. A pre-existing unrs-resolver install-script notice was not approved/executed as a separate action.

## Frozen v1 content and daily identity

Six puzzles, **two per difficulty**, form an intentionally small verified starter pack:

| Difficulty | Pack index 0 | Pack index 1 |
| --- | --- | --- |
| Beginner | Composed rook mate (`lair-rook-net`) | Lichess `00sO1`, source rating 998 |
| Intermediate | Composed promotion mate (`lair-promotion-net`) | Lichess `00sHx`, source rating 1760 |
| Advanced | Lichess `00sJb`, source rating 2235 | Lichess `00sJ9`, source rating 2671 |

Difficulty is an approximate curated grouping, not a measured user rating; the intermediate promotion puzzle is instructional and shorter than the sourced mate-in-two. The limited pack **repeats every two days** within each difficulty; the UI discloses this. An expanded pack or content correction must use a new version, not change the meaning of saved v1 results.

Identity is `chess/v1/YYYY-MM-DD/{beginner|intermediate|advanced}` using the app's existing device-local date. The stable day ordinal for that DATE chooses an index modulo two; converting the date-only string into a UTC ordinal does not change the displayed local date. Selection has no random state or runtime feed. Leap dates, pre-1970 dates and local midnight are covered. SQL accepts Gregorian years 1–9999. Travel may select a different calendar day; an identity's result never resets. The game’s unsent square/promotion selection clears on date/difficulty change.

Each difficulty keeps independent progress. Difficulty choice persists **on the device, per account**, and is not overwritten by cloud sync. Optional chess streaks count the set of solved dates across all three difficulties: solving several puzzles on one date counts once. Hinted solves still count. An unfinished today preserves yesterday's run; a missed whole date breaks it. Chess permits retries instead of an exhausted-attempt state.

## Move semantics and limitations

The raw source FEN is loaded with chess.js validation, then its setup move is applied once and shown separately as already played. The player color and board orientation come from the resulting position. Each accepted player move is replayed through chess.js; a scripted opponent reply follows automatically, without timers or a live engine. Source SAN move history distinguishes You and Opponent. Canonical solutions always end on a player move.

- Illegal moves leave the board and attempt history unchanged and explain the error.
- A legal move outside the curated line counts as a **legal miss**; the board stays at the tactical position for another try.
- Any legal move that immediately checkmates is accepted as a winning alternative. The generated SQL manifest includes every such move at every canonical player turn. Nonmating alternative lines are **not engine-evaluated**, so the game says it is checking a curated tactic, not proving every other move loses.
- Promotions require explicitly choosing Queen, Rook, Bishop or Knight, with a cancel action. In the promotion puzzle both queen and rook mate; bishop and knight are legal misses. No automatic-queen substitution hides underpromotion choices.
- Castling/en passant are supported by chess.js and tested at the legality boundary; no starter puzzle requires them. There is no homegrown legality implementation or full engine.
- Hints reveal the source square of the next curated move, once per player turn, without consuming a move. Hint events remain recorded. Explanation appears after completion; a separately accepted mating alternative may have a different move from the canonical explanation.
- Solved sequences cannot be reset, extended or silently replaced. The completed board/history remain visible. There is no score penalty, competitive ranking or anti-cheat guarantee.

## Persistence, account sync and review-only SQL

Chess uses the existing typed puzzle identity/catalog and **the same generic sync controller as Rune Lock**. Rune Lock's wrapper retains its exact keys and behavior, covered by its regression tests. Chess-specific codecs, rules, store and transport handle its different state shape.

`lanes-lair-play-chess-v1:{verifiedAccountId}` stores v1 progress locally. Correct player moves are append-only compatible prefixes. Legal misses and hints use unique UUID event IDs; union merges and replay/import deduplicate them. A conflicting event ID or divergent solution branch rejects replacement. Two independently solved promotion branches (queen versus rook) are both valid but deliberately remain a visible branch conflict; neither replaces the other silently.

Default is local-only. **Preview chess sync** reads account state but does not upload it. Review the per-identity preview, choose the account streak preference (default) or this device's preference, then explicitly confirm. The original raw save is backed up before merging. Import is retryable per identity; partial uploads after a network interruption stay committed and later retries won't duplicate moves/events. Exports preserve both copies if review is needed. Enabling chess sync is independent from Rune Lock sync. After enabling, saves sync automatically; focus/reopening or Sync now refreshes other-device changes. Sync is not a real-time socket or a browser-background/offline task queue. Stop sync here does not delete history or disable other devices. In-flight accepted requests may finish.

Every read verifies the current account and filters owner/game/version. Writes use authenticated RPCs deriving the actor from `auth.uid()`, never a user ID supplied in the request. RLS still governs all reads. Account changes clear the visible game context. No private state is sent to a shared server/service-worker cache or analytics feed. Game totals are still excluded from Statistics.

Review [migration 006](../database/migrations/20261108_006_chess_progress.sql) before executing it:

1. It requires the owner-applied 005 schema and widens only the known game/difficulty checks for chess. It does not alter existing Rune Lock rows or policies or replace Rune Lock functions.
2. Existing `game_progress`, `game_preferences` and private receipt tables retain ownership RLS and revoked direct-write access. No new unprotected table is created.
3. New owned RPCs validate v1 puzzle identity, allowed solution prefixes, immutable outcomes and monotonic deduplicated events. Preference writes use expected revisions. Account locks and operation receipts preserve idempotence/conflicts across devices. The generated allowed paths include mating alternatives, so the server cannot be told arbitrary correct moves.
4. SQL validates attempt/hint shape and timing; chess.js additionally verifies legal-miss semantics before sending/accepting account state. PostgreSQL is **not a chess engine** and does not independently prove that a client-supplied miss is legal. This is a private casual game, not trusted competitive telemetry. Malformed account history is surfaced as an error, never silently turned into empty progress.
5. The migration is transactional and review-only. It drops/re-adds only named check constraints, preserving rows; SQL Editor may warn about those constraint changes. Stop on a mismatch instead of deleting anything. Do not rerun 005, drop game tables, use a service-role key or execute remote SQL from the authoring script.

`node scripts/prepare-chess-migration.cjs` is a **local authoring** tool. It validates all FENs/lines, enumerates accepted mates and generates `manifest.json` plus 006 from the template. It has no network/database connection. Its output is tested against the actual game content. Do not regenerate a published version's content in place.

## Verification and physical-iPhone checklist

Automated checks use actual chess.js rules, simulated owned transport/storage/devices, rendered markup and disposable local PostgreSQL. They are not a physical iPhone test or live Supabase activation. Final checks passed: `npm test` — **280 tests across 42 files**; `npm run lint` — no errors or warnings; `npm run build` — includes `/play/chess`; `npx tsc --noEmit` — passed. New local SQL/generator and test-fixture issues found during development were corrected before these final successful checks. Rune Lock’s existing regression suite passes through the shared controller, and its v1 rules file is unchanged. The separate npm audit still reports the 8 existing moderate lint-tooling advisories described above.

After separately reviewing/applying 006 and approving commit/deployment:

1. Open More → Daily Play → Daily chess. Check each difficulty, player color, source setup notation, board coordinates and all themes. Confirm Today still opens Rune Lock and all four primary navigation links stay intact.
2. Tap a piece, then a destination. Try an illegal move and a legal miss; the board must not advance. Play the correct line and watch the automatic reply/history. Reveal a hint; refresh and confirm assistance and progress persist.
3. On a composed-puzzle date (for example **2026-11-09** under frozen v1), check promotion choices: queen and rook mate; bishop and knight remain legal misses. Cancel the chooser without changing progress. For today, use whichever stable puzzle is selected; don't change database records to force test content.
4. Solve a puzzle, refresh and reopen. Solved state must remain. Switch difficulty and back; neither puzzle resets. Solve another difficulty on the same date and confirm the optional daily streak increases only once.
5. Use VoiceOver or a keyboard: one Tab enters the board, arrows move by square, Home/End move within a rank, Enter/Space selects. Piece names, coordinates, selected state, legal destinations and status must be understandable without color. Ensure narrow-screen board/preview controls fit and font zoom remains usable.
6. Preview chess sync on phone; cancel once, then confirm after review. Repeat on desktop. A correct move/hint/miss from one device should appear after the other refreshes. Check original local backups and export behavior. Preference changes should sync; difficulty selection should remain local.
7. Interrupt connectivity during a save/import, then reopen/retry. Existing local moves/events must survive without duplicates. Test divergent promotion branches only in a disposable account/date; both copies should be exportable with no forced replacement. Sign into another account and verify no history leakage.
8. Return the next local day to check rollover. Check Rune Lock guesses/hints/import controls and a task/habit/journal action for regressions. No new push opt-ins or reminders should appear.

No remote migration, commit/push/deployment, live two-device sync or physical-iPhone board test has been performed by the agent for this milestone.
