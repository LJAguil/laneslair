# Read-only habit calendar

## Scope and setup

Milestone 2 is published in checkpoint bee9e66; Vercel confirmed the deployment completed. It uses the existing owned `habits` and paginated `habit_logs` data loaded into the React store. No new SQL, packages, environment variables, sample records, reminders or database writes are introduced. The owner reports Journal migration 004 applied successfully; the owner approved publishing the Journal and calendar UI changes; phone verification remains pending.

Open **Habits & Goals → Calendar**. The existing **Habits** view remains the default, with the same quantity/check-in controls, reminder bells, archive/restore actions and single New habit button. Calendar selection never changes a log. To record/edit progress, return to the Habits view and use the existing supported controls.

## Reading history

- Choose a month with Previous/Next, return with Today, or use Jump to date. Weeks are Monday–Sunday, matching existing weekly habit logic. Adjacent-month dates are dimmed but selectable.
- The habit dropdown shows active habits by default. Include archived habits to add their retained records. Turning that off resets an archived-only selection to All; active selections stay selected.
- Selecting a date lists every habit included by the filter. Recorded amounts use the **saved log target**, even if today's habit target is different. Units stay separate. A successful legacy check-in with amount/target 1 remains successful.
- Labels and icons distinguish Target reached, Partial progress, Zero recorded, No log, Future date and Before creation. A zero-valued record (for example an undone check-in) is distinct from no database log.
- Explicit records take precedence over inferred timing. A record before the displayed creation date or in the future remains visible with a timing explanation; the calendar doesn't delete or normalize it. This accommodates existing date-boundary/legacy records.
- A blank cell is **not a failed habit**. There is no historical target to display when no log exists. Current active/archived status cannot reconstruct old pause intervals. We don't assume every currently active habit was scheduled on every past date.
- With All habits selected, a check means **all targets in that date's recorded logs** were reached. It doesn't claim every habit was completed. The selected-date detail reports exact recorded/target-reached counts and includes No log rows for other included habits.
- Weekly/custom habits show their daily record separately from the week's successful-day count and current weekly goal (there is no per-week goal snapshot in existing logs). The count covers the selected full Monday–Sunday week and uses each day's saved target. A blank weekday is not a missed daily obligation. This calendar does not change streak logic or schedule anything.

## Dates, keyboard and phone layout

Log keys remain plain `YYYY-MM-DD` values. Month arithmetic uses existing local calendar helpers, without parsing a date-only key as a UTC instant. Creation timestamps use the same existing device-local creation-day helper as habit tracking. Month/year movement clamps dates such as January 31 to February 28/29.

The grid has one tab stop for its selected day. Arrow keys move by day or week; Home/End select Monday/Sunday; Page Up/Down change month, and Shift+Page Up/Down change year. Enter/Space select with native button behavior. Crossing months updates the heading and restores focus to the selected date. The heading and selected-date heading announce changes. Grid cells have full date/state labels; meaning isn't conveyed only by color.

Phone layout stacks calendar and detail; larger screens can place them side by side. Date buttons use a dense seven-column layout with tall targets; their widths can be narrower than the app's usual 44px button minimum on small screens to prevent horizontal overflow. The native Jump to date input is an additional accessible navigation option. The existing themes and focus styling are reused.

Loading, request failure, no habits and archived-only/no-active views have separate messages. Failed history reads never render a populated-looking empty grid; Retry habit history reloads existing owned data. The list's existing error state is preserved separately.

## Verification and physical-iPhone checklist

Tests cover six-week grids, month/year boundaries, leap years, month clamping, date-only behavior in multiple time zones, historical targets, zero versus missing logs, future/pre-creation records, archived filtering, mixed recorded summaries, full weekly counts, keyboard date calculations, data immutability, accessible rendered markup and loading/error/empty states. Rendered markup and key-calculation tests are simulated; they don't prove physical touch/focus behavior or live Supabase loading.

After a separately approved push and successful Vercel deployment:

1. On the Home Screen app, open Habits & Goals. Confirm Habits remains the default; New habit appears once. Log water/check in, open a reminder bell, edit, archive/restore and confirm the old controls still work.
2. Switch to Calendar. Check portrait, landscape and the narrowest available screen. There should be no page-wide horizontal scrolling; month controls, filter, date input and detail remain reachable. Check all three themes.
3. Move across December/January and February in a leap/non-leap year. Use Today and Jump to date. Tapping a trailing/leading month date should select it and update the heading/detail correctly.
4. Filter one quantity habit with old logs. Verify amount and saved target match actual history, including an older target that differs from today's. Select a partial day, a zero record, a blank day, a future day and a date before creation. Blank dates must say No log, not missed/failed.
5. Include archived habits and select one with retained history. Turn the checkbox off; the invalid archived-only selection should reset. Check active habit filters remain selected when toggling archive visibility.
6. Select a weekly/custom habit. Check that the detail distinguishes a daily record from its Monday–Sunday goal/count and doesn't mark every blank day as failure.
7. If using a hardware keyboard, Tab into the grid, use arrows/Home/End/Page Up/Down/Shift+Page, cross a month boundary, and verify focus follows the selected date. Enter/Space must work. With VoiceOver, check full date/state names and selected-date detail.
8. Refresh and check the same stored amounts are unchanged. Navigation/filtering must create no new logs. Calendar view/filter/month selection isn't persisted and can reset when switching views or reloading.
9. If loading fails, use Retry habit history; do not interpret the error as no records or seed data to make the grid populate. Existing ownership/RLS and data-layer errors remain authoritative.

Final local verification passed: `npm test` (**205 tests across 30 files**, including pending Journal work), `npm run lint` (no errors/warnings), `npm run build`, and `npx tsc --noEmit`. No physical-iPhone calendar test has been performed by the agent. No remote SQL was performed by the agent. The owner subsequently approved commit/push and Vercel deployment; the Statistics follow-up remains separate.
