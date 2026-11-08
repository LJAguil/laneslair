# Optional iPhone push and reminders

## State of this milestone

The owner reports migration 003 (including explicit RLS on the private configuration table) applied successfully, and the push environment variables configured locally and on Vercel. Commit/push is approved for this checkpoint. The agent has not executed remote SQL or sent a live test push. Scheduler activation remains pending separate approval and a successful physical-iPhone test. Existing habits migration 002 and iPhone installation were tested by the owner in the previous milestone.

Settings → Notifications replaces the old session-only notification switches. Enable/Disable applies only to this browser/Home Screen installation. Reminder preferences (pause, quiet hours and their zone) apply to the account across devices. Each task or habit has one optional reminder, managed in that same panel. No permission prompt occurs automatically. Browser support is checked without requesting permission.

## Database review

Review `database/migrations/20261107_003_push_reminders.sql` before running it. It adds:

- `push_devices`: owned subscriptions with browser-generated device IDs and per-device test-send throttling. Public subscription keys/endpoints are treated as private account data, not displayed in the UI.
- `notification_preferences`: account pause, explicit quiet-hours time zone and optional start/end times.
- `reminder_rules`: explicit opt-in and wall-clock time/zone; a date for one-time task reminders, or daily recurrence for habits. Ownership checks include linked task/habit ownership. Item deletion cascades its rules. Original tables and policies are unchanged.
- `push_deliveries`: per-rule/device/calendar-day receipts for duplicate prevention. Authenticated owners can read only their own receipts and cannot write them.
- `lair_private.push_worker_config`: a hash of a new, narrowly scoped worker capability. The schema is not exposed to API roles; client privileges are revoked and RLS is enabled with no client policies (default-deny). Owner-created worker functions retain the access they need. No service-role/secret Supabase key is used.

The owner supplied the read-only report for `public.notifications` on November 7, 2026: owned UUID rows, optional task FK (delete cascade), required title/body/scheduled_at, optional sent_at/read_at, status pending/sent/failed/cancelled, created_at, authenticated ownership RLS, no triggers. This table is left untouched: it lacks subscriptions, habits and per-device delivery state. Existing pending rows are **not** silently sent. The bell popover remains explicitly sample activity; real push status lives in Settings.

The new schema uses known task/project/habit columns from previous integrations. It does not read `tasks.reminder_at`, `due_at` or the old notifications queue to create reminders. No sample data is uploaded. The migration is transactional and intended to be run once, after review, not rerun over existing new tables. It doesn't activate Cron or extensions.

## Proposed free scheduling approach

Verified against official documentation November 7, 2026:

- [Vercel Hobby Cron](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing) allows once/day with hourly precision. It does not meet chosen-time reminders.
- [Supabase Cron](https://supabase.com/docs/guides/cron) supports frequent SQL/HTTP jobs; [pg_cron + pg_net + Vault](https://supabase.com/docs/guides/functions/schedule-functions) is the documented hosted scheduling pattern. We adapt it to call the existing Vercel app with a **new push-only capability**, not the Supabase secret key shown in some examples. No additional service account is connected.
- [Supabase Free](https://supabase.com/pricing) is $0 with 500 MB database storage and 5 GB egress; projects may pause after a week of inactivity. [Vercel Hobby](https://vercel.com/docs/plans/hobby) remains for personal/noncommercial use with capped resources. This design uses these existing plans, not a paid add-on. Dashboard availability and remaining quotas must be checked before activation; free tiers are not a delivery SLA.

Proposed: one Supabase job/minute calls `POST /api/push/dispatch` on the production Vercel HTTPS origin. Vercel verifies the worker bearer secret, uses the public Supabase key plus that same narrowly scoped capability to claim/recheck receipts, and signs/encrypts Web Push server-side with VAPID. The database returns only subscriptions and generic delivery kinds, not arbitrary account data. No browser tab, laptop, service-worker timer or background app session is needed for scheduling.

About 43,200 HTTP ticks per 30-day month, plus pushes. A personal account with a few reminders/devices should stay small, but monitor function usage, database size and job logs. The activation script prunes only this feature's receipts after 90 days and its Cron logs after 7 days. Do not prune unexpired receipt history manually: it prevents same-day repeat sends.

Do not activate any external scheduler or deploy changes without owner approval. `docs/activate-push-scheduler.sql` is a separate reviewable opt-in script, not part of migration 003.

## Environment variables and private setup

Keep actual values in ignored `.env.local` for local development and Vercel Project Settings → Environment Variables for production. `.env.example` contains empty names only. Never commit actual values or paste them into chat.

| Variable | Visibility/purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing public project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Existing public key; RLS remains enforced |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public Web Push application key, embedded at build time |
| `VAPID_PRIVATE_KEY` | Server-only push signing key; never `NEXT_PUBLIC_` |
| `VAPID_SUBJECT` | Server-only contact, `mailto:your-real-email-address` |
| `PUSH_WORKER_SECRET` | Server-only fresh random 32-byte lowercase hexadecimal capability (64 characters), separate from Supabase keys |

Owner-only key generation, when ready (these commands print **new** sensitive values; do not share their output):

```powershell
npx web-push generate-vapid-keys
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Use the first command's public/private VAPID pair; the second is the worker capability. The owner has completed private key configuration; do not regenerate working keys as part of routine deployment. The agent has not printed production credentials. Keep the VAPID pair stable; changing it requires each device to enable notifications again. Public variables require a rebuild/redeploy. Only configure production secrets for the deployment you intend to send from; avoid preview deployments sharing the production sender. Never add a Supabase service-role key.

## Owner activation, after approval

1. Review migration 003 and its new ownership policies; approve it before running in Supabase SQL Editor. Settings gives a distinct setup error until it is applied.
2. Generate/store keys privately as above. Add Vercel production environment variables. For local tests add them to `.env.local` and restart the app. No actual values belong in `.env.example`.
3. Approve commit/push/deployment separately; verify the deployment succeeds. Local changes do not appear automatically in the hosted iPhone app.
4. On the deployed Home Screen app, sign in → Settings → Notifications → Enable → allow permission → Send test notification. First verify this manual delivery before scheduling.
5. Save reminder preferences (required), including zone, optional quiet hours and pause state. Add explicit reminders for selected real tasks/habits. Every item starts opted out; task due dates never opt it in.
6. After reviewing the scheduling proposal, enable `pg_cron` and `pg_net` in Supabase Integrations/Extensions, and use Supabase Vault to create `lair_push_worker_secret` (same value as `PUSH_WORKER_SECRET`) and `lair_app_url` (production HTTPS origin only). Do not use a Supabase service-role key. Vault values are entered privately, not committed SQL literals.
7. Review and run `docs/activate-push-scheduler.sql` to store only the capability hash in the private table and activate the minute job plus history cleanup. Keep Vault and Vercel capability values in sync. Restrict database administrator access: pg_net temporarily queues its Authorization header in its database request queue, as documented by Supabase.
8. Check Cron run history **and HTTP responses** (`net._http_response`, expiry-limited) for delivery errors. A successful `net.http_post` enqueue/Cron run alone does not prove the HTTP worker succeeded. `push_deliveries.outcome='accepted'` means the provider accepted the message, not that an iPhone displayed it. Never copy request headers or subscription values into public logs/issues.

Stop with `cron.unschedule('lair-push-minute')`; stop cleanup separately if desired (commented commands in the activation script). Overall pause is the everyday account control and must be saved. Disable removes the current device's server subscription first, then unsubscribes the browser. Failed cleanup is reported and can be retried. Other devices remain enabled.

## Scheduling and delivery rules

- One one-time reminder per task; one daily reminder per habit. Select an explicit task date/time or habit time and an IANA zone. No automatic default from date-only due dates (which retain the existing local-noon workaround).
- Saved zones stay fixed during travel; they do not follow a moving device implicitly. Quiet hours use their own configured zone. Habit check-ins still use the existing device calendar day. Keep reminder and tracking zones aligned when traveling or near midnight; this milestone does not rewrite the app's habit/date model.
- Habit completion uses that day's persisted log **target snapshot**. Weekly/custom habits also stop nudging once their weekly successful-day target is reached. Incomplete quantity targets remain eligible. Inactive/archived habits, done/cancelled tasks and tasks in archived projects are skipped. Deletion cascades the relevant rules.
- Quiet hours can cross midnight. Quiet-hour occurrences are skipped, not delayed until quiet hours end. Pause suppresses delivery while active; after resuming, a recent occurrence can still catch up within the same ten-minute window. Recent occurrences can also catch up for less than ten minutes after a server outage. A longer outage or free-project pause can miss reminders; there is no backlog flood.
- Task times in nonexistent daylight-saving gaps are rejected by SQL. Repeating habits skip nonexistent local times on spring-forward days. Fall-back times use PostgreSQL's standard-time occurrence and the day/device receipt prevents a second delivery. Reminder eligibility is rechecked immediately before the network send; a completion during the final network request cannot retract a message already accepted by a push provider.
- Claims are atomic and capped at 100 device deliveries per tick, in bounded batches. Only one network attempt is allowed per claimed occurrence. Failed/ambiguous sends are **not retried automatically**: this prioritizes avoiding duplicates over guaranteed delivery. Editing an existing rule does not resend it to the same device on the same day. Deleting/recreating a rule or disabling/re-enabling a device starts a new registration and can intentionally create a fresh occurrence.
- Provider 404/410 responses remove expired devices. Expired browser subscriptions, permission denial/revocation, failed saves and unavailable setup produce recovery instructions. Enable renews an orphaned/expired browser subscription. A failed registration leaves Enable available to retry. Tests are limited to one per device per 30 seconds.
- Web Push is best effort. iPhone Focus, OS settings, connectivity and provider expiration can suppress/delay it. TTL is five minutes; messages aren't meant to arrive hours late. Lock-screen content is generic and clicking opens the app, where normal authentication still applies.
- A push-only service worker handles push/click, with no fetch listener, caches, session data or offline private pages. Only exact `/sw.js` is excluded from route auth. Only exact `/api/push/dispatch` bypasses session redirect and still requires its own bearer authorization. Server Actions independently verify `getUser()` and ownership. Outbound destinations are restricted to recognized HTTPS push providers to prevent arbitrary URL requests.

## Verification and physical iPhone checklist

Final local checks on November 7, 2026: `npm test` passed **124 tests across 19 files**; `npm run lint`, `npm run build`, and `npx tsc --noEmit` passed. Build output identifies `/api/push/dispatch` as dynamic. A production-server smoke check returned `/sw.js` **200** with `no-store`, unauthorized POST dispatch **401** with `private, no-store`, and GET dispatch **405**. No push was sent. Temporary test servers were stopped afterward.

Issues found and fixed during verification: the current Web Push 4 package requires named imports, and the local Next/Tailwind worker needed generated build caches cleared after a worker startup failure. The subsequent clean and final builds passed. Lint has no warnings/errors. Dependency installation reported 8 moderate audit advisories, matching the previous checkpoint's count; no force-upgrade or unrelated dependency remediation was performed. Earlier restricted runs failed on local test cache/process/network permissions and were rerun successfully with normal access.

Automated tests use mocked browser/transport behavior and temporary PGlite PostgreSQL, never the live Supabase project or your password. They cover account isolation, foreign item rejection, private delivery receipts, worker authorization, device removal, throttling, explicit scheduling, quiet hours, DST, completion, weekly/quantity targets and deduplication. Service-worker tests simulate generic content and safe click destinations. They cannot prove a real push service accepts our subscription or that iOS displays it.

After approved deployment/database setup:

1. Open the installed Home Screen app on iOS 16.4+; no permission prompt should appear until tapping Enable. Check the installation explanation if opened in a regular iPhone browser tab.
2. Enable → allow → send test; expect one generic message. Tap it and verify normal sign-in protection. Repeat test immediately to check the 30-second throttle. Try denial on a spare browser/install; verify settings guidance instead of repeated prompts.
3. Enable a second device. Disable the first; only the second should receive its own test/reminders. Disable is per device; overall saved pause should stop automatic reminders on both. Manual tests are still allowed while paused.
4. Save preferences. Schedule an incomplete task 3–5 minutes ahead in your zone. Close the app/lock the phone. Expect one message after the scheduler tick; a task with only a due date must not notify.
5. Schedule a habit below its target; expect one reminder. On a second occurrence/day, meet the target before its time; expect none. Check weekly target completion, archive, task done/cancelled, deletion and archived-project cases.
6. Place a reminder inside quiet hours; expect none. Test pause, save, close the app and verify no reminders. Restore preferences afterward.
7. Refresh and reopen Settings to verify reminders persist. Try a failed connection while saving: input remains and the error is distinct from an empty list. Check notification state after revoking permission or clearing site data; renew with Enable when permitted.
8. Compare provider acceptance/receipt counts with displayed notifications. Record device iOS version, zone and approximate delivery lag without sharing secrets. Only after this is live iPhone delivery verified.
