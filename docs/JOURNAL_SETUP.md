# Journal: setup and verification

## Current state

The owner approved publishing the Journal and calendar checkpoint; physical-phone Journal checks remain pending. The agent has not executed remote SQL, changed existing Supabase data/policies, deployed, committed, or pushed this milestone. At inspection, the owner supplied the read-only `docs/inspect-journal.sql` report: Inbox matched migration 001, had ownership RLS and no triggers, and the three journal tables did not exist. The owner subsequently reported that migration 004 ran successfully. Do not rerun it for the calendar milestone; live Journal UI/phone checks are still separate from that schema confirmation.

The typed data layer uses the existing Supabase browser client and verified-ID store convention. Mutations additionally derive ownership inside PostgreSQL from `auth.uid()`. No new packages, environment variables, service-role key, password, AI provider, cache, or scheduler configuration is needed.

## Review migration 004 before applying

Review `database/migrations/20261107_004_journal.sql`. It creates only:

| Object | Purpose and access |
| --- | --- |
| `journal_entries` | One nonempty plain-text entry per owner/calendar date, with a monotonically increasing revision. Authenticated owners can select their own rows; direct client writes are revoked. |
| `journal_sources` | A separate receipt linking an owned Inbox capture to its original journal entry/date. One receipt per owner/capture prevents duplicate appends, even if a retry chooses another date. Clients can read their own links but cannot write/retarget them. |
| `journal_write_operations` | Save retry receipts: UUID, destination metadata, expected revision and a body hash, not another copy of journal text. RLS is enabled with no client policies/grants. |
| `save_journal_entry(...)` | Authenticated ownership-checked create/edit with expected revision, date-scoped transaction lock and idempotent operation UUID. |
| `append_capture_to_journal(...)` | Authenticated capture ownership check, preview-body comparison, note/date locks, atomic append plus source receipt, with safe replay. |

All new tables explicitly enable RLS. Functions have a fixed empty search path, qualify table references, revoke PUBLIC/anon execution and grant only authenticated execution. Source and entry writes occur in a single transaction; failure to record a receipt rolls back the entry mutation too. Blank/whitespace-only entries and combined entries over the size limit are rejected. UI/data validation caps entries at 100,000 characters.

The migration doesn't alter Inbox/task rows, columns, policies, task-conversion RPCs or reminder behavior. In particular, `converted_task_id`/`converted_at` are not repurposed for journal links. The same capture can have both a task and journal copy.

Links and save receipts deliberately have no cascading FK to entries or notes. This preserves the fact that a capture/save was already handled if an administrator later removes a source or destination. User IDs do retain the auth-user FK with account-delete cascade. Link creation is restricted to the ownership-checked RPC; clients cannot forge links. If a destination is removed, replay returns unavailable rather than recreating content automatically. There is no entry-delete UI in this milestone.

Only after approval, run the **whole** migration once as the database owner in Supabase SQL Editor. Success/no rows is normal for schema creation. It is transactional; an unexpected existing table/function name should stop/roll back. Do not drop existing objects or remove security statements to make it run; share the error text for review. Do not rerun migrations 001–003.

## How to use it

- Open **Journal** from the sidebar, phone **More**, or Today's top links. It opens the local calendar day by default; date navigation and `?date=YYYY-MM-DD` open another date. Dates are stored as DATE, not midnight UTC or task due timestamps.
- Write in the plain-text editor and tap **Save entry**. Saved dates appear in Your pages. Refresh saved entry reloads server content without discarding an unsaved draft.
- In **Inbox**, use **Add to journal** next to **Make this a task**, choose the date (today by default), and review the append preview. Existing saved text is separated from the note by a blank line. The transaction preserves writing saved by other devices before confirmation. The preview doesn't include unsaved editor drafts.
- The original capture remains editable in Inbox. Its task and journal copies are independent. A note can be both task-linked and journalled; it appears in both relevant filters. Journalled notes are excluded from the unsorted Inbox/Today count without being auto-archived or deleted.
- Existing links show the journal date. If a linked entry disappears, the UI explains that the original note is kept and links to the date. A deleted original doesn't remove saved journal writing. A repeated append resolves to its original destination/date and doesn't append edited source text again. For a genuinely new reflection, create a new capture or write directly in Journal.
- Journal links have separate loading/error states. If setup or requests fail, task conversion and existing Inbox captures still work. Unsorted counts are withheld when journal-link status is unknown; the Inbox list explains that it may temporarily include already-journalled captures.

## Drafts and conflicts

No autosave is claimed. Unsaved drafts are held per date in the signed-in app's React state, so moving between dates/pages and returning preserves them. They are **not written to localStorage**, sent to a third-party service, cached in a service worker, or server-rendered into a shared cache. Authenticated data stays in the existing client data flow and owned Supabase rows.

Save before refreshing, closing, signing out or switching accounts. A best-effort browser leave warning applies while any journal draft is dirty, but iPhone can terminate an app without a warning. This is not offline journaling or guaranteed crash recovery.

Save failures preserve input and retain the same operation ID for a matching retry. If the original save succeeded but its response was lost, replay returns the current saved entry rather than making a second entry or overwriting a newer revision.

If another device edits or appends while a draft is open, the old expected revision cannot overwrite it. The editor keeps your draft and shows the current saved text. Choose **Combine saved entry + my draft**, review/remove repeated passages, and save explicitly, or choose **Use saved version · discard my draft**. Combining is an editor change only. It intentionally keeps both full texts rather than attempting an unsafe automatic text merge.

If a previously confirmed entry was removed, the draft is retained and replacement requires explicit review/action. Cancel/discard before saving changes no remote content. Cancelling an append writes neither the note nor the journal.

## Local validation versus live checks

Tests execute migration 004 in disposable PGlite PostgreSQL alongside migration 001, use simulated Supabase clients/store requests, and render UI markup with mock state. They cover ownership, one entry per date, stale revision rejection, duplicate append/save replay, operation mismatch, rollback, source preservation, both task/journal links, missing records, date mapping, error/empty separation and draft recovery. Queued/interleaved local tests don't prove multi-connection network behavior on the live project.

No live Journal query or mutation has been run by the agent. No physical iPhone editing, keyboard or two-device concurrency test has been performed for this milestone. Existing task/habit/reminder/game regressions remain part of the full suite.

Final local checks passed: `npm test` (**189 tests across 28 files**), `npm run lint` (no warnings/errors), `npm run build` (including `/journal`), and `npx tsc --noEmit`. An initial SQL-fixture cleanup failure was corrected by including its existing `daily_focus` FK table in the disposable fixture's truncate list. No production schema change was needed for that test correction. The final tests/build are successful; live Supabase and physical-phone checks remain pending.

## Owner checklist after reviewed SQL and approved deployment

1. Apply migration 004 once. If testing locally, run `npm run dev`; no new keys are needed. To test on the hosted phone app, approve commit/push separately and wait for Vercel Ready.
2. On iPhone, open Today → Journal. Save a short entry, refresh, and verify the selected date and text persist. Edit and save; ensure Your pages has only one entry for the day. Test yesterday and a leap-day date independently.
3. Leave an unsaved draft, open another date/Inbox, then return. It should remain in memory. Discard it explicitly and verify the saved entry is unchanged. Don't rely on an unsaved draft surviving a refresh/closed app.
4. Capture a note → Add to journal → choose today → inspect preview → Cancel. Neither source nor entry should change. Repeat and confirm; existing writing plus one copy of the note should remain after refresh.
5. Check In journal and Today’s unsorted count. The source stays in Inbox's journalled filter. Make that source a task as well; verify both links remain and its journal copy doesn't change when you edit the source.
6. Retry the same note from another tab/device or after an uncertain response. It should report already added and retain the original entry date, without a second paragraph/copy.
7. Open an entry in phone and desktop. Make an unsaved edit in A; save different text or append an Inbox note in B. Save A: expect a conflict with A's text retained and B's saved text available. Combine/review explicitly and save. Verify both desired texts on refresh. Repeat with two initially empty views of the same date: only one entry may be created.
8. Interrupt connectivity during a save/append. Input/source/date should remain, no false success should appear, and a matching retry should confirm/recover the original operation. Resume connection and verify one entry/append. A long combined entry should fail without truncating or losing earlier text.
9. Check phone keyboard, portrait/landscape, date navigation, long lines, all themes and the scrollable More menu. Verify task creation/conversion, habit logging, reminder bells, Rune Lock and notifications still work.
10. If you already have another test account, verify its journal/dates/source links are separate. Don't create a public signup flow or share passwords to run this check. Automated tests cover ownership using fake local users.
