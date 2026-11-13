# Discover offline snapshot restoration

Implemented locally, 2026-11-12, following the owner-authorized next task in the
[feed-evidence handoff](DISCOVER_FEED_EVIDENCE.md). Git HEAD remains `8d4a84d`.
No live request, actual storage write, account, database, production change or
publication occurred. Existing uncommitted work and paused privacy work are preserved.

## Implemented boundary

`serializeNasaSnapshot(snapshot)` accepts only a frozen importer/restore capability.
`restoreNasaSnapshot(serialized, now)` returns either a deeply frozen, validated
baseline or `{ status: "failed", reason: "invalid-snapshot" }`. It never includes raw
stored content in an error. The caller supplies the string and clock; these functions
do not read files, browser storage, environment values or remote services.

The decoder in `lib/discover/feeds/snapshot.ts` reconstructs allowlisted metadata from
JSON rather than asserting its type. It enforces:

- A 256 KiB UTF-8 input limit, exact object fields and schema version 1.
- The fixed NASA endpoint and canonical approved HTTPS article URLs.
- Bounded nonblank metadata, globally distinct source identities/article URLs,
  unavailable-summary text, unknown access and institutional-update format.
- Canonical UTC ISO instants with valid calendar dates; publication at/after 1970,
  publication no later than body retrieval, retrieval no later than representation
  check, and no representation check in the future relative to the supplied clock.
- Bounded ETag syntax and canonical Last-Modified header syntax. These remain HTTP
  validators, not editorial or publication evidence. Validator-free snapshots can be
  restored, but cannot make a 304 eligible.
- Bounded candidate/rejection arrays, known rejection codes, sorted unique in-range
  rejection indexes, integer counts, consistent input accounting and output caps.
  Extra fields, including article bodies or editorial stamps, fail validation.

Only the transport promotes successful decoding into its WeakSet of baselines.
Passing `JSON.parse(...)`, a typed cast, or a direct decoder result to transport still
fails the existing capability check. Restoration copies/rebuilds data before freezing;
it does not mutate input or advance any timestamp. An old snapshot can restore for
last-good visibility while remaining stale/expired under the catalog's clock policy.

After restoration, the existing explicitly injected transport can send ETag (preferred)
or Last-Modified. A valid 304 advances representation check only. Failure leaves the
restored baseline unchanged, and even a successful 304 cannot revive publication-expired
stories. There is still no retry, scheduler or automatic app invocation.

## Limits before real persistence

This establishes schema validation across serialized round trips, **not a complete
durable cache**. It does not authenticate metadata, prove it came from NASA, detect
plausible tampering, stop replay of a valid older snapshot, or establish freshness when
the supplied clock itself is wrong. A restored snapshot must originate from the
selected trusted application-controlled storage; do not accept user uploads or
arbitrary request bodies as production baselines. A matching HTTP validator alone
cannot authenticate altered stored article metadata.

No storage adapter was selected or installed. Atomic replacement, failed writes,
concurrent writers, shared refresh admission, cold-start recovery, rollback policy,
retention and hosting quotas remain unresolved. Source automation remains
`not-approved`; curated catalog values, UI behavior and feed defaults are unchanged.
This has no relationship to personal journal recovery or encryption.

## Verification

- **191 tests passed** across seven Discover suites, including 51 new snapshot tests.
  Tests use invented XML/metadata and mocked requests only. A module reset exercises
  restoration into a fresh transport capability registry before conditional 304.
- Cases cover malformed/oversized JSON, multibyte byte limits, fields/types, URL/source
  restrictions, dates, counts, duplicates, rejection indexes, metadata injection,
  empty/rejected/capped results, multiple identities, Last-Modified-only and absent
  validators, stale/expired restoration and failed refresh preservation.
- Project TypeScript, changed-file ESLint, offline sample and whitespace checks passed.
  Installed Next.js `use cache` documentation was read before coding; no cache directive
  or framework integration was introduced.
- No production build, browser, physical-device or paused privacy tests were run.
  Earlier full-build/device acceptance and release-scope gates remain open.

## Overview & Roadmap handoff

**MVP/sources:** retain manually checked Ruston/Monroe events, chain food offers and
curated news. The metadata-only NASA pilot has an offline parser, distinct evidence
labels and now a validated restore boundary, but remains disconnected. It covers
institutional science updates, not the requested full local/national/world news mix.

**Verified versus uncertain:** synthetic storage round trips and mocked revalidation
pass; actual durable storage, provider limits, source reliability and production
ingestion remain unverified. Earlier live source probes are dated evidence only.

**Free limits/dependencies:** no additional package, service, key or account. Existing
MIT XML dependency remains unchanged. The 256 KiB bound is a local application limit,
not a hosting quota. Free shared storage/refresh capacity has not been established.

**Affected files:** new `lib/discover/feeds/snapshot.ts` and `snapshot.test.ts`, small
transport serialize/restore entry points, and Discover documentation links. No shared
auth/store/journal/privacy source, database schema or app route was changed.

**Recommendation/decisions:** prefer the manually reviewed snapshot workflow until
a free shared refresh design is justified. Choose a maintenance owner and cadence
before promising ongoing updates. No production source automation or hosting change
is authorized by these offline tests.

**Next bounded task:** prepare a concrete free publication/refresh proposal comparing
an explicitly reviewed local metadata snapshot with server-side shared storage. Specify
write failure/atomicity, provenance, rollback handling, refresh admission and last-good
behavior. Use public official hosting documentation for limits, make assumptions
explicit, and avoid credentials/account inspection or remote SQL. Recommend the
smallest useful path and its affected files before connecting live ingestion.

## Publication/refresh proposal update — 2026-11-12

The [free publication and refresh proposal](DISCOVER_REFRESH_PROPOSAL.md) now compares
reviewed bundled snapshots with shared Blob/Schedules storage, records current official
limits and specifies failure, provenance and admission requirements. It recommends
offline review-bundle preparation/promotion next. No provider, live source, runtime
storage or production configuration was enabled by that research stage.
