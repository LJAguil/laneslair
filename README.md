# Lane's Lair

A personal command center for tasks, projects, habits, goals, events, and an AI assistant. Built with Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, and Supabase. Current priorities are dependable tasks and projects for personal use, with mobile access soon.

## Current status

| Feature | Current behaviour |
| --- | --- |
| Authentication | Supabase email/password login, protected routes, sign-out; no public signup UI |
| Tasks | Persistent creation, editing, completion/reopening, deletion, filters, and save errors |
| Inbox | Text capture, editing, archive/restore, and atomic task conversion (new migration required) |
| Today | Quick capture, persisted daily focus, and a short task radar (new migration required for focus) |
| Projects | Supabase creation/editing, Active/Paused/Completed/Archived statuses, task links and progress |
| Habits | Persistent check-ins, water/quantity targets, optional daily or weekly streaks, archive/restore (habits migration required) |
| Goals | Sample data; persistent goals are a later milestone |
| Themes | Classic Lair, Grand Voyage, and Shire Night; saved per browser |
| Events, schedule, notifications | Sample data; changes reset on full refresh |
| Push reminders | Owner verified manual and scheduled iPhone delivery; local UI update adds reminders in task/habit forms and per-item bell actions |
| AI assistant | Simulated replies; no model connection |
| Profile/settings | Prototype state held in memory |

## Local setup

Open a terminal in the project folder containing `package.json`. Node.js and npm are required. The installed Next.js requires Node >=20.9; Vitest supports Node 20, 22, or >=24. Check your versions with `node --version` and `npm --version`.

For a fresh checkout or after dependency changes:

```powershell
npm ci
```

This uses `package-lock.json` to reproduce dependencies. Routine startup does not require reinstalling packages.

### Environment variables

Keep your existing `.env.local` if it is already configured. Otherwise copy `.env.example` to `.env.local` in the project root and fill in the values from your Supabase project settings:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

The URL and publishable key are used in the browser. Row Level Security (RLS) must protect database access. Never put secret/service-role keys or your password here. `.env.local` is ignored by Git; `.env.example` contains only empty placeholders and can be committed.

Restart the development server after changing these values. Public environment variables are embedded during production builds, so a deployed app needs rebuilding when they change.

### Supabase database and account

This checkout expects an existing Supabase project. The original database setup SQL is **not included**, so cloning the repository cannot recreate the database by itself. Do not guess a replacement schema or seed sample tasks.

The existing project reportedly contains `profiles`, `projects`, `tasks`, `habits`, `habit_logs`, `goals`, and `notifications` in `public`. The app queries `tasks`, `projects`, `habits`, and `habit_logs`, plus `inbox_notes` and `daily_focus` after their migrations are applied. Its RLS policies must enforce ownership with `auth.uid() = user_id`. Its description column is `text not null default ''`; missing or whitespace-only notes are stored as an empty string.

Sign in using your existing Supabase Auth account. For a new installation, the owner must create and confirm an email/password account through the Supabase dashboard. There is no signup page. For personal use, also disable public signup in Supabase Auth settings; hiding signup in the UI does not disable the signup API.

### Inbox and Today database setup

Review [the daily-use setup guide](docs/DAILY_USE_SETUP.md) and its proposed migration before using Inbox and persisted focus. The migration adds two tables and one atomic conversion function; it has not been applied to your remote project automatically. Until then, the app shows explicit setup errors for those features, while tasks and projects remain usable.

### Habit and water setup

Review [Habits and themes](docs/HABITS_AND_THEMES.md) and apply only its new `002` migration after approval. It extends the inspected habit tables, preserves existing check-ins, and adds safe incremental logging. Until it is applied, habits show an explicit setup error. Theme switching works independently of the database.

### Start the app

```powershell
npm run dev
```

Open [localhost:3000](http://localhost:3000). Signed-out visitors are sent to `/login`. Use the address printed by Next.js if it selects another port. Leave the terminal running; press Ctrl+C to stop it.

## Verification

Run each command from the project root and check that it succeeds:

```powershell
npm test
npm run lint
npm run build
npx tsc --noEmit
```

Data-access tests use a simulated Supabase client. Additional tests execute the new Inbox/focus migration and ownership policies in disposable in-memory PostgreSQL using PGlite. They do not contact your database or verify live sign-in, live persistence, or your actual Supabase policies. Use `npm run test:watch` to rerun them as files change. A successful build verifies compilation, not database access.

To try production mode locally, stop the development server, run `npm run build`, then `npm run start`.

## Quick manual check

1. Sign in and create a task with a title and no notes. Refresh and confirm it remains.
2. Edit its title, notes, priority, due date, and status. Save and refresh.
3. Clear the notes and due date, save, and refresh again.
4. Complete and reopen the task, checking persistence after each action.
5. Cancel an edit and confirm nothing changed. Delete a disposable task and refresh.
6. With the app loaded, simulate offline mode in browser developer tools and attempt a save. The form should retain your input and show an error. Restore the connection and retry.
7. Sign out and open `/tasks`; it should return you to login.

Use disposable tasks for deletion checks. Sample features resetting on refresh is expected.

## Project and task-link checks

1. Open Projects and create a project with a name, empty description, and an optional due date. Refresh and confirm it persists.
2. Edit its name, description, date, and status; clear the optional values and refresh again.
3. Create a task with that project selected. Edit an existing task to assign it, move it to another project, or choose No project. Refresh after each change.
4. Complete linked tasks and verify project progress updates. Cancelled tasks do not count toward progress.
5. Edit the project and set its status to Archived. Existing links must remain; archived projects must not be offered for new links. Use the Archived filter and set it back to Active to restore it.
6. Go offline before saving a project. Its form must keep your input and show an error. Restore connectivity and retry.
7. A project-load failure must show an error and retry control on Projects and the dashboard. Task forms must preserve existing links while the project selector is unavailable.

Project deletion is not exposed: use Archived to retain tasks. Project colors are derived from UUIDs for display only; there is no color column in the database. Project due dates are plain calendar dates, with no timezone conversion. Other prototype features still reset on refresh.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Missing Supabase settings | Fill both variables in root `.env.local` and restart Next.js |
| Login rejected | Correct Supabase project, confirmed Auth account, correct email/password |
| No tasks | Confirm the account and project; tasks belong to individual users. Failed requests should show an error and retry |
| Save fails | Read the form error; check actual column definitions and ownership policies before changing anything |
| Another dev server is running | Use the existing server or stop it with Ctrl+C in its terminal |
| Windows permission/lock error during build | Stop the running app server and retry; check permissions and OneDrive file locks if it continues |

Do not share passwords, tokens, or environment values when reporting errors.

## Code map

| Location | Purpose |
| --- | --- |
| `app/(app)/` | Protected feature pages and shared shell layout; parentheses do not change URLs |
| `app/login/` | Login page |
| `components/tasks/` | Task list and shared create/edit form |
| `components/shell/`, `components/ui/` | Navigation and reusable controls |
| `lib/data/` | Owned task/project/capture/focus queries and explicit database-to-UI mapping |
| `lib/store/inbox-state.ts` | Capture/focus state and reliable async actions |
| `database/migrations/` | Reviewed new migrations; original database setup is still missing |
| `lib/store/app-store.tsx` | React context/reducer; task/project actions and sample feature state |
| `lib/supabase/`, `lib/auth/` | Supabase clients, session refresh, login/logout actions |
| `lib/sample-data/` | Sample features other than tasks |
| `lib/types.ts`, `lib/selectors.ts`, `lib/dates.ts` | Domain models, calculations, date conversions |
| `proxy.ts` | Next.js 16 session refresh and route protection |

Before modifying Next.js behaviour, follow `AGENTS.md` and read the relevant installed documentation under `node_modules/next/dist/docs/`.

## Limitations and roadmap

- Due dates use local-noon timestamps; crossing time zones can change the displayed day. Set explicit date/time rules before reminders.
- The current day updates on focus/visibility changes and about once a minute while open. Habit logs use the device's local calendar day; reminder/quiet-hours time zones do not override the habit tracking day.
- Concurrent edits in multiple tabs have no conflict detection or realtime synchronization.
- Automated tests cover task data handling, with no browser coverage yet.
- Database setup definitions still need a reviewed, credential-free record in version control.
- Next: apply the reviewed Inbox/focus migration, manually verify captures and conversion, then approve an HTTPS deployment and test iPhone installation. Persistent water/habits and selectable themes are now implemented locally; apply their reviewed migration and complete the manual checks. Notifications, puzzles, and news follow.

Hosting requires support for the Next.js server because authentication uses Proxy and Server Actions; static file hosting alone is insufficient. Set both public environment variables on the host before building. No deployment was verified during documentation work.

See [the daily-use setup guide](docs/DAILY_USE_SETUP.md) for database setup, deployment, and iPhone tests, and [the next-steps checklist](docs/NEXT_STEPS.md) for the development handoff. The [push/reminder guide](docs/PUSH_REMINDERS.md) covers the optional push foundation, reviewable migration 003, private environment variables and proposed free scheduler. The owner has verified scheduled delivery on iPhone; the next local change improves where reminders are configured. The push-only service worker never caches private pages; offline support is not implemented.
