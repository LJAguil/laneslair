# Next steps

Direction: personal use, dependable tasks and projects first, mobile access soon. Task creation is reported working. Use the README manual checklist to confirm editing and refresh persistence before saving a development milestone.

## 1. Save the current baseline

- Run the short manual checklist in the README.
- For any failure, record the action, expected result, actual result, and error text. Exclude passwords, tokens, and environment values.
- Review the pending authentication/task changes and save a Git checkpoint when ready. This documentation work does not commit or push anything.

## 2. Review the existing project schema

Before implementing projects, obtain the definition of `public.projects` from Supabase, including:

Open your project in the Supabase dashboard, open **SQL Editor**, and start a new query. Paste the contents of [inspect-projects.sql](inspect-projects.sql), then run it. Copy the entire `schema_report` result cell and share it for review. The query reads only metadata, including RLS policies and constraints; it does not read your project records or change anything. Review custom trigger function definitions for sensitive hard-coded values before sharing.

- Column names, types, defaults, and nullability.
- Status enum values or CHECK constraints.
- Primary/unique keys and foreign keys, especially `(id, user_id)` referenced by tasks.
- RLS enabled status and policy definitions: roles, commands, USING and WITH CHECK conditions.
- Triggers affecting ownership, inserts, updates, or timestamps.

Share schema definitions only, without credentials or row contents. Existing SQL can be reviewed without executing it. The original setup SQL is not in this checkout yet.

## 3. Implement persistent projects

1. Add typed project queries and explicit mapping to the current UI model.
2. Load real projects with separate loading, empty, and error states.
3. Add creation and editing. Decide how archive/delete should handle linked tasks before implementing it.
4. Enable task-project selection with real UUIDs belonging to the signed-in user.
5. Verify task progress/counts, refresh persistence, failed saves, and ownership protections.

Do not seed sample projects or change database definitions without reviewing the need first.

## 4. Bring it to the phone

Start with an authenticated HTTPS deployment of the responsive website. Check task capture and project navigation on your phone. Then decide whether an installable web app meets near-term needs or a dedicated mobile app should start, using the same Supabase backend.

Before adding reminders, decide whether a due date means a calendar day or a precise time, and which time zone governs it. The current local-noon workaround is not a complete reminder strategy.

## Verification record

During the October 29, 2026 status review, 17 automated tests passed, and lint, production build, and TypeScript checks passed. They did not verify live sign-in or write to Supabase. Run checks again after code changes; this record is not a guarantee about later changes.
