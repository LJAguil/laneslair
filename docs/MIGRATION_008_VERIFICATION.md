# Migration 008 — application and verification record

## Result

Applied successfully on 2026-11-09 to Lane's Lair's configured Supabase project using the newly authorized Supabase integration. Project identity was compared with the non-secret public Supabase hostname in the local configuration. No key/password values or private journal/habit records were returned to the assistant.

- Local file: `database/migrations/20261109_008_journal_additions.sql`
- Applied name: `journal_timestamped_additions_008`
- Supabase migration version: `20261109192930`
- Reviewed file SHA-256: `9DF1612E482B71A5A37DA8C61EED3AB714B308118E1C8CDE5530C177B45A8D21`
- Result: migration tool returned success; schema and migration history verified afterward.

Do not rerun 008. Earlier SQL scripts were applied manually and were not listed in migration history; their actual schema/functions were present. Do not interpret missing historical migration records as permission to replay older SQL or run a bulk migration push. Baseline/history reconciliation is separate future work.

## Preflight and checks

The live journal/Inbox columns, policies, constraints and journal function definitions matched the expected pre-008 state. New additions/receipt tables, conversion flag and legacy helper were absent before application. The reviewed file was applied unchanged in its transaction. Applying it did not convert or rewrite existing journal body text; conversion happens only during a later addition/Inbox save.

Post-application metadata confirmed:

- RLS enabled on journal entries, additions and addition-write receipts.
- `authenticated` can select additions only through the owner policy; it cannot directly insert/update/delete these tables. `anon` cannot select them.
- Addition-write receipts have no client SELECT/write grants. Their policy-free RLS is deliberate default-deny.
- The three intended journal API functions are executable by `authenticated`, not `anon`, with SECURITY DEFINER, empty search paths and actor checks.
- `save_journal_entry_legacy` is not executable by `anon` or `authenticated`.
- Added/edited timestamps, revisions, owner-matching foreign key and uniqueness constraints match the reviewed migration.
- A rollback-only smoke check cleared JWT claims, assumed the authenticated role and attempted a synthetic addition. It was rejected with `42501` before journal data access; no test journal record was saved.

No private rows, text lengths, journal-day counts, habit values, account emails or auth tokens were queried. Actual create/edit/append/concurrent-save tests remain the previously passing temporary-local-PostgreSQL tests, not live writes against the owner's data. Physical iPhone/two-device acceptance is still pending.

## Security advisor observations

Advisors were inspected before and after application. These findings are not proof of a data breach and were not resolved through unrelated production changes:

- [RLS enabled without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy): private receipt/config tables intentionally use default-deny. The new `journal_addition_writes` table was verified to have no client grants.
- [Anonymous SECURITY DEFINER endpoints](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable): three existing secret-gated push-worker functions need review in the privacy/access milestone. Their grants were not changed as part of 008.
- [Authenticated SECURITY DEFINER endpoints](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable): existing owned write RPCs and the new addition endpoint are flagged for review. The new endpoint's authentication/ownership, search path and grants were checked; this is not a full audit of every older RPC.
- [Leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection): pre-existing Auth advisory. Check plan availability/cost and account-security choices before changing it.

## What remains

The phone-typing/timestamped-journal UI remains local and uncommitted. It must be published separately before the owner can use it on the deployed iPhone app. Old whole-page writes are intentionally blocked once a day is converted to additions; publish the updated UI before using the new flow. Migration 008 does not encrypt journal text.

The Supabase connection is now authorized and can be used for reviewed migrations while the owner chats from a phone. This does not make it schema-only or remove administrative access to readable data. No global permission changes, disconnect, encryption activation, app commit/push or deployment were performed in this migration step.
