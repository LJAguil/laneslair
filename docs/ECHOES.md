# Echoes — original daily imagery game

## Publication approval

The owner reports migration 007 applied successfully and has approved committing/publishing Echoes. Do not rerun migrations 005–007 or run the authoring templates in Supabase. After deployment, each device/game still needs its own explicit sync preview and import confirmation. The local-preparation details below record the implementation and checks before publication.

## Status

The owner reports migration 006 was applied. With approval, milestones 4–5 were committed/pushed as **`1e7befe`**; Vercel confirmed **Deployment has completed**. That publishes the hub, optional account sync and daily chess. No remote migration was executed by the agent.

Milestone 6 is implemented locally and remains uncommitted/undeployed. Echoes appears at `/play/echoes` and in Daily Play, with one restrained text link in Today’s existing quick navigation. No extra Today widget or primary mobile destination was added. Rune Lock’s v1 rules/history, chess pack/keys and productivity features remain unchanged.

## Original content and daily rotation

This is a symbolic-association word-bank game, inspired by the general mechanic the owner described. All **18 scenes, hints and explanations are original Lane’s Lair writing**. There is no copied Genshin dialogue, artwork, character, quest, solution or other game asset. No runtime AI, content API, paid feed, new package or environment variable is used. It runs with existing free/local tools and optional Supabase account storage, subject to normal project quotas.

The frozen **v1 pack has 18 scenes: six sets of three**. Themes include time, frost, memory, hope, growth, belonging, letting go, resilience, absence, patience, guidance, possibility, generosity, self-reflection, courage, companionship, adaptability and care. Each scene provides four choices, except the memory scene with five. Only that scene intentionally accepts two choices: **Memory / Remembrance**. All other scenes have one curated answer. Distractors and explanations are explicit authored content, not free-text or AI judgments.

The existing app-local calendar date selects a set using a stable Gregorian DATE ordinal modulo six. Every scene appears exactly once during six consecutive dates; **the pack repeats every six days**, disclosed in the UI. The ordinal’s UTC arithmetic is only an index calculation for a date-only string; it does not convert the displayed date or change the app’s local-midnight rollover. Leap dates and dates before 1970 are tested.

Identity is **`echoes/v1/YYYY-MM-DD/standard`**. Round IDs and option IDs are stable inside the pack. Local storage is **`lanes-lair-play-echoes-v1:{verifiedAccountId}`**. Changing content, accepted meanings or the rotation requires a new version; do not rewrite v1 to expand the pack. A fixed content SHA-256 test detects accidental v1 edits. Old dates retain their submitted answers; draft round selection resets on a new date. PostgreSQL sync accepts Gregorian years 1–9999; any unsupported local history remains preserved rather than silently removed.

## Play, feedback and score definitions

- Open one of the three image buttons. Read the short scene and emphasized image, then choose a meaning from its word bank. No timer or text input is required.
- A wrong choice is labelled **Try another**, remains visible and cannot consume another attempt through repeated taps. The board/text does not change. Feedback asks you to consider another word or a hint; it does not reveal the answer immediately.
- A correct choice locks that round and shows a concise explanation. An intentionally accepted alternate answer is equally valid, and both accepted labels are disclosed after matching. There is no same-day reset or further guesses after a match.
- Hints can be revealed once per unmatched round, without consuming an answer. Assistance persists after a correct answer and survives merges. Hints arriving from a compatible earlier device state are retained even if the other device already matched the image.
- **Images matched** is the number of rounds with an accepted answer, out of three. **Matched on the first answer** counts correct first submissions, including hinted answers; it is not an unassisted score. **Hints used** counts rounds with the hint flag. **Other tries** counts distinct submitted wrong choices. There are no points, penalties or competitive rankings.
- Optional streaks default off. A date counts once only after all three rounds are matched, regardless of hints/retries. An unfinished today preserves yesterday’s streak; a wholly missed date breaks it. Repeated content on another date is a new daily identity, not a reset of the older date.

Meaning can be subjective. The UI explicitly says it checks curated word-bank associations, not every possible interpretation. Additional valid meanings require an intentional future content/version review; the game does not claim that an unlisted interpretation is universally wrong.

## Interface and privacy

Scenes use readable line spacing, wrapping plain text and existing theme tokens. The key image is marked with semantic `<strong>`, an underline and screen-reader text **Key image**, so color is not its only cue. Word choices have visible matched/retry labels, and live status text explains results. Image navigation names Matched/In progress/Unmatched states. Buttons have visible keyboard focus and phone-sized touch targets. All three existing themes are preserved.

Loading private history, failed saves and a fresh unplayed day are separate states. Input/state is retained on failed local saves; malformed storage is left untouched. Retry attempts to save again without consuming a new answer. There is no secret, service-role key, public signup or new notification opt-in.

The account is verified before loading its device key and before each account operation. Auth changes clear the visible context and dispose the old sync controller. Private history is not stored in a service worker/shared server cache, sent to analytics/AI, or mixed into Statistics. The authenticated app is not promised to load fully offline; local persistence does not create an offline background-sync service.

## Optional sync and review-only migration 007

Echoes uses the same generic game sync controller as Rune Lock and chess, with its own codec, account transport, preference and per-device consent. It remains local until you explicitly preview/confirm account sync. Rune Lock/chess consent does not opt Echoes in.

Before cloud activation, review **`database/migrations/20261108_007_echoes_progress.sql`**:

1. It depends on the owner-applied 005 and 006 schema, and widens only the known game/difficulty checks to permit `echoes` / v1 / `standard`. No existing rows are deleted or rewritten. It leaves Rune Lock/chess functions, ownership policies and existing direct-write revocations intact. SQL Editor may flag the named constraint replacements for review; these do not drop game tables.
2. It creates ownership-scoped progress and preference RPCs with an empty search path and actor derived from `auth.uid()`. Existing RLS still restricts reads; clients cannot directly insert/update/delete game rows. No unprotected new table is added.
3. Server validation pins the date’s allowed round IDs, option IDs and accepted answers. It rejects unknown, duplicate and post-match answers. Same-round prefixes can extend only until a match; completed rounds cannot be overwritten/reset. Different rounds from separate devices merge, hints OR together, and divergent same-round attempts conflict visibly. Even two valid alternate-answer branches are preserved as a conflict rather than silently preferred.
4. Account-scoped locks serialize writes, and operation receipts make matching retries idempotent. Reusing a request ID with different content fails. Retrying an interrupted import with new IDs is also safe: compatible states do not append duplicate answers or advance revisions needlessly. Streak changes use expected revisions.
5. No remote SQL is executed automatically. Do not rerun 005/006 or use a secret/service-role key. A conflicting schema name/check definition needs review, not deletion of existing history.

After approving/applying 007 and separately publishing Echoes:

- Tap **Preview Echoes sync**. Preview is read-only; review per-identity compatibility and choose account streak preference (default) or this device’s setting. Confirm explicitly to upload.
- The original raw device save is backed up under a separate account-scoped key before import. Imports are per-day transactions, not one all-history transaction; partially uploaded days remain valid if interrupted. Re-preview/retry without clearing either copy.
- Subsequent saves sync automatically while the app is open. Refocus/reopen or **Sync now / retry** to refresh another device. Stop sync here affects this device only and deletes nothing; requests already accepted may finish. Export both copies when a conflict needs review. Automatic destructive branch resolution/file re-import is not offered.
- Clearing site data removes this device’s local history/consent, not already confirmed account history. A new device still needs explicit import confirmation. These are casual puzzles, not anti-cheat verified telemetry.

`node scripts/prepare-echoes-migration.cjs` validates the pack and generates review-only 007 from the template. It has no network/database connection. The generated date mappings are exercised in disposable local PostgreSQL alongside the real typed rules.

## Verification and iPhone checklist

Automated tests use pure rules, simulated storage/transport/devices, rendered markup and temporary local PostgreSQL. They do not verify a live Echoes account query, real two-device delivery or physical-iPhone interaction. Final checks passed: `npm test` — **308 tests across 47 files**; `npm run lint` — no errors or warnings; `npm run build` — includes `/play/echoes`; `npx tsc --noEmit` — passed. The build initially failed with Windows EPERM while unlinking OneDrive-marked generated cache directories. Moving the generated `.next` cache aside to an ignored `build/` backup with read-only handling allowed a clean final build. An earlier temporary-backup attempt encountered read-only files; no source files were moved and no configuration was changed. If OneDrive marks generated caches again, the same local environment issue can recur. Rune Lock v1, the chess pack/rules, shared sync controller and dependency files are unchanged from the published checkpoint.

After approved deployment:

1. Open Today → Echoes and More → Daily Play → Echoes. Verify Rune Lock/chess links and the four primary mobile destinations remain unchanged. Check all themes, portrait width and increased text size.
2. Read an emphasized image with VoiceOver or keyboard. Confirm **Key image**, choice labels, focus rings and Image 1/2/3 state labels are understandable without color. No horizontal page scrolling should be required.
3. Submit a wrong word; it should say Try another, record one other try and prevent duplicate taps. Reveal a hint, then match correctly. Read the explanation and assistance label. Navigate between rounds and refresh/close/reopen; saved guesses and hints should persist.
4. On a day containing The folded voice, verify either Memory or Remembrance completes it and both are explained afterward. Do not change database data or reset existing results to test the other branch; use a disposable account if necessary.
5. Complete all three images, enable the optional streak and refresh. That date counts once; hints still count. Return next local day for a new set and note the disclosed six-day repeat. Older results must remain.
6. After 007 approval/application, preview Echoes sync on phone and desktop. Cancel once before confirming. Confirm compatible progress/hints transfer after refresh, with no duplicate answers. Check that a conflicting same-round branch preserves both copies and allows exports.
7. Interrupt an import or local save in a safe test environment, reconnect and retry. No saved answers may vanish or duplicate. Sign into another account and confirm prior history is absent. Check a task, journal entry and habit as a quick regression check.

No migration 007 execution, Echoes commit/push/deployment or physical-iPhone test was performed by the agent.
