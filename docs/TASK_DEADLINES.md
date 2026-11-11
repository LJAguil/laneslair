# Optional task deadlines and real task notifications

Owner approved the migration and scoped publication on 2026-11-11. The exact SQL
was applied successfully via Supabase; only schema/function/privilege metadata was
inspected. No personal records were read and migration 008 was not rerun. The
release is prepared separately from all paused privacy and journal/assistant work.

## Behavior

- New/edit task and Inbox task conversion offer an optional native Due time field.
  A date is required; Clear time restores date-only behavior. No date clears both.
- Date-only tasks keep the existing behavior: due through the selected calendar
  day, overdue on the following day. Existing local-noon timestamps never become
  timed deadlines automatically.
- Timed tasks become overdue at the saved minute. Their UTC instant is saved in
  existing `due_at`; the new default-false `due_has_time` marker records explicit
  intent. Display/edit uses the viewing device's zone. Travel changes the displayed
  local date/time, not the deadline. Date-only tasks retain their existing local-noon
  timezone limitation; this milestone doesn't migrate historical due dates.
- The browser rejects spring-forward times that don't exist. Repeated fall-back
  times use its earlier occurrence on initial selection; unrelated edits preserve
  the exact saved instant. Device-clock accuracy affects the live status.
- Today counts, task rows/filters, overview counts and the bell share deadline
  semantics. The foreground clock refreshes at minute boundaries and on focus or
  visibility changes. Background iOS throttling can delay UI repaint until resume.
- The bell lists actual open tasks due today or overdue, overdue first. Tapping
  opens the task editor. Completed/cancelled/deleted tasks disappear. Undated and
  future tasks are excluded. Loading/error/retry/empty states are distinct.
- Read marks are in-memory for this mounted account session, reset on reload/account
  changes, and do not sync. Crossing a deadline creates a new unread identity.
  This is a live attention list, not durable notification history.
- Push scheduling, subscription and reminder consent remain separate. Setting a
  deadline does not schedule a push or claim that a notification was delivered.

## Approved database setup

`database/migrations/20261111191120_optional_task_due_times.sql` was generated with
the Supabase CLI's local `migration new` command and moved into the existing
migration directory. It was tested against disposable invented PGlite
tables and applied to the existing project with explicit owner approval. It adds one marker/check and an invoker wrapper around the existing owned,
atomic Inbox conversion RPC. The wrapper preserves replay/deleted-task behavior
and rolls linking back if marking the new task fails. Existing grants/RLS are not
changed. The proposal assumes the original task/Inbox schema and migration 001;
catalog metadata confirmed the expected existing columns, RPC, ownership RLS
and authenticated permissions before application.

This migration is now applied. Do not rerun it, 008 or older SQL.
The existing table definitions aren't fully versioned, so do not use a blind
database reset/push to recreate production from these migrations.

Before setup, reads and date-only writes retry only a recognized missing-marker
schema rejection with the legacy column list. Timed writes fail with a setup
message and keep form input; they never silently become date-only. Network or
ambiguous write errors aren't automatically retried. Older clients don't understand
the marker: editing a timed task's date there can replace its instant with noon;
use the compatible client for deadline edits after any future approved release.

## Verification and owner checklist

Automated tests use invented data, mocked transport, simulated rendering and
disposable PostgreSQL. They cannot establish physical iPhone or live Supabase
acceptance. See the chat handoff for commands/results actually run.

Local verification on 2026-11-11: 70 targeted tests across 12 files passed,
covering deadline transport/SQL/UI, DST and travel, minute-boundary/foreground
clock updates, existing task/Inbox behavior and typing controls. `npm run lint`,
`npx tsc --noEmit` and `git diff --check` passed. `npm run build` stopped with
Windows EPERM during cleanup of the pre-existing `.next/hardening-rc-20261111`
snapshot. No manual snapshot cleanup or build-config override was performed;
production build and physical-iPhone acceptance remain unverified.

After the approved publication is live, use disposable tasks on iPhone:

1. Create/edit a date-only task; verify it isn't overdue during its due day.
2. Set a due time a few minutes ahead; save, refresh and reopen the editor. Confirm
   its time and labels, then leave the app open across the deadline. Compare Today,
   Tasks' Overdue filter, Overview and the bell. Repeat after background/resume.
3. Clear just the time, clear the date, and cancel edits; verify persisted behavior.
4. Convert an invented Inbox note with a time; repeat/retry without duplicating it.
5. Fail a save offline; retain all input, restore connectivity and retry. Separately
   fail reminder saving after task save; retry must update the same task.
6. Check bell loading/failure/empty states, read/mark-all, deadline re-alert and task
   completion/reopening. Verify no sample activity or other account's items appear.
7. Test portrait/landscape, all themes, VoiceOver, long task names, the native time
   picker, Done typing and sticky task actions. Use invented content only.

## Overview handoff

Daily Experience & Mobile owns this local change. Shared-file overlap is limited
to additive deadline mapping in `lib/data/tasks.ts` and the clock/empty sample
notification initialization in `lib/store/app-store.tsx`. The existing account
fencing, error sanitation, journal disclosure and assistant-context allowlist stay
intact. No encryption/model/release preparation resumed. Overview-owned roadmap
documents were not edited; coordinate their update through the owner.

## Scoped release verification — 2026-11-11

The release checkout starts at published baseline `72a8102` and contains only this
feature and its regression tests/documentation. Production build passed using
invented build-only Supabase settings. The full suite passed **352 tests across
58 files** with four workers; lint, TypeScript and diff whitespace checks passed.
An existing reminder test was corrected to distinguish reminder time from due time.
The earlier shared-checkout build failure above is historical; its snapshot was
not manually cleaned. Physical iPhone and authenticated live task acceptance remain
owner checks. No live task, habit or journal rows were queried.

Paused privacy lab/account/error-hardening changes and the local journal disclosure/
assistant-context changes are excluded from this release and preserved in the
original checkout. The release uses the existing published auth/store behavior.
