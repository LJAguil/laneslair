# Today and Daily Play

The owner approved committing and pushing this milestone for Vercel deployment and phone testing. The owner tested the previous reminder-controls checkpoint (`bcb177a`) on iPhone. No database migration, external service, new dependency, environment variable, scheduler change, or deployment is required to review this code locally. Follow-on feature implementation is planned separately in ROADMAP_AND_PROMPTS.md.

## Today

- The top row links to tasks, habits, unsorted Inbox captures and today's puzzle. Counts appear only once each data source has loaded; a failed request isn't presented as a zero count.
- Quick capture remains an unorganized note by default. Its shorter input does not change saving, retry or task conversion.
- Focus keeps one user-chosen task. The picker is collapsed once a focus exists, with completion and reminder controls still available.
- Up to three habit check-ins are shown, unfinished first; View all reaches every habit. Targets, quantity logging, streaks and reminder bells reuse existing components.
- Next reminders shows up to four opted-in occurrences in the next 24 hours. Dates/times use the rule's explicit IANA zone, never a task's date-only/noon due time. Paused, quiet, completed and archived items are excluded. Habit log target snapshots and weekly targets are respected. Tasks in archived projects are excluded.
- The reminder preview is calculated locally and refreshes about every 30 seconds/focus. This timer updates the display only; delivery still happens on the existing server scheduler. The preview is not a delivery receipt, device subscription check or promise of delivery. Passed occurrences disappear from the preview; the server may still send during its existing short catch-up window.
- The preview accounts for DST: nonexistent local times are skipped; repeated times use the later/standard occurrence, matching the scheduling rules. Existing device-calendar habit dates are unchanged.
- Radar retains its overdue/next-seven-days/important-undated rules. Daily Play has a compact card and a direct link at the top. Desktop uses two columns; phone layout is a single reading order: capture, focus, habits, reminders, radar, play.

## Milestone 4 follow-up (local, not published)

`/play` is now a compact hub and `/play/rune-lock` is the dedicated working game. Today links directly to Rune Lock. Original v1 rules and storage keys are preserved. Explicit account sync/import is prepared but remains inactive until migration 005 is reviewed/applied and the owner confirms each device’s preview. See [Daily Play sync setup](DAILY_PLAY_SYNC.md) for authoritative current activation, conflict and two-device guidance. The original checkpoint description below records the original local-only behavior.

## Rune Lock

Daily Play is `/play`, reachable from Today, the desktop sidebar and mobile More menu. The four main mobile destinations stay Today/Inbox/Tasks/Projects. Existing authentication guards `/play` too.

Guess an ordered four-rune combination in at most six guesses. There are six available runes; repeats are allowed. Exact matches are allocated first, then remaining occurrences are matched once each:

- Check mark: right rune, right position.
- Circle: a matching occurrence exists elsewhere.
- Dash: no remaining matching occurrence.

Colors supplement icons and accessible text, rather than carrying the meaning alone. Tap rune buttons to append, Undo to remove the last, or tap a filled slot to remove it and shift later runes left. All controls work by keyboard via normal tab/Enter/Space navigation. Invalid/repeated guesses show an error and don't consume an attempt.

An optional hint reveals the first rune without using a guess. Results record hint use. Wins with hints still count toward the optional streak. Streak display is opted out by default. An unfinished day preserves yesterday's run; six failed guesses or a missed full day break it. There is no same-day reset button or paid hint. Completed results can be copied without revealing runes; a selectable text fallback appears if clipboard access fails.

The lock changes at the device's local midnight, using the same day source as Today/habits. If the app stays open, the existing app-store date refresh updates the game. Unsubmitted draft runes clear when the day changes; submitted guesses remain in history. There are no timers, permission requests or push reminders for the puzzle.

## Persistence and future games

Submitted guesses, hint use, completed days and streak preference are stored locally under a versioned Rune Lock key scoped to the existing verified account ID. They persist across refresh, route changes and closing/reopening this installation, provided browser storage succeeds. They **do not sync across devices**, and clearing site data removes history. No account email, tokens, task content or credentials are stored with game progress. The UI explicitly labels this limitation.

Writes reread and merge compatible saved histories, preserving other days and hints. Different attempts in another tab produce a visible conflict instead of overwriting the existing game. These are browser storage operations, not a distributed database transaction; simultaneous cross-tab writes can still race. Use one active game tab per device. Blocked/quota storage retains current play in memory and reports the failure; Retry saving can recover once storage works. Malformed saved data is not overwritten silently.

Answers are deterministic client-side combinations, with a frozen v1 seed and rune order. This is a casual personal puzzle, not a competitive anti-cheat system; a person inspecting JavaScript can discover answers. Do not change the v1 algorithm/order after deployment without introducing a new game version/key.

`lib/games/rune-lock.ts` contains the game rules; `play-store.ts` is the local-storage adapter; `components/play/` contains presentation and its account-scoped provider. This keeps a future Supabase progress adapter or additional games separate from task/habit data. Only Rune Lock is implemented—no placeholder games or external puzzle/news/chess feeds are connected.

## Phone acceptance checklist

After an approved deployment shows Ready, close/reopen the Home Screen app:

1. Check Today at normal phone width. Capture a note, select/change focus, complete/reopen it, log water, and open a reminder bell. Ensure no horizontal scrolling and keyboard controls remain reachable.
2. Check a future task reminder in Next reminders, including its zone. Complete/cancel that task or meet today's habit target; its occurrence should disappear. A habit may show tomorrow's occurrence if that falls within the next 24 hours. Pause reminders in Settings and verify Today shows the pause state. Existing live delivery still needs its usual separate scheduled test.
3. Open Daily Play from the top shortcut and from More. Choose four runes, submit, and inspect clues; try repeated runes, undo, a repeated guess, and the optional hint. Confirm the rules are understandable without relying on color.
4. Submit a guess, return to Today, reopen the game, then refresh/close/reopen. Submitted guesses and hint use should remain; the pending unsubmitted draft need not. Check all three themes.
5. Finish a lock; guessing controls should stop, the Today card should reflect completion, and Copy result should contain only clue blocks/date/score. Toggle the streak preference and verify it survives reopening.
6. Return the next day to confirm a fresh lock. Automated tests simulate rollover, duplicate clues, storage failures and account isolation; these do not substitute for real iPhone touch/keyboard/storage checks. No physical-device testing of this milestone has been performed by the agent.

Verification completed locally: `npm test` passed **153 tests across 24 files**; `npm run lint`, `npm run build`, and `npx tsc --noEmit` all passed. Build output includes `/play`, and route-matcher tests verify it remains authenticated. Tests use temporary local databases/mocked transport for existing features, pure/simulated game data, and rendered markup checks. They never send live notifications or change Supabase. Browser layout and physical iPhone interactions still need the manual checklist above.
