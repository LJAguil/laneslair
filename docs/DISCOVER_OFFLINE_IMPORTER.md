# Discover offline NASA importer

Implemented locally, 2026-11-12 (America/Chicago), following the owner-authorized
next task from the [feed proposal](DISCOVER_FEED_PROPOSAL.md). Local HEAD remains
`8d4a84d`; nothing was committed or deployed. No app code invokes the importer.
Existing UI, curated content, automation flags and paused work remain unchanged
by this task. No live NASA requests were made during this implementation stage.

## Manual offline command

```sh
npm run discover:dry-run -- --sample
```

The sample is invented XML, evaluated against a fixed clock. Expected results:
3 inputs, 1 candidate, 1 duplicate, 1 missing-field rejection. No publisher article
is embedded in the fixture.

```sh
npm run discover:dry-run -- --xml path/to/local.xml --now 2026-11-12T18:00:00Z
```

The second command reads only the explicitly supplied local file. Without `--now`,
local-file evaluation uses the current clock; `--sample` uses its fixed clock.
An explicit instant requires seconds and a zone. Invalid calendar dates such as
February 30 fail before reading XML.

The command streams at most 1 MiB of UTF-8 XML and prints aggregate counts/rejection
codes. It does not fetch, print candidate content, persist publisher text, read
environment files or modify the catalog. Generated JavaScript stays under ignored
`build/discover-offline-importer/`. The already-declared TypeScript development
dependency compiles the exact parser source; no additional runner or transitive
framework internals are required. Development dependencies are needed. Tested with
the installed Node 26.12.0 runtime.

## Contract and bounds

- `lib/discover/feeds/types.ts` defines candidates separately from `DiscoverItem`.
  Candidates contain publisher metadata, institutional-update format, unknown access
  and an unavailable-summary marker. There is no editorial verification field or
  borrowed curated summary.
- `nasa.ts` accepts RSS 2.0 with exactly one unnamespaced channel. Only direct metadata
  fields count; bylines use the Dublin Core namespace URI, independent of its prefix.
  Missing authors remain null. Entities/CDATA remain text. Nested metadata markup,
  ambiguous fields and invalid values are rejected. Bodies, descriptions and images
  are discarded; headlines are never truncated into invented publisher wording.
- Limits: 1 MiB input, 50 items, 20,000 nodes, depth 32, 300-code-unit headlines,
  200-code-unit authors, 512-code-unit GUIDs, 2,048-code-unit URLs, 10 output candidates.
  Structural limits are checked after DOM parsing; this is not a preemptive CPU/worker
  limit. The parser is bounded by input bytes and remains disconnected from runtime.
- DTD/entity-declaration tokens are rejected before XML parsing. This conservative
  guard also rejects literal tokens in comments/CDATA. The library performs the XML
  parsing; regular expressions do not. Every parser warning/error stops processing.
  Failure codes contain no source content or raw transport exception details.
- Article URLs must be absolute HTTPS on `www.nasa.gov` or `science.nasa.gov`, without
  credentials, unexpected ports, backslashes or whitespace/control characters.
  Known trackers/fragments are removed; article-defining parameters remain. Neither
  article URLs nor opaque GUIDs become request targets.
- Publication timestamps accept explicit-zone RFC 822-style RSS dates with valid
  calendar fields, optional matching weekday and numeric offsets or GMT/UTC/UT.
  Missing, ambiguous, invalid and future dates are withheld rather than guessed.
- Canonical URL/GUID grouping detects transitive conflicts. Identical coverage with
  changed GUIDs groups once and retains all IDs. Conflicting/incomplete siblings with
  shared identities are withheld together. Valid groups are sorted and capped, with
  explicit duplicate/omission counts.
- `suppressCuratedNasaCoverage` takes only currently eligible curated article URLs
  supplied by a later caller. It can suppress overlapping feed coverage without
  inspecting app records, inheriting summaries or renewing editorial timestamps.

## Injected transport and baseline limitations

`transport.ts` makes one fixed-endpoint request only when supplied an explicit fetch
implementation. There is no global-fetch fallback, top-level request, retry, scheduler,
app route or persistence. Tests supply mocks; the offline command imports only the parser.

Requests omit credentials/cookies and reject redirects, followed/unexpected URLs,
HTTP errors, unsupported media types/charsets and missing bodies. Streaming byte
limits and fatal UTF-8 decoding apply before parsing. A 15-second asynchronous
request/body deadline aborts/cancels pending and late responses. A valid bounded
Retry-After hint is reported for HTTP failures; no automatic retry occurs.

Successful snapshots are deeply frozen and recognized by a private WeakSet. A 304
requires a baseline created by the same module instance and a sent ETag or Last-Modified
validator. Copied/deserialized JSON and rolled-back clocks are rejected. This is a
capability contract. Explicit serialized restoration is now implemented in the
[offline restoration stage](DISCOVER_SNAPSHOT_RESTORATION.md); actual durable storage
and shared refresh coordination remain unimplemented.

A 200 establishes body-fetch and representation-check times. A valid 304 advances
only representation-check time. Prior snapshots are immutable; failures return
structured reasons without renewing the last-good snapshot. HTTP validators are
never editorial/item-update timestamps. Publication-age/freshness policy is now defined
in the [publisher-feed evidence stage](DISCOVER_FEED_EVIDENCE.md); cold-start recovery
remains future work. Candidates are not connected to current recommendations yet.

Persistent baseline support must validate schema, identity, bounds, metadata and
timestamps across actual storage round trips. Do not replace the WeakSet check with
a type assertion over JSON. Global refresh budgets, cross-instance coordination,
durable last-good data and verified free hosting limits remain open before live use.

## Dependency and verification

Pinned `@xmldom/xmldom` **0.9.12** in package/lock files. Its [upstream package](https://github.com/xmldom/xmldom)
is MIT-licensed with no runtime dependencies. Reviewed upstream usage/types, error
handling, security advisories and the [0.9.12 changelog](https://github.com/xmldom/xmldom/blob/master/CHANGELOG.md),
which includes parser resource-use fixes. Installation scripts were disabled; one
package was added and unrelated package versions were unchanged. This bounded review
is not an independent audit. `saxes` was evaluated but its upstream is archived and
it was not installed. Installed Next.js server/client documentation was read before coding.

- **112 tests passed** across five Discover suites: 46 existing tests and 66 new
  synthetic parser/mocked-transport tests. No test requires NASA or private data.
- Changed-file ESLint and project `tsc --noEmit --incremental false` passed.
- The sample command produced the expected counts. An invalid February 30 `--now`
  correctly exited with usage failure. `git diff --check` passed.
- No full-app/privacy tests, browser/device work or build retries were run for these
  disconnected modules. Earlier production-build and physical-iPhone gates remain open.

## Overview & Roadmap handoff

Changed scope: six new files under `lib/discover/feeds/`, two manual/sample files under
`scripts/discover/`, the exact dependency and dry-run command in package/lock files,
NASA's implementation note and Discover documentation. No shared store, paused
privacy/journal/auth source, credentials, remote SQL, account/key registration, real
AI service, production settings, commit, push or deployment was involved.

Completed next stage: [publisher-feed evidence and labels](DISCOVER_FEED_EVIDENCE.md).
The original next bounded task was to implement a distinct publisher-feed evidence branch, its UI labels,
publication-age/freshness rules and curated-over-feed duplicate selection using
synthetic data, still without live fetching. Then resolve the free durable-cache/refresh
authority and maintenance owner before connecting a real source. Do not populate
editorial `verifiedAt` from transport or activate automation as a shortcut.
