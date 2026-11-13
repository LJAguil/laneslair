# Discover publisher-feed evidence

Implemented locally on 2026-11-12 following the owner-authorized next task from
[the offline importer handoff](DISCOVER_OFFLINE_IMPORTER.md). Local HEAD remains
`8d4a84d`; no commit, push or deployment. This stage uses invented records and mocked
transport only. No source was fetched or added to the displayed curated catalog.

## Contract and selection

- News accepts a distinct `publisher-feed` evidence branch, restricted to the NASA
  endpoint and bounded metadata supported by the importer. Events and deals retain
  editorial evidence. Feed evidence requires body-fetch and representation-check
  timestamps, source identities and an explicit publication instant. It cannot claim
  editorial verification or an item-update timestamp.
- `feeds/to-news.ts` converts a typed in-memory importer snapshot into news items.
  It preserves publisher metadata, unavailable summaries, unknown access and the
  institutional-update label. Science/discovery tags describe the source; they do
  not infer personal interests or classify releases as reporting. This bridge is
  not an arbitrary-JSON decoder or durable-cache restore boundary.
- Feed items leave current results at **24 elapsed hours** since successful
  representation validation. They expire at **seven elapsed days** since publication,
  even if revalidated. These are local product defaults, not publisher guarantees.
  A valid 304 advances the feed check while leaving body retrieval and publication
  unchanged. Failures cannot advance timestamps. The existing foreground and
  second-precision clock reevaluates boundaries without fetching.
- News groups transitively by canonical article URL, explicit editorial story group
  or shared NASA identity. Eligible curated coverage wins. A fresh feed copy can
  replace stale/unverified curation as a whole card, without borrowing the old
  original summary or renewing its editorial check. Editorial withdrawals,
  cancellations and conflicting duplicates block feed revival. Disagreeing fresh
  headlines for the same article require review. Similar headlines alone do not
  establish identity.
- Visit-only bookmarks follow canonical article URLs across curated/feed changes.
  Changed URLs require a reviewed alias to preserve bookmarks automatically.

## UI and runtime boundary

Feed cards show **Publisher feed · not editorially checked**, separate **Feed checked**
and **Feed loaded** timestamps, publisher attribution, direct article links,
institutional-update format, unavailable summaries and unknown-access status.
They do not display an editorial last-checked claim. Stale items stay in review;
expired/withdrawn saved items remain visibly archived under existing rules.
Timestamp display uses America/Chicago; lifecycle comparisons use explicit instants.

The UI imports neither XML parsing nor transport. Its default input remains the
curated catalog. All source automation flags remain `not-approved`. There is no live
fetch, scheduler, persistence, API route, AI service or new dependency in this stage.
Parser constants and URL policy moved to a lightweight shared module; the offline
runner compiles that module as well.

## Verification and limits

- **140 tests passed** across six Discover suites, including 28 new synthetic
  lifecycle, overlap, bridge and static-card-rendering cases.
- Project TypeScript, changed-file ESLint, offline sample and diff whitespace checks
  passed. The sample yields 3 inputs, 1 candidate, 1 duplicate and 1 rejection.
- Installed Next.js server/client documentation was read before coding. No app build,
  authenticated browser, physical phone or paused privacy checks were performed.
  Earlier production-build and physical-device gates remain open.

## Overview & Roadmap handoff

**MVP:** retain curated Ruston/Monroe outings, carefully checked chain offers and
curated news. A bounded metadata-only NASA pilot can complement science coverage
after cache/refresh approval. NASA releases alone do not fulfill local, technology
or national/world reporting interests. Broader feeds need individual source/terms
evaluation; events and deals still require human source checks.

**Verified:** synthetic evidence separation, lifecycle boundaries, duplicate selection,
no summary inheritance and rendered labels. Earlier NASA probes establish endpoint
behavior only at their recorded times. **Uncertain:** durable cold-start recovery,
global refresh coordination, publisher quota/SLA, long-term availability, hosting
free limits, maintenance ownership and physical-phone acceptance.

**Cost/dependencies:** no paid services or account/key purchases, and no new packages
this stage. The importer retains pinned MIT `@xmldom/xmldom` 0.9.12. No hosting quota
or durable-cache guarantee is assumed.

**Affected files:** Discover types, catalog/presentation selection, curated helper's
type annotation, card labels/bookmark identity, shared feed policy, typed snapshot
bridge, parser policy imports, offline runner module list, synthetic fixtures/tests
and Discover documentation. Shared store, auth, privacy, journal and database files
were not edited. Curated content/timestamps and existing uncommitted work are preserved.

**Decisions before live integration:** choose a maintenance owner/cadence and approve
either a manually reviewed snapshot workflow or a verified free durable refresh
design. No decision is needed to test the next offline boundary.

**Next bounded task:** validate durable snapshot restoration using synthetic serialized
round trips, corruption/identity/timestamp checks and mocked conditional revalidation.
Keep storage/fetch injected and disconnected from the app; do not weaken the WeakSet
baseline guard by casting JSON. Then propose actual free storage/refresh authority
before hosting configuration or a live connection. No remote SQL, migration or
production change is authorized.

## Offline restoration update — 2026-11-12

The [snapshot restoration stage](DISCOVER_SNAPSHOT_RESTORATION.md) completes the
bounded offline next task above. A strict serialized decoder now promotes validated
metadata to frozen transport baselines without freshening timestamps. 191 Discover
tests pass, including cold-module restoration and mocked conditional revalidation.
No real storage, app integration or live fetching is enabled. Next: a concrete free
snapshot-publication/shared-refresh proposal, with storage trust and failure limits.
