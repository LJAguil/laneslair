# Lane's Lair

A personal command center for tasks, projects, habits, goals, events, and an AI assistant. Built with Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, and Supabase. Current priorities are dependable tasks and projects for personal use, with mobile access soon.

## Current status

| Feature | Current behaviour |
| --- | --- |
| Authentication | Supabase email/password login, protected routes, sign-out; no public signup UI |
| Tasks | Persistent creation, editing, completion/reopening, deletion, filters, and save errors |
| Projects | Sample data; task-project linking disabled until real projects are integrated |
| Habits and goals | Interactive sample data; changes reset on full refresh |
| Events, schedule, notifications | Sample data; changes reset on full refresh |
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

This checkout expects an existing Supabase project. The original database setup SQL and migrations are **not included**, so cloning the repository cannot recreate the database by itself. Do not guess a replacement schema or seed sample tasks.

The existing project reportedly contains `profiles`, `projects`, `tasks`, `habits`, `habit_logs`, `goals`, and `notifications` in `public`. Currently only `tasks` is queried by the app. Its RLS policies must enforce ownership with `auth.uid() = user_id`. Its description column is `text not null default ''`; missing or whitespace-only notes are stored as an empty string.

Sign in using your existing Supabase Auth account. For a new installation, the owner must create and confirm an email/password account through the Supabase dashboard. There is no signup page. For personal use, also disable public signup in Supabase Auth settings; hiding signup in the UI does not disable the signup API.

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

Tests use a simulated Supabase client. They do not contact your database or verify live sign-in, persistence, or RLS. Use `npm run test:watch` to rerun them as files change. A successful build verifies compilation, not database access.

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
| `lib/data/tasks.ts` | Task database queries and explicit database-to-UI mapping |
| `lib/store/app-store.tsx` | React context/reducer; task actions and sample feature state |
| `lib/supabase/`, `lib/auth/` | Supabase clients, session refresh, login/logout actions |
| `lib/sample-data/` | Sample features other than tasks |
| `lib/types.ts`, `lib/selectors.ts`, `lib/dates.ts` | Domain models, calculations, date conversions |
| `proxy.ts` | Next.js 16 session refresh and route protection |

Before modifying Next.js behaviour, follow `AGENTS.md` and read the relevant installed documentation under `node_modules/next/dist/docs/`.

## Limitations and roadmap

- Due dates use local-noon timestamps; crossing time zones can change the displayed day. Set explicit date/time rules before reminders.
- There is no midnight timer for the stored current day. Refresh after leaving the app open overnight.
- Concurrent edits in multiple tabs have no conflict detection or realtime synchronization.
- Automated tests cover task data handling, with no browser coverage yet.
- Database setup definitions still need a reviewed, credential-free record in version control.
- Next: verify tasks, save a Git checkpoint, persist projects and enable task linking, then improve mobile access. Habits, goals, reminders, and real event/AI services follow.

Hosting requires support for the Next.js server because authentication uses Proxy and Server Actions; static file hosting alone is insufficient. Set both public environment variables on the host before building. No deployment was verified during documentation work.

See [the next-steps checklist](docs/NEXT_STEPS.md) for the next development handoff.
