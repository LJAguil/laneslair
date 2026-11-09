# Privacy milestone — private writing and controlled developer access

Use [PRIVACY_IMPLEMENTATION_PROMPTS.md](PRIVACY_IMPLEMENTATION_PROMPTS.md) for five staged copyable prompts.

## Supabase connection and migration update

The owner has now authorized the Supabase integration. Migration 008 was applied and schema/permissions verified on 2026-11-09; see [MIGRATION_008_VERIFICATION.md](MIGRATION_008_VERIFICATION.md). No private entries were read. The UI is not yet published. The earlier connection-status statements below are historical, not a current blocker. The privacy phases remain proposals, and connecting Supabase has not implemented encryption or narrowed administrative permissions.

## Status and intended promise

Planning only, 2026-11-09. No privacy feature, encryption, production migration, account-permission change, commit or deployment is authorized by this plan alone. The phone-typing/timestamped-journal work and migration 008 remain local, pending database setup/publication. This plan does not read or migrate actual entries.

Target: **journal content encrypted on the user's device, with decryption controlled by the user, never silently shared with an assistant**. Keep the working app and its timestamped daily organization. Do not claim that every part of Lane's Lair is encrypted, that administrators cannot observe metadata, or that a browser app is immune to malicious replacement code.

Current reality: journal text is readable in Supabase. Migration 008 adds editable blocks and a readable daily aggregate; it is not a privacy upgrade. Inbox originals and converted-task notes can contain copies. We must account for those copies before claiming an encrypted journal is protected.

## Phase A — define boundaries and reduce unnecessary access

Deliver a threat model and small verified inventory before writing encryption code:

- Identify journal main bodies, timestamped blocks, Inbox originals, task-conversion copies, drafts, receipts/hashes, exports, logs, caches, backups and analytics paths. Use code/schema metadata and synthetic records, never read personal entries into Codex for discovery.
- Classify protected content versus exposed metadata. Initially encrypt journal text and any user-designated private source copies. Explicitly identify what stays readable: owner/record IDs, chosen entry dates, added/edited times, revisions, ciphertext size and relevant link metadata. Dates/patterns can themselves be sensitive.
- Review live ownership policies, grants and write-function privileges using schema-only results. Exercise public/cross-account denial with disposable accounts/records, not the owner's writing. This verifies actual configuration rather than assuming local migration files prove deployment.
- Review MFA/session recovery for Supabase, GitHub, Vercel and app login. Restrict deployment/admin access. Avoid private text in logs, error reports, previews and notifications. Review dependencies and browser security headers without breaking authentication or Next.js.
- Restrict development tools to the checkout and explicitly deny sensitive files/data exports where the permission system supports it. Git ignore rules alone are not an access boundary. Do not silently edit global permissions; present exact changes for user approval.
- Keep the journal excluded from future AI prompts, memories, embeddings and analytics by default. Development uses made-up data.

Exit: a written protection boundary, safe permissions proposal and test evidence for live ownership settings. No claim that this already provides user-only encryption.

## Phase B — encryption/key-recovery design and synthetic prototype

Choose maintained, established authenticated encryption and browser-compatible key-management primitives after reviewing their current official documentation; do not invent cryptography. Review the design against [OWASP cryptographic storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html), especially threat modelling and separation of keys/data.

Recommended starting design, subject to cryptographic review:

- A random content-encryption key; user-controlled wrapping/unlocking through a separate journal passphrase and recovery mechanism. Login password resets must not silently become a server decryption mechanism.
- The server stores encrypted records and wrapped keys/necessary public derivation parameters, never the raw journal key or unlock passphrase. New device setup happens through the user's own unlock/recovery flow, not by pasting keys into this chat.
- Versioned ciphertext envelopes bind identity/version/revision as appropriate; authenticated encryption detects tampering. Enforce nonce uniqueness and safe randomness through reviewed APIs/libraries. Define key rotation and format upgrades before real migration.
- Default to unlocked keys in memory only. Discuss the convenience/security choice for trusted-device storage separately. Do not promise Face ID unlock in an iPhone Home Screen app until actual platform support and key protection are verified.
- A user-held recovery kit, encrypted export and tested second-device restore. Clearly explain that losing all unlock/recovery material may make writing unrecoverable. Never ask the user to send the recovery kit to Codex or put it in Supabase plaintext.
- Lock after configured inactivity/sign-out and appropriate background handling. Design encrypted local draft persistence before clearing unsaved text; mobile OS termination is not reliably observable. Clearing JavaScript references is best-effort, not a forensic memory-erasure guarantee.

Exit: a reviewed architecture plus phone/desktop prototype using synthetic text only. Tests cover wrong keys, tampered data, unsupported versions, nonce/retry rules, lost-device recovery, password reset versus vault recovery and browser lifecycle failures.

## Phase C — integrate journal persistence without plaintext leakage

Preserve one calendar day, multiple independently editable additions, immutable Added times and separate Last edited times.

- Replace plaintext text storage with encrypted payloads, retaining server ownership checks and revision-based conflict protection. Server CAS/idempotency works on identities/revisions/ciphertext; it does not need to read writing.
- Stop the server-side plaintext daily aggregate. Assemble the daily reading view on the unlocked client. Existing migration-008 RPCs must not keep writing plaintext alongside ciphertext.
- Review Inbox Add to journal and Make this a task carefully. Either protect the linked source/copy too or explicitly disclose the remaining readable copy before calling the item private. Do not silently transform all tasks into encrypted records and break their workflows.
- Preserve Journal date navigation and Statistics through only the metadata the user has agreed remains visible. Search private text locally after unlocking; do not create server plaintext search indexes or AI embeddings.
- Gate incompatible old clients and reject plaintext writes once protection is enabled. Avoid a downgrade path that silently restores readable storage. Keep previous progress/history and unresolved drafts intact.
- Provide a clear locked state and privacy settings with truthful labels, not a cosmetic passcode over readable server text. Generic notifications stay generic.

Exit: existing functional tests plus encrypted create/edit/append/retry/concurrent-edit tests, verified transport/storage inspection with synthetic marker text, no plaintext marker in server fields/logs/shared caches, and real iPhone/two-device testing.

## Phase D — explicit migration, recovery rehearsal and release

- Review SQL/schema changes and the user-facing migration plan first. No automatic remote SQL or bulk conversion of real entries.
- Prepare an encrypted, user-controlled backup and prove a round-trip restore with synthetic data before migrating actual writing.
- Real conversion runs in the user's trusted browser after they unlock. Codex does not fetch personal text to perform encryption. Migration checkpoints/retries must not duplicate or lose additions, dates, source links or revisions.
- Verify ciphertext can be decrypted on a second device before removing active plaintext fields/copies. Explain the temporary protection gap while both forms exist. Existing provider backups, snapshots, exports and logs may retain historical plaintext until their actual retention/deletion processes complete; do not promise instant erasure.
- Stage changes and rehearse failed saves, partial conversion, interrupted connectivity, old clients, rollback and lost keys. Rollback must not quietly re-enable plaintext writing or expose decryption material.
- Seek an independent security review before describing the feature as suitable for highly sensitive secrets. A working demo and passing tests are not a cryptographic audit.

Exit: documented recovery success, migration coverage report without contents, no active plaintext copies in the agreed scope, explicit residual-risk statement and approved release.

## Phase E — habits, other private content and future Jarvis

Journal-first is not whole-app privacy. Habit names/notes and task/Inbox content can be sensitive too. Extend protection deliberately after the journal is stable; choose whether dates, quantities and completion state remain visible for reminders/statistics. If they are encrypted, server-side reminder-completion checks need redesign rather than a hidden decryption key.

A future assistant gets **no journal access by default**. Provide per-request preview of exactly what would be shared and explicit consent before decrypting/exporting selected text to a provider. Assistant memory needs view/edit/delete controls. Do not imply that consent can revoke data already sent to a third-party provider.

## Protection limits that remain

A stolen database copy should not reveal protected text without the user's key. However, encrypted content is readable while an authorized client is unlocked. Malware, malicious extensions, screen capture and a compromised device can capture it. A developer/hosting administrator who can replace browser-delivered code could attempt to steal the next unlock operation. Mitigations include deployment restrictions, dependency/CSP review and independent audits; stronger resistance may require an independently distributed/pinned client. Do not promise protection from every trusted-client operator in the current web architecture.

## Phone-friendly migration administration

Current inspection found **no connected Supabase migration tool and no installed Supabase CLI**. A Supabase integration exists in the plugin directory but was not installed/connected when checked. A phone-to-Codex connection alone does not grant database administration.

The [official Supabase MCP server](https://supabase.com/docs/guides/ai-tools/mcp) can apply migrations after authorization. It supports project scoping, read-only diagnostics and restricted feature groups. Its administrative tools can also read data depending on granted permissions: **read-only is not schema-only**. Do not grant broad production access merely to avoid copying SQL from a phone.

Preferred operating pattern:

1. Restrict access to Lane's Lair's project; use only needed capabilities. Keep confirmations on. Default routine diagnostics to read-only, and request write capability only for a specific reviewed migration.
2. Verify project identity and applied migrations using metadata, not journal rows. In this project, earlier scripts were manually applied, so verify schema objects as well as migration history; absence from a history table does not prove a manual script was never run.
3. For 008, compare the exact reviewed file and expected preconditions, check that additions objects/legacy helper are not already present, then apply only 008. Stop on partial/conflicting state; never rerun blindly or delete tables to force setup.
4. Verify table/policy/function definitions and migration status afterward, without selecting private content. Run synthetic ownership checks only in the agreed test environment. Report precisely what executed and any warnings.
5. Return to restricted access afterward. Never paste a database password, management token, service-role key or recovery key into chat. Enter authorizations in the provider's secure connection flow.

If available connection permissions are too broad, use a separate reviewed migration runner/CI job with protected credentials, exact approved SQL/version and an explicit phone-triggered approval. Such a runner still has privileged execution and needs independent controls; calling it 'migration-only' does not make arbitrary SQL harmless. No runner or integration is installed/configured by this plan.

The Supabase integration still needs installation/authorization before this session can apply 008. No migration was run while preparing this plan.

## Suggested order and approval points

1. Finish 008/device acceptance for timestamps if wanted now; understand it remains readable cloud storage.
2. Approve Phase A, then the synthetic Phase B design/prototype.
3. Review key/recovery and source-copy decisions before production schema integration.
4. Approve real-data conversion only after recovery rehearsal and review.
5. Expand habits and AI access as separate, explicit choices.

Encryption uses local computation and need not add a paid per-entry service, but a responsible implementation and independent review require time; an independent audit may have a cost. No total-effort or absolute-confidentiality guarantee is made.
