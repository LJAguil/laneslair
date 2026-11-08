# Lane's Lair: Reflect, Track, Play

## Agreed direction

Lane's Lair is a personal daily home base, used primarily from an installed iPhone web app. Preserve quick capture as an unorganized note by default. Add a journal as another destination for captures, not a replacement for tasks. The owner selected **one journal entry per day, with notes appended**, **selectable chess difficulty**, and **a balanced statistics overview including journaling**.

Keep the three themes, simple Today hierarchy and working persistence/reminders. Daily games should be enjoyable optional destinations, not a collection of dashboard chores. Future native mobile work, news and additional themes can follow these milestones.

Journal/calendar (`bee9e66`) and Statistics (`25c8b8e`) are published; Vercel confirmed both deployments. Milestone 4 is implemented locally with review-only migration 005 and an explicit account-sync import; it is not committed, deployed or remotely activated. See [Daily Play setup](DAILY_PLAY_SYNC.md). The owner reports 005 applied. Milestone 5 is now implemented locally with review-only migration 006; see [Daily chess](DAILY_CHESS.md). Milestones 4–5 are uncommitted/undeployed. Echoes remains planned. Test each milestone on iPhone before building substantially on top of it.

## Ordered roadmap

| Milestone | What you will be able to do | Main dependency / acceptance |
| --- | --- | --- |
| 1. Journal and Inbox routing | Open today's entry, write/edit it, browse other dates, and Add to journal from an Inbox note alongside Make this a task | Reviewed journal SQL; one owned entry per calendar day; appending/retrying cannot duplicate a note or overwrite newer writing |
| 2. Habit calendar | Browse a month and select any date to see which habits were completed, partial, or had no log, including saved quantities/targets | Existing habit logs; preserve historical targets and date-only semantics; read-only calendar first |
| 3. Statistics | Open a balanced 7/30/90-day overview of recorded habit progress, water/quantity activity, task completion and journaling consistency | Journal + calendar definitions; label unknown history accurately and avoid invented completion rates |
| 4. Daily Play hub and synced progress | Choose a game and keep supported progress across phone/desktop, with per-game optional streaks | Reviewed game-progress SQL and safe migration/merge of device-local Rune Lock history; no forced reset |
| 5. Daily chess | Select difficulty and solve a daily position on a phone-friendly, legally validated board | Game hub/progress; verified curated puzzle source with clear terms and correct starting position/solution semantics |
| 6. Symbolic riddles: Echoes (working title) | Read an original short scene/poem and match highlighted imagery to its meaning, with hints and explanations | Game hub/progress; curated original content with fair answer choices and versioned daily rotation |

## Important product and data choices

### Journal

- One entry per account/calendar day; allow selecting another day for past writing. Use an explicit date column, consistent with the app's existing device-local calendar day, not a midnight UTC conversion.
- Plain text first, with optional title only if useful. Don't add a rich-text editor dependency or AI analysis in the first version.
- Inbox offers **Add to journal** alongside **Make this a task**. Choose the entry date (today by default), preview the append, retain the original capture, and show where it was added. The original note and journal copy can be edited independently afterward.
- Source links/receipts must be separate from task-only `converted_task_id`/`converted_at` semantics. Don't repurpose those fields or remove existing task links. A retry/repeated tap must not append the same capture twice. A journalled note should no longer count as an unsorted thought merely because it lacks a task link.
- Appending to a daily entry must be atomic and safe against simultaneous edits from phone/desktop. Use an ownership-checked transaction/RPC and revision/optimistic concurrency as appropriate; show conflicts rather than replacing newer text. Cancel or failed writes keep the draft/input.
- Don't silently archive or delete the source note. If an entry/source disappears, explain the state and preserve surviving content. Journaling reminders can be considered later; don't silently extend the existing task/habit scheduler or enable a new reminder.
- Journal content stays private in owned Supabase rows. No analytics service, AI endpoint, shared cache, or service-worker cache receives it.

### Calendar and statistics

- Calendar states must distinguish target reached, partial amount, zero/no log, future date, and dates before a habit existed. Absence of a log is not proof that a habit was scheduled or failed on that day.
- Include archived habits' recorded history through a filter. Don't infer exact historical active/archive periods: the existing `is_active` flag is current state, not an archive timeline.
- Quantity history uses each log's saved target, not today's configured target. Keep different units separate (don't add glasses to millilitres or pages).
- Statistics start with a balanced summary: days journalled; habit successes/recorded progress; water or selected quantity totals/trends; currently completed tasks with completion dates. Provide date ranges, visible metric definitions and accessible text/table equivalents for charts.
- Current task rows cannot reconstruct a complete history of deleted tasks or every completion/reopening. Current habit rows don't fully reconstruct past schedule/active-state changes. Label these limits. Don't display made-up historical counts or treat unknown days as failures. Propose append-only activity/history separately if richer trustworthy trends require it.
- Games remain marked device-local until milestone 4 is live. Don't combine one device's game counts into an account-wide metric without disclosure.

### Games

- Move Rune Lock to its own destination while keeping `/play` as a compact hub. Keep existing Today/navigation links working and retain the v1 answer algorithm and saved history.
- Use game ID, puzzle ID/date, version and (for chess) difficulty in progress identity. Switching difficulty must not reset/rewrite another difficulty's result or multiply a daily streak. Define these rules before implementation.
- Synced game progress needs ownership policies, idempotent submissions and conflict handling. Local history migration must be explicit, previewable and safe on retry; don't discard either device's progress or silently prefer an incompatible branch.
- Chess difficulty should be selectable (for example beginner/intermediate/advanced). A small verified bundled puzzle pack avoids paid APIs and runtime dependence on a remote daily-puzzle feed. Preserve source metadata and validate every FEN/solution before publishing. Handle player color, automatic opponent replies, illegal moves, promotions and alternate correct solutions explicitly. Never accept every legal move as a correct tactical solution.
- Research checked for planning: [Lichess open database](https://database.lichess.org/#puzzles) offers a puzzle dataset under CC0; [chess.js](https://github.com/jhlywa/chess.js) provides chess rules/move validation. Milestone 5 verified the official docs/terms and installed chess.js 1.4.0, with four CC0 example records plus two composed positions. No runtime feed or full database is connected; see DAILY_CHESS.md.
- Echoes uses original writing, inspired by symbolic associations rather than copied Genshin text, art, characters or puzzle solutions. A highlighted image/phrase is matched to a word/concept from a small word bank. Reveal a short explanation after answering. Start with curated daily choices to avoid rejecting equally reasonable free-text interpretations; support alternate answers where intentional. Hints/assistance should be recorded without being punitive.
- Use local-calendar rollover consistently, optional streaks, keyboard/touch access, per-game history and spoiler-free sharing. No new push opt-ins or account signup flow are needed for games.

## Copyable implementation prompts

Run one milestone at a time. These prompts authorize that milestone's useful local implementation, not automatic remote SQL execution, deployment, commit or push.

### Prompt 1 — Journal and Add to journal

```text
Begin milestone 1 from docs/ROADMAP_AND_PROMPTS.md: a private persistent Journal for Lane's Lair.

Inspect the repository, AGENTS.md, relevant installed Next.js docs, existing Inbox conversion flow, types, store and Supabase conventions before coding. Preserve Today, tasks/projects, habits, reminders, themes and Rune Lock.

Implement one journal entry per authenticated account per calendar day, with a Journal page, date navigation, creating/editing entries and clear saved/unsaved/error states. I chose one entry per day with notes appended. Use plain text initially and date-only semantics consistent with the existing local calendar day. Keep journaling reachable from Today without turning Today into another widget grid.

Add Add to journal beside Make this a task on Inbox captures. Default to today's entry with a date choice and append preview. Preserve the original capture and task-conversion links; record the journal source relationship separately. Appending must be atomic, owned and idempotent, so retries/repeated taps never duplicate text. Protect newer journal edits from concurrent overwrite. Distinguish journalled captures from unsorted ones in relevant views/counts. Explain that source and journal copy are independent after adding. Cancel/failure must retain input and surviving original content.

Inspect existing schema information first. Prepare reviewable additive SQL and ownership policies for any needed tables/RPCs; do not execute remote SQL or modify existing ownership policies without approval. Continue useful local UI/test work while schema setup is pending. Use verified authenticated IDs, never service-role keys, passwords or hard-coded users. Never cache private journal content or send it to analytics/AI services.

Add meaningful tests for ownership, one entry per date, append retries/rollback, concurrent edits, task/journal links coexisting, date handling and failed-save recovery. Run npm test, npm run lint, npm run build and npx tsc --noEmit. Update setup/docs and provide a short iPhone checklist. Do not commit or push yet.
```

### Prompt 2 — Habit calendar

```text
Begin milestone 2 from docs/ROADMAP_AND_PROMPTS.md: a calendar view of daily habit history.

Read AGENTS.md and relevant installed Next.js docs. Inspect existing habit/log data, date helpers, target snapshots, streak logic and components before editing. Preserve the current habit list, quantity inputs, reminders and New habit flow.

Add a responsive monthly calendar to Habits with previous/next month, Today, a habit filter and an optional archived-history filter. Start with a read-only calendar. Selecting a date shows what I logged for each relevant habit: amount, unit, saved target and completion state. Distinguish complete, partial, no log, future, and before-creation dates with labels/icons as well as color. Keep date-only logs free of timezone shifts. Don't label a blank day as a failure when historical schedule/active state is unknown; preserve weekly habit semantics.

Reuse existing owned data and progress components; avoid new SQL unless inspection shows it is necessary. Never overwrite historical targets with current targets. Add keyboard-accessible month/date navigation and clear loading/error/empty states. Don't change database data just to populate the calendar.

Test month boundaries, leap days, local dates, historical quantities/targets, weekly habits, archived history and empty/error states. Run npm test, npm run lint, npm run build and npx tsc --noEmit. Update docs and give me a physical-iPhone checklist. No remote SQL, commit, push or deployment without approval.
```

### Prompt 3 — Balanced statistics

```text
Begin milestone 3 from docs/ROADMAP_AND_PROMPTS.md: a Statistics page for Lane's Lair.

Inspect AGENTS.md, relevant Next.js docs and the actual journal/task/habit schemas and history available. I want a balanced overview including journaling, not only water or tasks. Preserve the existing Overview page and working features; make Statistics a clear destination without duplicate/confusing navigation.

Provide 7/30/90-day views of days journalled, recorded habit successes/progress, selected quantity/water trends and task completion information supported by existing data. Define each metric, denominator, unit and date/time-zone rule. Include readable summaries and accessible table/text alternatives to charts. Keep loading, no data and errors separate; don't use sample values in real statistics.

Use saved habit-log targets. Keep different quantity units separate. Don't invent past active schedules, counts for deleted tasks, or completion/reopening history that current rows cannot reconstruct. Label metrics such as currently completed tasks with dates accurately. Keep device-local game results separate from account-wide metrics until sync exists. If accurate additional metrics need an activity history table, prepare a small reviewed proposal instead of silently making up a history or changing remote data.

Keep aggregation logic typed and separate from UI; use existing tools before adding chart dependencies. Add tests for range boundaries, denominators, archived data, quantities, reopened tasks and journal-day counts. Run npm test, npm run lint, npm run build and npx tsc --noEmit. Document limitations and an iPhone test checklist. No remote migrations, commit, push or deployment without approval.
```

### Prompt 4 — Games hub and account-synced progress

```text
Begin milestone 4 from docs/ROADMAP_AND_PROMPTS.md: prepare Daily Play for multiple games and account-synced progress.

Inspect AGENTS.md, installed Next.js docs, current Rune Lock rules/provider/local-storage adapter and auth/data conventions. Preserve the published Rune Lock v1 answer algorithm, puzzle identities and all saved history.

Make /play a compact hub containing the working Rune Lock game, with a dedicated Rune Lock route and functioning old links/Today shortcuts. Design a typed game catalog/progress boundary that can add chess and Echoes later without fake playable placeholders. Keep the four primary mobile destinations and simple Today hierarchy.

Prepare reviewed ownership-protected SQL for per-account/game/puzzle-version progress if no suitable schema exists. Define daily puzzle identity, immutable solved states, idempotent submissions, hint usage, optional streaks and conflicts between devices. Add an explicit safe import/merge flow for existing device-local Rune Lock progress, with a preview and no silent deletion or incompatible-history overwrite. Allow useful local UI/test work while database approval is pending. Do not execute remote migrations or add service-role keys.

Test account isolation, version/date rollover, replay, simultaneous devices, interrupted import, hints and preference persistence. Run npm test, npm run lint, npm run build and npx tsc --noEmit. Explain what remains local until activation, update setup docs and give me a two-device checklist. No commit, push or deployment without approval.
```

### Prompt 5 — Daily chess, selectable difficulty

```text
Begin milestone 5 from docs/ROADMAP_AND_PROMPTS.md: add daily chess puzzles to Daily Play with selectable difficulty.

Inspect AGENTS.md, installed Next.js docs, the game hub and progress adapter. Keep Rune Lock and all non-game features working. Verify current official docs/package compatibility and puzzle source terms before adding a dependency or dataset.

Use a small verified curated/bundled set of chess tactics with source metadata, not a paid API or the entire Lichess download. Provide beginner/intermediate/advanced selection with a stable puzzle per day and difficulty. Use a maintained rules library such as chess.js if compatible; don't implement chess legality from scratch. Validate all positions and solution lines, including whether a source's first move is setup/opponent play, before showing the puzzle.

Build a phone-friendly tap-source/tap-destination board with coordinates, clear player-to-move, orientation, keyboard-accessible squares, move history, automatic scripted opponent replies, optional hints and a reviewed solution explanation. Handle illegal moves, legal-but-wrong moves, promotions and alternate correct solutions explicitly. Track assisted attempts and completion; never accept every legal move as a tactical solution. No full chess engine/server is required for a curated first version.

Reuse daily progress/streak infrastructure and persist by game, puzzle version/date and difficulty. Switching difficulty must preserve its own progress and not multiply the daily streak. Verify the free/local approach and explain any external service proposal before connecting it.

Add tests for puzzle validation, turn/setup semantics, solution replay, special moves where present, difficulty identity, persistence and rollover. Run npm test, npm run lint, npm run build and npx tsc --noEmit. Update source/attribution/setup docs and give me an iPhone checklist. No remote migrations, commit, push or deployment without approval.
```

### Prompt 6 — Echoes: imagery and meaning

```text
Begin milestone 6 from docs/ROADMAP_AND_PROMPTS.md: add Echoes, an original daily symbolic-association riddle game, to Daily Play.

Inspect AGENTS.md, installed Next.js docs, existing game catalog/progress and themes. Preserve Rune Lock, chess and productivity features.

The mechanic I want: a short original poem/story highlights an image or phrase, and I match it to a corresponding word/concept. Images can suggest ideas such as time passing, memory, frost, hope or growth. This is inspired by the type of association puzzle I described from Genshin Impact; write original text and solutions, without copying its dialogue, art, characters or quests.

Start with a curated, versioned content pack and a few short rounds per day. Use a small word bank with fair distractors, optional hints, understandable feedback and a concise explanation of the symbolic link after answering. Avoid ambiguous free-text grading; explicitly support alternate valid answers if intentional. Don't call an AI model at runtime or add a paid content feed. Validate daily rotation/content coverage and disclose reuse when a finite pack cycles.

Make it comfortable to read on iPhone and in all themes, with highlighted phrases conveyed semantically rather than only by color. Reuse per-game saved progress, rollover, assistance tracking and optional streaks. Give it a game-hub entry and restrained Today access without adding another large dashboard widget.

Test answer mappings, alternate answers, scoring/retries, hints, content/version/date identity and persistence. Run npm test, npm run lint, npm run build and npx tsc --noEmit. Update docs, identify the content-pack size and give me a physical-iPhone checklist. No remote SQL, commit, push or deployment without approval.
```
