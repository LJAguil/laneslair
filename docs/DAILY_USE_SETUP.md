# Inbox, Today, and iPhone setup

## What is ready

- Quick capture saves unorganized text to Inbox. Existing New task buttons still create tasks.
- Inbox supports editing, archiving/restoring, and making a capture into a task with the existing task form.
- Conversion preserves the note and records its task ID. A transaction and row lock prevent partial conversion and repeated requests from creating another task.
- Today shows quick capture, one user-chosen focus for the local calendar day, and up to five relevant tasks. Focus persists across refreshes and devices for that day.
- The manifest and PNG icons support Home Screen installation. The next optional push milestone adds a push-only service worker from notification settings, without offline capture or private-content caching. See [PUSH_REMINDERS.md](PUSH_REMINDERS.md) before activation.

## 1. Review and apply the new database setup

The app now needs two new tables and one function. The existing tasks/projects definitions are not changed. **This migration has not been run against your Supabase project by the agent.**

1. Review [20261107_001_inbox_focus.sql](../database/migrations/20261107_001_inbox_focus.sql).
2. Open the correct Supabase project, then SQL Editor, and start a new query.
3. Paste the complete migration and run it once as the project database owner.
4. Confirm it finishes successfully. Refresh the app, or use Retry Inbox / Retry focus.

The migration runs in a transaction. Existing table names cause it to fail rather than overwrite anything. If you see an error, share the error text before retrying; do not drop existing tables to make it succeed.

### Tables and access

- `inbox_notes`: owned text captures, archive timestamps, conversion history, and created/updated timestamps. RLS permits each signed-in user to read/write their own captures. Column grants prevent direct writes to conversion history. Anonymous access is revoked.
- `daily_focus`: one selection per account, tagged with a calendar day. RLS checks both ownership of the focus row and ownership of its selected task. Deleting the task clears the reference.
- `convert_inbox_note`: a restricted `SECURITY DEFINER` function, callable only by authenticated users. It derives ownership from `auth.uid()`, uses a fixed empty search path and fully qualified tables, explicitly checks note/project ownership, locks the note, and writes the task and conversion link together. It uses no service-role key. If the original task was deleted, retry returns the history without recreating the task.

The app's automatic tests run the migration against a representative schema in disposable local PostgreSQL (PGlite), including ownership, rollback, and replay tests. They do not prove compatibility with every additional constraint or trigger your live database may have. The existing table definitions available during implementation were the supplied task schema and the inspected projects report.

Do not edit conversion history manually. The conversion function is intentionally the only app-accessible path that creates it. Editing a converted note does not change the task; edit the task on Tasks.

## 2. Test locally

Run `npm run dev` and sign in yourself. Start with disposable notes/tasks.

1. Capture a multi-line idea from Today. Open Inbox and refresh; the full text should remain.
2. Edit it, cancel another edit, archive it, and restore it from Archived. Refresh after each saved change.
3. Choose Make this a task. Change its title/priority/date/project, then save. The task should appear on Tasks, and the note should move to Made into tasks with its original text and a task link.
4. Confirm the task and note link survive refreshing. Repeat from a second tab with an already-open conversion form: it must return the same task rather than create a duplicate.
5. Delete a disposable converted task. Its note must retain conversion history and must not offer a fresh conversion.
6. Choose an open task as Today's focus. Refresh to confirm persistence. Complete it, then choose another or select No focus selected and save.
7. Simulate offline mode before saving a capture, edit, conversion, or focus. Show an error, keep the current input/selection, restore the connection, and retry. If an earlier capture save actually succeeded but its response was lost, retry with unchanged text should recover it. If the text changed, the form offers Keep edits as a new capture.
8. Verify existing tasks, projects, status filters, task linking, and sign-out still work.

If setup is missing, Inbox and focus show explicit setup/retry errors. Existing tasks/projects remain available. Unsaved text is held only in the current form; navigating away or refreshing can discard it. This milestone has no offline queue or durable local drafts.

## 3. Prepare an HTTPS deployment

Deployment is a separate action requiring your approval; nothing is published automatically.

1. Review and commit the intended code after local checks. Keep `.env.local` excluded.
2. Choose a host that supports the Next.js server runtime, Proxy, and Server Actions. Static-file-only hosting cannot run this app's authentication.
3. Connect the repository and intended branch. Use the committed lockfile to install, `npm run build` to build, and `npm run start` if the provider requires a start command.
4. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` on the host before building. Never supply a secret/service-role key.
5. Deploy to an HTTPS URL. If environment variables change, rebuild. Sign in and verify tasks/projects/notes belong to the expected account.
6. While signed out, ensure `/inbox`, `/tasks`, and `/projects` redirect to `/login`, while `/manifest.webmanifest` and icons load normally.

Localhost is for development; the phone's localhost is the phone itself. A hosted HTTPS URL is the intended way to use this from your iPhone without leaving your laptop running.

## 4. Test on iPhone

1. Open the deployed HTTPS URL in Safari. Use Share → Add to Home Screen (wording may vary by iOS version).
2. Launch Lane's Lair from its icon. Sign in there if asked; the installed app may have a separate session from your Safari tab.
3. Check the app name/icon, standalone window, notch clearance, bottom Home indicator, portrait and landscape layouts.
4. Open Quick capture and type multiple lines with the keyboard open. Verify the save button is reachable, the dialog scrolls, and controls do not trigger unwanted zoom. Save and refresh.
5. Use Today, Inbox, Tasks, and Projects in the bottom bar; open More for Overview, Habits & Goals, Discover, AI Assistant, and Settings.
6. Repeat note conversion and focus selection. Background the app and return; verify confirmed saves remain.

Desktop tests and viewport adjustments cannot substitute for this physical-device check. Neither installation nor push delivery on an actual iPhone has been verified by the agent.

## Later milestones

Water intake, configurable habit targets, optional streaks, and themes are implemented; see [HABITS_AND_THEMES.md](HABITS_AND_THEMES.md). Optional push delivery, explicit reminder times, zones and quiet hours are now prepared locally; see [PUSH_REMINDERS.md](PUSH_REMINDERS.md) for review, activation and physical-device checks. An original daily guessing puzzle, chess and interest-based news follow later. None has been added as a nonfunctional placeholder on Today.
