# Phone typing and timestamped journal additions

## Publication approval

The owner has approved committing and deploying the keyboard/timestamped-journal interface. Migration 008 is already applied. Privacy implementation remains a separate, staged task; see [PRIVACY_IMPLEMENTATION_PROMPTS.md](PRIVACY_IMPLEMENTATION_PROMPTS.md). Earlier local-stage status below is historical.

## Database activation update

Migration 008 was subsequently applied through the authorized Supabase integration and verified on 2026-11-09, without reading private entries. See [MIGRATION_008_VERIFICATION.md](MIGRATION_008_VERIFICATION.md). Do not rerun it. The UI remains uncommitted/undeployed; the initial preparation notes below describe the earlier local stage.

## Status

Local implementation only; no commit, push, deployment or remote SQL has been performed. The owner reported task forms were the main keyboard pain point and requested individually timed, editable writing grouped by day. Existing journal schema/migration 004 and Inbox appends were inspected; no real journal/habit data or credential values were read. Tests use invented data.

## Phone typing changes

- Removed repeated `scrollIntoView` calls while the visual viewport resizes. They could fight Safari's native caret scrolling in a long field.
- Track visual viewport height **and top offset**, focus and coarse-pointer state. A focus-session baseline handles browsers that also resize innerHeight. Small browser-toolbar shifts, hardware keyboards and pinch zoom are not treated as software keyboards.
- Added **Done typing** in the app and inside native dialogs' top layer. It only blurs focus: no saving, submitting, clearing, navigation or dialog close. Its label explicitly says it does not save.
- Keep task-form Cancel/Add task/Save changes in a sticky action row inside the keyboard-sized modal, with space above the dismiss toolbar. Avoid an extra forced-focus scroll on opening an already-focused field.
- Use 16px mobile shared form controls and a less oversized journal textarea while typing. Journal/Inbox prose keeps capitalization/spellchecking and multiline Enter behavior. User zoom is not disabled.
- Existing theme tokens, native inputs, focus trapping, keyboard navigation, save errors and form values remain. Geometry tracking never reads field values or logs text.

These are browser-geometry heuristics, not direct access to an iPhone keyboard API. Rotation, zoom, dictation and hardware keyboards still need physical testing. No keyboard 'fix' should be judged complete solely from desktop/simulated tests.

## Journal behavior

A calendar day remains one journal destination and one `journal_entries` row for navigation/Statistics. New writing uses **Save addition**. Each addition has its own server-assigned `created_at` (shown as Added), a separate `updated_at` (shown as Last edited), and a revision. Editing never changes the original added time. You can edit additions independently, not just edit a formatted timestamp inside the text.

The display uses the viewing device's time zone, with date/time/zone labels and machine-readable timestamps. A selected older entry date groups the writing under that day; it never pretends the addition was written back then. No new interval, autosave or AI feature is introduced.

Existing days convert **lazily on the first new addition or Inbox append**, not during migration execution. Their exact combined text becomes one labelled **Earlier daily page** block, preserving its known first-save and last-edit timestamps. We cannot recover individual old paragraph times and never invent them. The original day UUID and date stay the same. Existing Inbox sources/task links are retained.

New Inbox Add to journal operations become timestamped additions. Repeating an existing source returns its original receipt/destination rather than creating a second addition, including older sources that predate this migration. The original Inbox note and journal copy remain independent. Earlier source receipt times remain visible in the compatibility daily-page view.

The main `journal_entries.body` stays an atomic text aggregate of the additions, ordered by added time/id. This preserves existing index, Today and Statistics integrations without inventing extra journal days or adding bodies to analytics queries. The aggregate and addition rows both contain readable journal text; this is **not** an encryption upgrade.

After conversion, old whole-page save calls are rejected server-side to prevent an older client from overwriting individual additions. The earlier editor remains read-only and keeps any unsaved old draft available for copying. Unconverted days still support the old editor as a compatibility fallback. Use the new addition form for newly timestamped writing.

## Review-only migration 008

Review `database/migrations/20261109_008_journal_additions.sql` before running it. It depends on 004 (and the existing Inbox schema). Do not rerun older migrations. It:

- Adds a default-false flag to daily entries and an owner/id uniqueness constraint.
- Creates `journal_additions`, with ownership RLS, an owner-matching entry foreign key, authenticated owner-only reads and no direct client writes.
- Creates private `journal_addition_writes` receipts with RLS/default-deny and no client grants. Receipts store request IDs/hashes, not another copy of writing.
- Adds an authenticated, actor-scoped save RPC. It assigns timestamps on the server, checks per-addition revisions and rebuilds the daily aggregate under the existing day-scoped transactional lock.
- Retains the original whole-page save as a private legacy helper behind a compatibility wrapper; revokes client access to that helper. The replacement Inbox append preserves its contract and source/task semantics while making new copies timestamped.

No existing body is rewritten by applying the migration itself. Whole-day conversion happens within a later owned save transaction. Constraint/function-change warnings in SQL Editor should be reviewed against this scope; never drop existing tables to force it through.

Retries use a stable addition UUID and operation ID for the same draft payload. Confirmed operation replays return the latest owned state without restoring older text. A different payload with a reused ID fails. Concurrent additions can both succeed; edits conflict only on that particular addition's revision. Failure during aggregation/source linking rolls the complete transaction back, including any lazy conversion. The existing 100,000-character combined daily limit remains and failures retain the draft.

If a create was accepted but its response was lost, refreshing finds the same stable UUID. The new form can review/rebase that saved addition explicitly, retain its current draft and update the original row on the next save rather than creating a duplicate. Stale edit recovery likewise shows saved text and requires explicit review before rebasing. Nothing is overwritten just by refreshing or rebasing.

Drafts/operation identity stay in account app memory while navigating; they are not written to localStorage. Cancel/discard are explicit. The leave-page guard also considers addition drafts, but iPhone may terminate an app without warning. Save before closing or refreshing. Failed/changed saves do not silently clear drafts; a confirmed response clears only the matching submitted body. Loading, empty, setup and failure are separate states.

## Privacy: what this does not promise

Lane's Lair currently protects writing through authentication, ownership policies and restricted database writes. It is **not end-to-end encrypted**: privileged database administrators can read stored text. Signing into the app on an unlocked device also makes writing readable there. The current Assistant is browser-only prototype logic, not a connected model; no journal-to-AI integration is added here.

For writing whose exposure would seriously harm you, use an established end-to-end encrypted journal until a dedicated protection milestone is designed and independently reviewed. That milestone should include client-side key management/recovery, coverage of both aggregate and addition/Inbox copies, technical restrictions on development access, and a strict journal-off-by-default policy for any future AI. Encryption still needs a trusted client and cannot protect text while an attacker controls an unlocked device/client. Losing the only decryption key can also mean losing the writing. No such key/recovery change is made silently in this UI milestone.

Writing in the app is different from pasting text into this Codex chat or authorizing a tool to read it. Keep private entries out of development prompts and use synthetic examples for debugging. No promise about idea secrecy should rely on the assistant's personality or a blanket guarantee of zero access.

## Files and verification

UI: shared dialog/fields, keyboard dismiss control, viewport watcher and CSS; sticky task-form actions; Journal/Inbox prose controls; timestamped addition forms/cards. Data: owned addition transport and migration 008. Store: in-memory addition drafts, replay identity/rebase and leave-page guard. Documentation includes current privacy limits.

TypeScript now excludes the already-ignored `build/` directory, matching ESLint's existing exclusion. A generated-cache backup was initially being mistaken for source code during the build; excluding generated build artifacts resolves that issue. Application/Next authentication settings were not changed.

Automated verification uses simulated geometry/rendering/transport and temporary local PostgreSQL. It is not a live Supabase or physical-iPhone test. Final checks passed: `npm test` — **333 tests across 53 files**; `npm run lint` — no errors or warnings; `npm run build` — passed; `npx tsc --noEmit` — passed. Initial new-test lint/type issues and a ref-cleanup warning were fixed. The cache-backup source-scan issue described above was corrected before the final successful build. No checks used real journal writing or live Supabase data.

After reviewing/applying 008 and separately approving publication:

1. On iPhone, open New task and edit a task. Type a long title/notes; move between fields, scroll to dates/reminders and reach Cancel/Save. Tap Done typing: it must dismiss only the keyboard, keeping the dialog/text open. Reopen the keyboard and save. Check landscape, pinch zoom and all themes.
2. Try Quick capture and Journal. Multiline Enter should add a newline. The cursor should not jump because the whole field was forcibly scrolled. Ensure notifications/navigation do not cover the editor; test hardware keyboard/VoiceOver if available.
3. On a day with existing writing, save a new addition. Verify every old paragraph survives in the Earlier daily page block, labelled with first-save information rather than guessed paragraph times. Verify new additions have actual added times and all remain under the selected day.
4. Edit an addition and refresh. Its Added time must stay fixed; Last edited changes. Pick a past entry date and add writing now: the group date stays past while the added timestamp shows now in your device's zone.
5. Add an Inbox note to Journal, repeat the action and verify just one timestamped copy, original Inbox text/task links preserved, and one journal day in Statistics.
6. Make two additions from different devices, then attempt stale edits to the same addition. Both independent additions should survive; a stale edit must retain the draft and require review. Interrupt a save and retry/refresh: no duplicate additions or silent draft loss.
7. Sign into a different disposable account for isolation testing. Existing journal text must not appear. Recheck task completion, capture, habits and games. The agent has performed no live private-data queries to verify these behaviors.

No remote migration, commit, push, deployment or encryption change has been performed in this milestone.
