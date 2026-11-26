# Discover first controlled update — November 26, 2026

## Scope and current evidence

The owner approved publishing the control adjustment, one bounded update of NASA,
Louisiana Illuminator and Ruston High athletics, inspecting its saved metadata,
then stopping. Recurring ingestion and the production reader stay off. No new
sources, accounts, subscriptions, AI connection or database changes are included.

Local and remote main were `94bea3b24e89987615b2b279ba19b841ebb5bd27` at preflight,
including the entertainment release after Discover's `ead6c7f`. The repository
was independently confirmed public on November 26. All six workflow records then
present (November 20–25) were scheduled and skipped. `discover-data` was absent.
No successful live acquisition is inferred from a skipped workflow record.
Authenticated hosting/switch inspection and the first real capture remain pending.

## Control and update protocol

- Dispatch **Daily Discover public feeds** from `main`. Default `inspect-only`
  skips the job and performs no checks or requests. Explicit `controlled-pilot`
  permits the approved first update only when `DISCOVER_DAILY_ENABLED` is not
  `true`. Schedule events still require that repository variable to be `true`.
- Both YAML and CLI require the exact public repository and `refs/heads/main`.
  CLI event/mode validation precedes storage or publisher access. The sample
  remains synthetic and offline. No personal access token is needed.
- Before dispatch, inspect the repository variable and the production reader's
  `DISCOVER_DAILY_ENABLED` setting without revealing other environment values.
  Both must remain off. Confirm the existing Vercel project is still free and
  `discover-data` deployments are excluded. Do not change billing or permissions.
- The pilot refuses an existing data branch before reserving or fetching. A
  partial/failed run therefore needs inspection and a separately reviewed
  recovery; do not delete/reset its ledger or click rerun to bypass this stop.
- Initial storage carries the known earlier source request receipts: NASA
  November 13 at 19:30:14.739Z, RHS November 20 at 05:17:54Z and Illuminator
  November 20 at 05:18:28Z. These are attempts, not new feed/editorial checks.
  They preserve cooldowns across bootstrap; no recent capture is claimed.
- Persist reservations before HTTP, then at most one GET per selected source,
  no redirects/retries/article fetches, existing size/deadline limits and
  Retry-After handling. Failure still spends the attempt. Existing validators,
  strict decoding, canonical deduplication, cancellations and expiry rules apply.
- Inspect the public data branch after the run: only `catalog.json` and its
  deployment exclusion, three known source states, actual clocks/errors/item
  counts, safe direct URLs, future nearby events and recent news. A transport
  check must not become editorial verification or a fabricated summary.
- Confirm the data write caused no deployment, report partial failures honestly,
  and stop. Do not enable production reads or recurring updates as part of this
  pilot. A normal main-branch control release may trigger the existing app build.

## Free-service boundary and validation

The job uses standard `ubuntu-24.04`, Node 22, a five-minute timeout, built-in
workflow token with `contents: write`, and no uploaded artifacts/cache or paid
fallback. GitHub documents standard hosted runners in public repositories as
free; private/internal and larger runners have different billing rules:
[GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
The fixed public-repository guards enforce this choice. Permission is repository
level even though the storage script only targets the fixed data branch.
[Vercel branch deployment exclusions](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled)
are present in main and the saved data tree; actual hosted behavior still needs
the pilot check. No publisher-granted numeric quota is claimed.

The isolated validation tree starts at `94bea3b` and overlays only the five pilot
code/config files. The full suite passed **775 tests across 88 suites**, including
six new authority/bootstrap tests. Full isolated lint, generated route types and
TypeScript passed. YAML parsed successfully and the synthetic update sample
passed without publisher requests. No app UI or Next configuration changed, so a
new local production build was not required for this workflow/CLI-only patch.
Installed Next.js deployment/environment documentation was read before editing.

Affected files: workflow, `daily-authority.mjs`, `daily-update.mjs`,
`lib/discover/daily/snapshot.ts`, `control.test.ts`, this runbook and its index
note. Paused privacy/auth/store/journal work and other uncommitted research are
excluded and preserved. No shared app configuration or package/schema change.

## Following stages

1. Complete and inspect the first data-only run; record actual results here.
2. With separate activation authorization, enable the reader, check authenticated
   phone layout and observe two scheduled cycles before expanding coverage.
3. Prototype West Monroe's official calendar offline, handling Chicago DST,
   ambiguous/all-day dates, venue filtering and duplicate UIDs. Review Global
   Voices attribution for world perspectives; resolve tech-source display terms.
4. Refresh curated outings and verify fast-food offers individually. Food
   holidays alone never establish an offer or nearby participation.

No live-run, production switch or fresh editorial-content success is claimed by
the local checks above.
