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
2. Review the locally prepared optional push milestone in [PUSH_REMINDERS.md](PUSH_REMINDERS.md): migration 003, private VAPID/worker settings, approved deployment, then separate Supabase Cron activation and physical-iPhone delivery testing. Explicit reminder dates/times are independent of task due dates. The owner reports migration 003 applied and push environment variables configured, and has approved commit/push. Next verify the Vercel deployment and a test notification on the installed iPhone app before separately approving scheduler activation.
3. Refine the new Classic Lair, Grand Voyage, and Shire Night themes based on daily use.
4. Add an original daily guessing puzzle, then chess puzzles.
5. Add interest-based news with source attribution and spoiler controls.
6. Revisit a dedicated mobile app based on actual limitations of the installed website.

Do not add dummy puzzle, water, news, or notification controls to Today in advance of working implementations.

## Existing schema considerations

The reviewed projects schema permits Active, Paused, Completed, and Archived. Archiving retains tasks, and the existing composite foreign key requires task/project ownership to match. The inspected grants included TRUNCATE for anon and authenticated roles; review that separately. This feature work changes no existing table definitions, grants, or policies.

Automated data-access tests use simulated clients. The new Inbox migration is additionally tested in disposable local PostgreSQL for ownership, rollback, and repeat conversion. Those tests do not verify the live Supabase project, multi-device behaviour, or physical-iPhone installation and delivery.
