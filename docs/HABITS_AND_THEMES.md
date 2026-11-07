# Habits, water, streaks, and themes

## Database setup — review first

The existing `habits` and `habit_logs` tables were inspected from the owner's read-only report. The app uses those tables, rather than creating a parallel habit system. The owner reports that the new SQL ran successfully in Supabase, and that water tracking and habits work. The agent has not independently inspected the live database.

If this migration is already applied, do not run it again. For a new environment:

1. Review [20261107_002_habit_tracking.sql](../database/migrations/20261107_002_habit_tracking.sql).
2. Paste the complete file into a new Supabase SQL Editor query for the correct project, and run it once as the database owner if approved.
3. Refresh the local app or click Retry habits. Do not rerun the earlier Inbox migration.
4. If setup fails, share the error text before changing or dropping anything. The migration uses one transaction, and duplicate columns/tables stop it rather than overwrite data.

The migration adds tracking type, daily target, unit, streak preference, color, and an update timestamp to habits. It adds an amount, saved daily target, and update timestamp to logs. Existing records remain successful check-ins (`amount=1,target=1`), with their notes and ownership policies preserved. No sample habits are uploaded.

The `habit_log_operations` table stores request receipts. The `record_habit_progress` function locks the owned habit, updates its daily total, and records the receipt in one transaction. Replaying the same request does not add the amount twice. This narrowly scoped SECURITY DEFINER function checks `auth.uid()`, uses an empty search path and qualified tables, and rejects other owners and archived habits. Authenticated users can read only their own receipts; they cannot write receipts directly. Anonymous users cannot execute the function. No service-role key is needed.

A trigger protects the type, unit, and schedule after logging starts. These rules are tested locally with disposable PostgreSQL; live database and iPhone testing still require the owner.

## Creating your habits

Open Habits & Goals → New habit.

- **Simple check-in:** a single daily completion and undo control.
- **Quantity:** record an amount toward a daily target. Units can be glasses, mL, fl oz, minutes, pages, or another label. Units are labels, not automatic conversions.
- **Every day:** a daily completion goal and optional daily streak.
- **Days per week:** a chosen number of successful days in a Monday–Sunday week, with an optional weekly streak. Existing `custom` records use the same weekly-count interpretation; specific weekdays are not scheduled in this milestone.
- **Show a streak:** enabled initially, but can be switched off at any time without deleting progress. Disabled streaks do not appear in the spotlight or assistant summary.

Name, description, color, streak preference, and the target for new days can be edited. Once a habit has any logged history, its tracking type, unit, and schedule stay fixed so history remains interpretable. To change those, archive it and create a new habit. Archiving retains history and allows restoration.

Goals below the habit list are still explicitly labelled sample data. This work does not persist goals or add notifications.

## Water tracking

Choose New habit, name it Water, select An amount toward a daily target, choose a unit such as glasses or mL, and enter your own daily target. The form does not prescribe a medical hydration target. Nothing is created until saved. Existing water habits imported as binary check-ins can stay as they are; create a new quantity tracker if you want incremental amounts.

Choose an amount and tap Add. Use the minus button to correct over-entry. A total never goes below zero, and the app shows the confirmed server total instead of optimistically claiming a saved drink. The progress bar completes once the saved target is reached; extra amounts remain visible.

Each date keeps the target in effect when its first log was recorded. Editing a habit's target does not rewrite yesterday's achievement or today's already-started goal. It applies to dates that have not been logged yet. A zeroed log still counts as a started date for this purpose.

In the full habit page, Log for allows corrections within the last seven days, after the habit's start date. These are calendar-day strings from the device's local date, not UTC-midnight timestamps. The app updates its current day on window focus, visibility changes, and roughly once a minute while open. Settings' time-zone preference remains a session-only prototype and does not override the device's tracking date.

If a write fails, the app keeps the request in shared state across page navigation and disables new updates for that habit until Retry update confirms it. Retry uses the original request ID. Browser refresh does not retain unsent requests; refresh loads the server's confirmed history. This is not an offline queue.

## Streak rules

- Daily streaks count consecutive successful calendar days. If today is unfinished, yesterday's streak remains visible until the day ends.
- A missed full day breaks the active daily streak. Corrections to recent dates update the streak.
- Weekly/custom streaks count consecutive weeks meeting the chosen successful-day target. An unfinished current week does not prematurely break last week's streak.
- Repeated entries on one day count as one successful day. Future dates do not inflate the current streak.
- Turning the streak off hides the count; it does not discard history. Archiving retains history but does not freeze an active streak.

## Themes

Settings → Appearance offers Classic Lair, Grand Voyage, and Shire Night. These are original color treatments inspired by the owner's interests, without external artwork or changes to navigation. The selection persists in local browser storage and synchronizes between tabs of the same origin. The installed iPhone app and laptop may keep separate choices. It is not an account-synced preference.

If browser storage is unavailable, the selection lasts for the current session and the UI explains that. The root bootstrap accepts only known theme IDs. No private notes, tasks, or session credentials are stored with the preference. App icons remain the core Lane's Lair mark.

## Manual acceptance checks

1. Apply the reviewed migration and open Habits & Goals. A real empty account must show no sample habits; missing setup must show an error/retry, not an empty list.
2. Create a simple daily habit with a streak enabled. Check in, refresh, undo, and refresh. Edit the habit to disable its streak and verify the preference survives refresh while progress remains.
3. Create a water tracker with your chosen unit/target. Add two amounts, subtract one, refresh, and confirm the exact total. Meet the goal and verify completion on Today and in the habit page.
4. Change the daily target after logging. Today's saved target should remain, with the new target applying to a new logged date. Confirm units and schedule cannot change once history exists.
5. Correct a recent date using Log for. Verify that daily/weekly streaks and activity update. A newly created habit starts today and cannot be backfilled before its start date in the UI.
6. Archive and restore a habit. Confirm its log history remains. If a request is unresolved, retry it before archiving.
7. Simulate going offline before an update. Confirm an error, unchanged confirmed total, and safe retry. Navigate between Today and Habits before retrying to verify the request remains available. Restore connectivity and retry without creating an extra increment.
8. Change each theme in Settings. Refresh, move between pages, and test on the installed iPhone app. Check text, button contrast, radio selection, keyboard scrolling, and safe areas. Theme changes should not alter data or reset a form.
9. Run the standard checks: `npm test`, `npm run lint`, `npm run build`, and `npx tsc --noEmit`.

These are local changes until the owner approves a commit/push. The GitHub-connected Vercel deployment will pick up approved pushes; do not expect local code changes to appear on the phone's hosted app automatically.
