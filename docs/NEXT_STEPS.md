# Next steps

Lane's Lair is for personal use, with iPhone access first. Its daily loop is Capture → Choose → Check in → Play.

## Current baseline

- Authentication and task persistence were saved and pushed in checkpoint `d450d51`.
- Projects, task linking, Inbox, Today, and installation preparation were saved in checkpoint `d023c12`.
- The new milestone adds Inbox capture, atomic task conversion, a simpler Today page with daily focus, an Overview page for the original widgets, and iPhone installation assets.
- The owner deployed the Inbox/Today milestone on Vercel and reported successful sign-in, capture/conversion/focus checks, Home Screen use, and keyboard usability on iPhone.
- The owner reports successful application of habit migration `002`, working habit/water tracking, and approval of the three themes. The habit page now has one New habit entry point for all habit types.
- The owner approved publishing this milestone. Check the resulting Vercel deployment on the installed iPhone app after the push.

## Immediate owner actions

1. Do not rerun the already-applied habit migration. Keep [HABITS_AND_THEMES.md](HABITS_AND_THEMES.md) for new-environment setup and the acceptance checklist.
2. Sign in locally and verify water/quantity logging, check-ins, optional streaks, archive/restore, historical goals, failed-save retry, and each theme.
3. Verify that the approved habit/theme checkpoint deployed successfully on Vercel.
4. Verify the resulting Vercel deployment on the installed iPhone app, including theme persistence and water tracking.

Use the manual checklist in the setup guide. Share error text when a step fails, without credentials or private row contents. Keep the original database setup SQL if you find it; this repository contains only the new migration and the read-only projects inspection query, not the original seven-table setup.

## Follow-on milestones

1. Confirm the simplified New habit flow and published water/habit tracking on iPhone.
2. The push foundation is saved in `76ec473`; the owner reports successful migration 003, configured keys, scheduler activation, and manual plus scheduled iPhone delivery. The owner approved publishing the UI follow-up that adds reminders in task/habit forms and per-item bell actions, with device/global preferences kept in Settings. Next verify create/edit/cancel/retry on iPhone after the resulting Vercel deployment. Explicit reminder dates/times remain independent of task due dates. See [PUSH_REMINDERS.md](PUSH_REMINDERS.md).
3. Refine the new Classic Lair, Grand Voyage, and Shire Night themes based on daily use.
4. The owner approved publishing the [Today and Rune Lock milestone](TODAY_AND_PLAY.md): improved daily layout, upcoming reminder preview and a working daily symbol puzzle. Test on iPhone after an approved push. Puzzle progress is device-local per account; cross-device sync and additional games (including chess) are later additions.
5. Add interest-based news with source attribution and spoiler controls.
6. Revisit a dedicated mobile app based on actual limitations of the installed website.

Do not add dummy puzzle, water, news, or notification controls to Today in advance of working implementations.

## Existing schema considerations

The reviewed projects schema permits Active, Paused, Completed, and Archived. Archiving retains tasks, and the existing composite foreign key requires task/project ownership to match. The inspected grants included TRUNCATE for anon and authenticated roles; review that separately. This feature work changes no existing table definitions, grants, or policies.

Automated data-access tests use simulated clients. The new Inbox migration is additionally tested in disposable local PostgreSQL for ownership, rollback, and repeat conversion. Those tests do not verify the live Supabase project, multi-device behaviour, or physical-iPhone installation and delivery.

## Next approved product direction

See [the ordered roadmap and six copyable prompts](ROADMAP_AND_PROMPTS.md): Journal with one entry per day and Add to journal from Inbox; habit calendar; balanced Statistics including journaling; a multi-game hub with account-synced progress; daily chess with selectable difficulty; and original symbolic-association riddles. These follow-on features are planned, not implemented by the Today/Rune Lock checkpoint.

Milestone 1 supplies private daily Journal, atomic/idempotent Inbox appends, independent task links and draft/conflict handling. The owner applied migration 004 successfully. Journal/calendar checkpoint bee9e66 is published with owner approval; see [JOURNAL_SETUP.md](JOURNAL_SETUP.md) for phone/two-device checks. The agent has performed no remote SQL.

Milestone 2 supplies Habits/Calendar views, month/date navigation, archived/per-habit filters, and read-only saved-log details with historical targets and explicit no-log/weekly semantics, also published in bee9e66. See [HABIT_CALENDAR.md](HABIT_CALENDAR.md). No new SQL is needed; physical-iPhone checks remain pending.

Journal/calendar checkpoint `bee9e66` is now pushed and Vercel confirmed Deployment has completed. Phone/two-device acceptance still needs the owner. Milestone 3 is published in `25c8b8e` (Vercel deployment completed): [Statistics](STATISTICS.md) adds real owned 7/30/90-day journal, habit, selected-quantity and currently-done-task metrics without adding event history, sample values, new SQL or game totals. Physical-iPhone Statistics acceptance remains an owner check. Milestone 4 is now implemented locally and remains uncommitted: [Daily Play sync setup](DAILY_PLAY_SYNC.md). Review migration 005 before account activation; do not execute remote SQL or publish this milestone without separate approval. The owner reports 005 applied. Milestone 5 now adds daily chess locally: [Daily chess](DAILY_CHESS.md). Migration 006 remains review-only; milestones 4–5 remain uncommitted/undeployed. Echoes follows after chess and two-device acceptance.
