# Next steps

Lane's Lair is for personal use, with iPhone access first. Its daily loop is Capture → Choose → Check in → Play.

## Current baseline

- Authentication and task persistence were saved and pushed in checkpoint `d450d51`.
- Projects and task-project linking are implemented locally, and the owner reports that manual tests worked. Those changes remain part of the pending working tree.
- The new milestone adds Inbox capture, atomic task conversion, a simpler Today page with daily focus, an Overview page for the original widgets, and iPhone installation assets.
- The Inbox/focus migration has not been run against Supabase. No deployment, commit, or push was performed for this milestone.

## Immediate owner actions

1. Review the new SQL and follow [DAILY_USE_SETUP.md](DAILY_USE_SETUP.md) to apply it once to the correct project.
2. Sign in locally and verify capture, editing, archive/restore, conversion, daily focus, refresh persistence, and failed-save recovery.
3. Review and approve a Git checkpoint of the projects and daily-use milestone after those checks.
4. Choose and approve an HTTPS deployment; test Home Screen installation and keyboard behaviour on the physical iPhone.

Use the manual checklist in the setup guide. Share error text when a step fails, without credentials or private row contents. Keep the original database setup SQL if you find it; this repository contains only the new migration and the read-only projects inspection query, not the original seven-table setup.

## Follow-on milestones

1. Persist water intake and let the owner choose a daily target.
2. Add optional task/water push reminders, server-side scheduling, quiet hours, and physical-iPhone delivery testing. Resolve task date/time-zone semantics first.
3. Add selectable themes inspired by the owner's interests, preserving readable controls and layouts.
4. Add an original daily guessing puzzle, then chess puzzles.
5. Add interest-based news with source attribution and spoiler controls.
6. Revisit a dedicated mobile app based on actual limitations of the installed website.

Do not add dummy puzzle, water, news, or notification controls to Today in advance of working implementations.

## Existing schema considerations

The reviewed projects schema permits Active, Paused, Completed, and Archived. Archiving retains tasks, and the existing composite foreign key requires task/project ownership to match. The inspected grants included TRUNCATE for anon and authenticated roles; review that separately. This feature work changes no existing table definitions, grants, or policies.

Automated data-access tests use simulated clients. The new Inbox migration is additionally tested in disposable local PostgreSQL for ownership, rollback, and repeat conversion. Those tests do not verify the live Supabase project, multi-device behaviour, or physical-iPhone installation and delivery.
