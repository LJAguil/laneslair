# Statistics: recorded progress

## Current status and scope

The owner approved publishing Journal and the habit calendar. Checkpoint `bee9e66` was committed/pushed, and GitHub's Vercel status confirmed **Deployment has completed** for SHA `bee9e66c1555bc1e967ffbca212ed352a3e0f987`. The owner reported migration 004 already applied. No remote migration was executed by the agent. Physical phone/two-device acceptance remains an owner check.

Milestone 3 (Statistics) is published in checkpoint `25c8b8e`; Vercel confirmed Deployment has completed. It adds `/statistics` to the sidebar and phone More menu, keeps the four primary phone destinations, and leaves `/overview` intact as the existing widget dashboard. Statistics is for recorded history/metrics, with a link back to Overview. It adds no SQL, dependency, environment variable, external analytics service, chart library, deployment or sample records.

## Data and privacy

Inspected sources are the existing schemas/data modules: `tasks` has current status/completed_at but no completion-event history; `habits` includes type/unit/current active status; `habit_logs` has a unique habit/date record with amount and saved target; `journal_entries` has a unique owner/date entry. Migration 002 locks habit units/schedule once history exists and preserves per-log daily targets. Migration 004 supplies journal dates/revisions.

The Statistics data module verifies the authenticated account and filters every query by that ID, with existing RLS still authoritative. It selects only metric inputs (IDs, dates, statuses, habit names/units and log amounts/targets). Its queries do not request journal bodies, task titles/notes or browser game storage. The existing application store still performs its normal feature loads; Statistics doesn't send those contents to an analytics service. All reads are paginated beyond the API's default 1,000-row limit. One failed source is reported independently; unavailable data is not silently turned into zero or fabricated empty history.

This is a refreshable snapshot across several read requests, not a transactionally consistent live event feed. Changing a range resets its loading state so an older range's values aren't shown under a new label. Stale responses are ignored after a range change/unmount. If a log's habit disappears during loading, the habit source reports a retryable error rather than guessing the missing unit. Records are deduplicated by their database identity for aggregation.

## Metric definitions

| Metric | Numerator/value | Denominator and limitations |
| --- | --- | --- |
| Journal days | Distinct saved `entry_date` values within the period | All 7/30/90 calendar dates, including today. This is calendar coverage, not a count of edits, writing sessions, or days since starting the app. Backdated writing counts on its chosen entry date. |
| Recorded habit targets | Logs where amount >= that log's saved target | Only recorded habit/date logs in the period, including zero-valued logs and archived habits. No-log dates are absent, not failures. Percent is unavailable when no logs exist. |
| Currently completed tasks | Surviving tasks still `done` whose current completed_at maps into the period | A count only; no historical completion-rate denominator. Reopened, cancelled, deleted and undated completions are excluded. This isn't the number of all completion events that ever happened. |
| Selected quantity total | Sum of amounts for one selected quantity habit | No mixing of habits/units, no automatic mL/glass conversion. Includes explicit zero records. |
| Quantity average | Selected quantity total / its logged dates | Logged dates only, not all dates in the range. No-log dates are not zero; their historical targets are Unknown. |
| Quantity targets reached | Selected habit's recorded dates where amount >= saved target | A recorded-day count, not scheduled-day adherence. Old saved targets are never replaced by today's configured goal. |

Current active/archived labels don't reveal historical pause intervals. Weekly/custom habits contribute their daily records, not failed weekdays. Records of removed habits/logs, deleted journal entries and deleted/reopened tasks cannot be reconstructed. Therefore older periods' figures can change after those operations. No fake history is backfilled.

Goals, events, AI/sample activity, schedules and device-local game results are excluded. Rune Lock remains device-local until a separate sync milestone; mixing it into account-wide totals would be misleading.

## Range and time-zone rules

7/30/90 days include the current device-local day and the preceding 6/29/89 dates. Both calendar endpoints are inclusive. Journal and habit-log DATE keys are compared without UTC conversion. Task completion timestamps are queried from local start-of-first-day converted to UTC, up to (exclusive) local midnight after the last day. Conversion uses local calendar arithmetic, so DST windows need not be a multiple of 24 hours. Completion timestamps are mapped back to local dates before grouping. Task due_at/noon date workarounds are never used.

The device's zone is displayed. Notification/quiet-hours preferences do not override this range's calendar. Travelling to another zone can move timestamp-based task completions across a boundary; saved journal/log date keys remain as recorded. Refresh uses the current device settings. The selected quantity habit stays selected across range changes/refresh when it still exists.

## Presentation and accessibility

Three summary cards balance journal days, recorded habit results and task counts. Quantity trends select a single habit, including archived quantity habits. The decorative bar chart uses gaps for missing logs and is accompanied by exact captioned date/amount/saved-target/result values in a keyboard-scrollable table. A second daily table gives journal presence, habit results/log counts and task counts. Text alternatives do not depend on hover/color; source errors show Unavailable, not zero. Missing quantity logs show No log and an unknown target.

The UI uses existing cards, fields, filter buttons, progress bar, icons and themes. Tables can scroll inside their regions on narrow phones; the entire page should not require horizontal scrolling. No private content is placed in a shared server cache or service worker.

## Optional future activity-history proposal (not implemented)

If the owner wants true completion-event totals, deleted-item history, or historical schedule adherence, review a separate owned append-only `activity_events`/configuration-history design. Record future events at the same database transaction boundary as each mutation, with operation IDs for deduplication, UTC occurrence time and entity IDs/type. Keep journal bodies and other unnecessary private text out of it. Ownership policies and carefully scoped write functions must be reviewed before activation. Define deletion/account-deletion retention and protect client-forged historical events. This would measure history **from activation onward**; existing missing history cannot be truthfully reconstructed. No SQL or event writes are added in this milestone.

## Verification and phone checklist

Tests use simulated database clients/metadata and rendered markup, not live account content or a physical iPhone. They cover owned selection, text-column exclusion, pagination, per-source failures, archived records, snapshot targets, missing versus zero logs, distinct journal dates, reopened/cancelled tasks, leap/year/DST boundaries, quantity-unit separation, denominators, range calculations/navigation markup, accessible tables and immutable inputs. Final checks: `npm test` passed all 223 tests across 33 files; `npm run lint`, `npm run build`, and `npx tsc --noEmit` passed. The final lint check reported no warnings. Statistics was subsequently committed/pushed with approval in `25c8b8e` and Vercel confirmed deployment.

After separately approving the Statistics commit/push/deployment:

1. Open More → Statistics on iPhone. Verify 7/30/90-day dates/counts, including today; check the displayed zone and all themes. Confirm Overview is still a separate destination and old feature controls work.
2. Save a journal entry for a date in the range. Refresh Statistics; that date should count once even after edits/appending multiple notes. Backdate an entry outside the range and confirm it doesn't count inside it.
3. Compare known completed/partial/zero habit logs, including an archived habit and an old target. Only saved logs enter the denominator; blank days must not be labelled missed.
4. Switch quantity habits with different units. Check totals/averages against their exact table rows, including zero versus no log. Switch range and refresh; the selected habit should remain selected. No mixed-unit total should appear.
5. Complete a task in the range, refresh, then reopen it and refresh again. The current-completion count should decrease; it is explicitly not permanent event history. Missing completion dates remain excluded.
6. Check both table regions with touch and a hardware keyboard/VoiceOver if available. Scroll horizontally inside the table on narrow screens; captions/header relationships and source status labels should remain understandable.
7. Interrupt connectivity or cause a source-load failure in a safe test environment. Unavailable data must not become a zero count; unaffected sources can still display their results. Retry and ensure an old response doesn't overwrite a new range.

No physical-phone Statistics check or live Supabase Statistics query has been performed by the agent. The Journal/calendar deployment confirmation is not proof of physical acceptance of those features.
