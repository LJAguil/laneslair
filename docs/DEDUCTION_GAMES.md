# The Casebook and The Labyrinth

Owner approved commit and publication on 2026-11-13 after reviewing the local
implementation. No production data access, SQL, paid service, game dependency,
AI content feed, or permission change. Paused
privacy work and the original checkout's uncommitted journal/assistant improvements
remain untouched. This work uses the existing isolated `a8ee` checkout. Before
publication it was fast-forwarded from `8d4a84d` to the already-published Discover
checkpoint `396a7d4`; no game files overlapped and the Discover update is preserved.

## Product scope

The Casebook is the new featured game on Today and the first game in Daily Play.
The Labyrinth is a separate route-drawing game alongside it. Rune Lock, chess and
Echoes keep their existing routes, rules, progress keys and optional sync.

- **Casebook:** Match four people with four rooms, objects and arrival times.
  Three labelled grids support exclude/match/erase, automatic row/column exclusions,
  crossed-off clues, the last 100 grid edits, optional match reveals and explicit
  full-case checking. Reveals are recorded and survive undo/clearing notes.
- Normal mixes identity, exclusion, order and adjacency clues. Hard removes direct
  identity clues; its difficulty is a rule difference, not a measured human rating.
  The clock statements refer to four distinct 15-minute arrival slots. Before means
  any earlier slot; adjacency means exactly 15 minutes in either direction.
- **Labyrinth:** Trace a non-repeating orthogonal route from S to E, visiting 1 then
  2 and satisfying exact row/column square totals. Totals include endpoints and
  checkpoints. Tap, drag or keyboard activation works; backtrack, undo, clear and
  optional next-step reveals are available. A reveal may replace a wrong turn and
  retains the previous route in undo history. Completion locks the finished route.
- Normal is 5×5; Hard is 6×6. Targets show used/required and an exclamation mark on
  overfilled rows/columns. Touch targets stay at least 44px; very narrow screens
  can scroll the board horizontally. The detective grids fit without horizontal
  page scrolling and have links between the grid and clues on phones.
- Each game/difficulty has a daily puzzle and separate numbered practice puzzles.
  Practice is scoped to the current local day. The selected practice number and
  difficulty are session choices; revisiting a matching identity restores its saved
  moves. After reload, the game opens the Normal daily puzzle. Midnight switches
  an open view to the new local day while preserving the previous saved identity.
- There are no timers, notifications, streak pressure, competitive claims or score
  penalties. The game algorithms and solutions ship to the browser; these are
  casual puzzles, not anti-cheat systems.

## Generation and fairness

Both identities include game/version/local day/practice index/difficulty and use a
frozen deterministic v1 seed. They do not inspect any productivity or personal data.
The text is original, composed from a small set of case setups and generated clues;
this is not an unlimited story catalog. Puzzles can eventually repeat structurally.

The detective solver enumerates all 13,824 complete person/room/object timelines,
chooses true information-reducing clues, then removes redundant clues only when one
solution remains. Hard excludes positive identity clues. This establishes unique
solutions, not that every puzzle is solvable by a specified human deduction system.

The labyrinth generator creates a self-avoiding route, derives counts/checkpoints,
and uses a bounded route solver to eliminate alternatives with walls. A different
ordering of the same occupied cells causes that candidate to be rejected. Exhausting
the solver budget never counts as proof of uniqueness. A verified simple-corridor
fallback prevents a generation failure from becoming an unusable daily board; this
fallback can be easier. Change identity/version before altering shipped v1 rules,
seed, labels, clue ordering, or generation; never silently remap saved boards.

## Device-local persistence

`use-local-puzzle.ts` reuses the existing PlayProvider's verified account-scoped
store key's account suffix. New JSON records have a separate `lanes-lair-deduction-v1:` namespace plus
game/version/day/practice/difficulty. No new Supabase adapter or cloud GameId is
introduced. Account checking/error states hide old-account game state. Games never
load task, Inbox, journal, habit or recovery contents.

Saving is synchronous localStorage with validated shapes, length bounds, exact-base
comparison and visible errors. Quota/write errors keep moves in memory; Retry saving
does not replay a move. Corrupt data is left untouched. Different-tab saved bytes
produce a conflict and do not get silently overwritten. Reload saved copy requires
explicit confirmation before replacing this tab's in-memory notes. Cross-tab
comparison is best-effort, not an atomic transaction; use one active puzzle tab.

This is device-local saving, not offline app availability or cross-device sync.
Clearing site data removes the progress; the UI states this. The hub labels the
existing sync controls as Rune Lock-only so they cannot be mistaken for new-game sync.

## Source and coordination handoff

- New rules, generation, storage and tests: `lib/games/deduction/`.
- New boards, progress hook, shared controls and feature card: `components/play/`.
- New protected routes: `/play/detective` and `/play/labyrinth`.
- Existing edits: `lib/games/catalog.ts`, `components/play/play-hub.tsx`,
  `components/today/today-view.tsx`, and hub regression tests.
- No shared app store, auth, database, privacy, journal, assistant, task or reminder
  implementation changes. The cloud-sync GameId union remains unchanged.
- Overview should record this as implemented locally with physical-device acceptance
  and publication pending. No edits were made to Overview-owned roadmap documents.

## Verification

New automated coverage checks 40 normal/hard daily/practice detective samples and
60 labyrinth samples for deterministic/unique solutions, plus move validation,
completion, row/column propagation, corrupt/blocked storage, retry, account/puzzle
namespaces and tab conflicts. Rendered markup tests check labelled grids, coordinates,
controls and featured links. See the chat handoff for final command results.

Final local checks: **362 tests across 61 files passed** with four workers; lint,
TypeScript and whitespace checks passed. After the final storage-key refinement,
all 10 new rule/storage/UI tests and lint/TypeScript passed again. Production build
passed with invented build-only Supabase settings. The first build could not fetch
the existing Google Fonts inside the sandbox; the next hit a Turbopack worker
startup failure. Preserving the generated `.next` cache under ignored `build/` and
running a clean build without concurrent checks, with four compiler threads,
resolved it. No application config or production service was changed to do so.

Release checks after integrating published Discover checkpoint `396a7d4`:
**698 tests across 75 files passed**, plus lint, TypeScript, whitespace checks and
the production build. The build includes both new game routes and the existing
Discover route. Only the 19 game-related source/test/documentation files belong
to this release; Discover is inherited unchanged from its published checkpoint.

Browser QA used a separate ignored Next.js project at `build/game-preview`, with
invented puzzles and in-memory storage, no auth/environment files or account calls.
The initial sandboxed server was unreachable; restarting the synthetic server on
host loopback resolved it. Verified at desktop and 390px viewport: detective cell
exclusion/undo/reveal propagation and complete-case check; labyrinth tap/undo,
continuous pointer drag, keyboard Enter, hint-assisted completion, exact final
counts and a Shire theme view. Screenshots are synthetic. The owned preview server
was stopped after QA.

Still unverified: physical iPhone/Home Screen, VoiceOver, genuine touch/rotation,
320px board scrolling, installed-app account-change lifecycle and localStorage
reload/quota behavior in Safari. The browser preview exercised boards with memory
storage; persistence/error evidence comes from adapter tests, not a live account.

Physical iPhone acceptance remains pending despite publication approval:

1. Play a Normal and Hard case with invented data; assess actual challenge/fairness.
2. Try grid/clue navigation, undo, reveals and complete-case checking on iPhone.
3. Tap and draw a route; test backtracking, incorrect counts, checkpoints and undo.
4. Change difficulty and switch daily/practice/back; reload and confirm correct saved
   identities. Test day rollover and a disposable second account separately.
5. Check blocked storage and conflicting tabs, and all three existing themes.
6. Record owner feedback on difficulty and device behavior. Publication approval
   does not establish physical-device acceptance. No SQL is required.
