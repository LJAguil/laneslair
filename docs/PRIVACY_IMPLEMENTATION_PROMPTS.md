# Privacy implementation prompts

Use these in order, one prompt per phase. They implement `docs/PRIVACY_MILESTONE.md` without turning an early prototype into a claim of complete confidentiality. Do not skip the recovery rehearsal or independent review. Supabase is connected; migration 008 is already applied and must not be rerun.

## 1. Audit and protection boundary

```text
Begin privacy Phase A for Lane's Lair, following docs/PRIVACY_MILESTONE.md.

Read AGENTS.md, relevant installed Next.js docs, Supabase skills/current official documentation and the current journal/addition/Inbox/task code first. Preserve all working features and the iPhone typing improvements. Migration 008 is already applied; verify schema metadata rather than rerunning it.

Inventory every copy of private writing: daily aggregate, additions, Inbox/task copies, drafts, receipts/hashes, exports, caches, logs and provider backups. Do not select, display, export or summarize my actual entries, habit records, secrets or auth tokens. Use schema-only queries and synthetic test data.

Inspect current ownership policies, grants, privileged RPCs and security advisories. Review app/session, dependency and deployment risks. Separate confirmed findings from unverified settings and intended private default-deny tables. Prepare fixes for concrete issues, but do not silently change production policies, account settings, integrations, global Codex permissions or deployment access. Never weaken authentication to make tests pass.

Define the initial encryption scope and metadata that will remain visible. Include Inbox/task copies; do not promise protection for a journal entry while leaving an undisclosed readable copy. Explain what will remain unencrypted, including habits if outside the first release.

Deliver a prioritized, reviewable hardening plan, synthetic ownership-test evidence and proposed exact permission changes. Run appropriate checks for any local code fixes and record actual results. No remote changes, real-data migration, commit, push or deployment without my specific approval.
```

## 2. Reviewed design and synthetic encryption prototype

```text
Begin privacy Phase B for Lane's Lair using docs/PRIVACY_MILESTONE.md and the findings from Phase A. Resolve any critical protection-boundary questions first.

Choose maintained, established authenticated-encryption and key-derivation/key-wrapping tools compatible with the existing Next.js app and iPhone browser. Verify current primary documentation, licensing and browser compatibility before adding dependencies. Do not invent cryptography or assume Face ID/passkey support without testing it.

Design user-controlled unlock and recovery. Separate account login/password reset from journal decryption. Keep raw keys/passphrases out of Supabase, server environments, logs, URLs, Codex chat and AI providers. Specify ciphertext envelopes, identity/authenticated metadata, safe randomness/nonce management, retries, key rotation, format versioning, multi-device setup and encrypted export/restore.

Build a local prototype using invented text only. Demonstrate create, unlock, lock, edit, encrypted export and second-device recovery. Define background/inactivity behavior without silently losing unsaved writing. Explain limits for an unlocked/compromised device and browser-delivered code controlled by a developer/hosting administrator. Do not label a cosmetic app lock as encryption.

Test wrong keys, tampering, unsupported versions, replay/retry rules, recovery failure and browser lifecycle handling. Measure iPhone-relevant performance where possible. Preserve existing features. Document the architecture, residual risks and decisions I must approve before integration. No live content, remote schema changes, live key creation, commit, push or deployment yet.
```

## 3. Local journal integration and migration rehearsal

```text
Begin privacy Phase C for Lane's Lair using the reviewed Phase B design and docs/PRIVACY_MILESTONE.md. Check that the prerequisite design decisions were actually approved; do not infer approval to change key recovery or protection scope.

Integrate the encrypted journal locally using synthetic accounts/content. Preserve daily grouping, individually editable timestamped additions, original Added times, Last edited times, source links, draft/retry recovery and revision conflicts. Use existing typed data/store conventions.

Remove the need for a server-side plaintext daily aggregate in the encrypted path. Assemble private text only in the unlocked client. Keep date navigation and Statistics based only on agreed visible metadata. Cover or explicitly gate every Inbox/task copy; do not leak plaintext through search indexes, logs, caches, notifications, errors, exports, embeddings or AI memory. Journal sharing to a future assistant stays off by default.

Prepare additive, ownership-protected SQL and an idempotent, resumable browser-run conversion tool for review. Block incompatible old-client/plaintext writes after activation; prevent silent downgrades. Rehearse interruption, partial conversion, stale clients, concurrent edits, restore and rollback using disposable local data. Never fetch my actual writing into Codex to encrypt it.

Run npm test, npm run lint, npm run build and npx tsc --noEmit. Inspect synthetic transport/storage for plaintext leakage and clearly state test limits. Deliver reviewed SQL, key/recovery instructions, a conversion/backup/retention plan and physical iPhone/two-device checklist. Seek independent security review and record unresolved findings; do not claim that passing tests is an audit. No production SQL, conversion, commit, push or deployment until separately approved.
```

## 4. Production release review and user-run conversion

```text
Begin privacy Phase D release review for Lane's Lair, following docs/PRIVACY_MILESTONE.md and the completed Phase C handoff.

First verify prerequisites: reviewed crypto/key-recovery design, explicit protection scope, completed synthetic interruption/restore tests, safe old-client handling, passing project checks, review findings addressed, and an independent-review status stated honestly. If a critical prerequisite is missing, complete useful local work and report that gap before live activation.

Prepare the exact release/migration checklist and SQL checksums. Use the connected Supabase integration only for schema metadata until I approve the named production migration. Never read personal journal/habit rows, keys or recovery material. Do not bundle approval for one migration into blanket access or permission to change unrelated settings.

After my explicit approval of the exact SQL, apply it once to the verified Lane's Lair project, check metadata/grants/RLS/functions and keep a record of the result. Commit/push/deploy only when I explicitly approve that release. Pause at those actual approval gates.

Guide me through unlock/key creation and real-content conversion in my own trusted browser. I enter secrets there, not in chat. Require a successful encrypted export/restore and second-device unlock before removing active plaintext copies. Track resumable conversion using non-content status, explain any temporary plaintext overlap and historical backup retention, and never claim my data was converted simply because the UI deployed.

Finish with what I personally verified, what remains unverified, active plaintext-copy status, recovery instructions and residual risks. Do not describe the journal as suitable for highly sensitive secrets if review, recovery or copy coverage is incomplete.
```

## 5. Habits and future assistant boundaries (after journal acceptance)

```text
Begin privacy Phase E planning for Lane's Lair only after the encrypted journal release has passed its acceptance checklist.

Inventory sensitive habit names/notes, task/Inbox content and metadata using schema/code and synthetic data only. Propose which additional fields should be encrypted and which, if any, must remain readable for reminders and Statistics. Explain behavioral trade-offs honestly; do not preserve a secret server decryption key just to make scheduling convenient.

Implement only the agreed local extension with reviewed migration proposals and tests. Preserve the proven journal key/recovery model and all working features. Do not silently encrypt or remove existing records or turn journal consent into consent for all other data.

Before connecting a real AI assistant, design per-request disclosure previews, explicit journal-off-by-default access, inspectable/editable/deletable assistant memory and provider data-handling choices. Do not send any private content, prompts, vectors or keys to a model as part of this planning work. User consent cannot undo data already shared externally.

Provide project checks and a device checklist for implemented local changes. No remote SQL, real-data conversion, external AI connection, commit, push or deployment without specific approval.
```
