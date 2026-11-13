# Discover: first news-feed validation and adapter proposal

Current implementation update: the disconnected [offline importer](DISCOVER_OFFLINE_IMPORTER.md)
is now implemented and passes synthetic parser/mocked-transport tests. The proposal
below records the source-validation stage and remaining runtime gates; it is not
authorization or evidence of live ingestion. Next: distinct feed evidence/UI behavior
with synthetic data, followed by free cache/refresh coordination before live use.

2026-11-12, America/Chicago. **Source-validation stage complete; live ingestion is
not enabled.** Local HEAD remains `8d4a84d`. This work preserves all existing changes,
including the paused privacy tree and local Discover stages 1/2. No accounts, keys,
remote database work, production settings, commit, push or deployment were involved.

## Recommendation

Pilot NASA's documented **News Releases** RSS feed, initially as a local dry-run
importer. Use publisher headlines, article URLs, publication timestamps and optional
bylines. Label each item **Institutional update** and **Publisher feed — not
editorially checked**. Omit article bodies, images, logos and HTML excerpts. Show
**Summary unavailable — open the publisher's article** unless a separate, dated
editorial summary exists. No runtime AI connection or article scraping is proposed.

This adds a narrow science/space source, not comprehensive science journalism or
general local/national/world coverage. Existing manual sources remain necessary.
Do not register Guardian access or substitute a paid API/cache to expand coverage.

## Primary-source access and reuse assessment

- [NASA's official RSS directory](https://www.nasa.gov/rss-feeds/) publishes the
  endpoint `https://www.nasa.gov/news-release/feed/` as its News Releases feed.
  The actual directory HTML, not a guessed legacy URL or third-party list, established
  that address. Anonymous requests succeeded without registration or a key.
- [NASA's media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
  support informational use under their stated conditions, require source credit,
  distinguish protected branding/third-party material, and prohibit implying
  endorsement. The proposed feed-reader presentation uses text metadata and direct
  links, not blanket republication of whatever appears in the feed. The guidelines
  are not a universal license for all third-party text or media hosted by NASA.
- The observed XML has no channel-level copyright notice or license link. **Absence
  is not permission.** Recommendation is limited to the publisher-distributed feed's
  headline/link/date/byline metadata, with attribution and no copied summaries,
  full articles or media. Reassess scope/terms before adding other fields or sources.
- [NASA's robots file](https://www.nasa.gov/robots.txt) allowed the wildcard user agent
  at inspection. Robots rules concern crawling behavior; they do not grant content
  reuse rights. This proposal uses the published RSS endpoint rather than crawling.
- [NASA's privacy notice](https://www.nasa.gov/privacy/) describes server-side request
  logging. A future shared server fetch should send no user cookies, account IDs,
  precise location, interests or other private app data. Normal network metadata and
  a descriptive application user-agent necessarily accompany requests.

No numeric subscriber quota, guaranteed update interval, availability SLA or
feed-specific blanket republication license was established. Public anonymous access
does not imply unlimited polling. No outreach or separate permission request was sent.

## Transport evidence

The historical manual probe was `scripts/discover/check-nasa-feed.ps1`. It is
superseded and excluded from the release because it bypasses the later admission
ledger. Use the [manual-capture workflow](DISCOVER_MANUAL_CAPTURE.md) for any
separately requested capture; do not rerun that research probe.
It has a fixed endpoint, rejects redirects, disables cookies/default credentials,
uses a 15-second total deadline per request, limits decompressed bodies to 1 MiB,
and prohibits XML DTDs/external resolution. It makes at most three requests per
manual invocation, with no retries or polling. It persists aggregate metadata and
optional channel rights notices, not RSS XML, headlines, descriptions or article
bodies. It is not imported into application code or scheduled anywhere.

Two manual runs made six feed requests total. The first observation at 07:34 UTC is
retained in `docs/discover/NASA_FEED_TRANSPORT_2026-11-12.json`. The second, including
rights-declaration checks, is the [primary observation](discover/NASA_FEED_TRANSPORT_2026-11-12_073649_UTC.json)
at 07:36:49 UTC / 1:36:49 AM CST. Both returned the same representation metrics:

| Check | Observed result |
| --- | --- |
| Anonymous direct GET | HTTP 200; no redirect followed |
| Format | RSS 2.0; `application/rss+xml; charset=UTF-8` |
| Decompressed body | 264,725 bytes; below the proposed 1 MiB ceiling |
| Items | 10 |
| Headline, URL, GUID, publication time | Present on all 10 |
| Byline (`dc:creator`) | Present on 3; missing on 7 must remain unknown |
| Categories | Present on 9; no guaranteed complete topic taxonomy |
| Publication timestamps | All 10 parsed with explicit zones; none future-dated at inspection |
| Publication range | Nov 10, 05:05 UTC through Nov 12, 05:05 UTC |
| Links and GUIDs | 10 unique raw values each; all article URLs HTTPS on approved NASA hosts |
| Body-bearing fields | Description and encoded content on all 10; deliberately discarded |
| Cache policy | `must-revalidate, max-age=300` |
| Validators | Weak ETag and Last-Modified provided |
| Conditional GET | Both If-None-Match and If-Modified-Since returned 304 with zero body bytes |
| Channel TTL / rights declarations | Not present |

This establishes transport and basic XML structure at two nearby instants. It does
not establish a long-term cadence or production parser acceptance. Unique raw URLs
are not proof of semantic story uniqueness. A 304 confirms a cached representation
can be reused; it does not mean a person checked each story or prove factual accuracy.
HTTP Last-Modified was 05:01 UTC while the newest item publication time was 05:05 UTC;
do not treat those distinct fields as an item-level editorial update timestamp.

## Proposed next implementation slice — local importer only

Expected new files: `lib/discover/feeds/nasa.ts`, `lib/discover/feeds/types.ts`,
synthetic `lib/discover/feeds/nasa.test.ts`, and a manual dry-run command under
`scripts/discover/`. Select/review a maintained XML parser's upstream documentation,
license and dependency impact before adding it; none was installed in this stage.
Do not implement an XML parser with regular expressions or depend on undocumented
transitive Next.js internals. The PowerShell probe uses the installed .NET XML reader,
but that does not choose a production JavaScript parser.

Importer acceptance criteria:

1. Fixed documented feed only; no user-supplied URL, cookies, credentials or per-article
   fetches. Reject redirects, unsupported content types and HTTP errors. Enforce byte
   and deadline limits while streaming, before parsing; accept RSS 2.0 only initially.
2. Reject DTD/entity declarations and malformed XML. Cap input items (e.g. 50), fields
   and output records (10). Reject rather than truncate an over-limit headline into
   a fabricated publisher headline. Preserve characters/entities as text, never HTML.
3. Admit only nonempty bounded headlines, stable IDs and HTTPS article URLs on
   `www.nasa.gov` or `science.nasa.gov`, without embedded credentials or unexpected
   ports. GUIDs are opaque identities, not URLs to fetch. Normalize dates to UTC only
   when an explicit zone is present. Missing/invalid/future dates are withheld for
   review, never replaced by fetch time. Missing authors remain null.
4. Discard description/encoded content/media. Source-supplied fields remain publisher
   metadata; an imported excerpt is never called an original Discover summary.
5. Deduplicate by canonical article URL and source GUID, detect conflicting duplicates,
   and keep incomplete/conflicting records outside recommendations. Prefer eligible
   existing curated coverage for the same article; never refresh its editorial check
   timestamp from feed transport or silently inherit an old summary as freshly checked.
6. Test ordinary RSS, namespaces/entities/CDATA, missing fields, hostile links, invalid
   dates, oversized/slow responses, 304 without a baseline, malformed XML, DTDs, 429,
   server errors, duplicates and changed GUIDs using invented records/mocked transport.
   Tests must not require NASA, credentials or personal data.
7. Dry run reports candidate counts and validation failures for review. No app imports,
   endpoint, scheduler, source automation activation, database writes or publication.

## Required contract/UI change before any live feed

The existing catalog intentionally requires editorial `verifiedAt` for non-unverified
evidence. Passing a fetch time there would bypass that protection. Do not merely
loosen the check or stamp the source's research date onto imported items.

Propose a distinct publisher-feed evidence branch with null editorial verification,
the fixed feed URL, source item ID, original successful body-fetch time and most recent
successful representation-check time. Preserve publication time independently. A
304 can advance representation-check time only when a valid prior snapshot exists;
failure, timeout, malformed data, or 304 without baseline cannot advance it.

`catalog.ts`, `types.ts`, `presentation.ts` and `components/discover/discover-view.tsx`
would later need explicit support. Show **Feed checked** and **not editorially checked**
instead of Official listing checked/Publisher source checked. Keep article access
unknown because the importer does not open articles. Format remains Institutional
update. Show Summary unavailable rather than generating or copying a summary.

Proposed runtime policy for a later separately scoped integration: request no more
often than hourly within a shared refresh authority; use conditional requests,
single-flight refresh and Retry-After/backoff with no retry storm. Withhold a snapshot
after 24 hours without successful validation, and items older than seven publication
days even if the unchanged feed keeps returning 304. Do not infer a withdrawal from
absence in a finite latest-items feed. Return failures as data without claiming an
empty fetch verified the old catalog. These are proposed product limits, not NASA quotas.

## Free-service and hosting dependency

No new services, paid API, subscription or automatic overage path is needed for the
local importer. NASA's tested endpoint requires no API key; the current runtime stays
unchanged and makes no feed requests. Source-check scripts run only when invoked.

I read the installed Next.js 16.4.1 fetching, Cache Components, `use cache` and cacheLife
guides. The `use-cache.md` runtime-caching section says the default in-memory handler
may not persist across serverless requests. `use cache` with an hourly lifetime alone
therefore cannot guarantee a global 24-requests/day cap or durable last-good data.
Cold starts and deployments must not erase the stated safety/usage policy silently.

Before live integration, inspect the existing authorized hosting plan/limits and
evaluate whether the deployed fetch cache provides adequate free persistence and
refresh coordination. If a hard global cap needs a shared durable ledger, propose
that separately; do not add paid remote caching or run remote SQL. The lowest-effort
free fallback remains a manually produced, reviewed catalog snapshot with explicitly
approved publication. No new scheduling or hosting configuration is approved here.

## Handoff

Validation: both live manual transport probes completed, and the final probe's
PowerShell syntax check passed. The 44 existing catalog/presentation tests passed;
source-registry ESLint and `git diff --check` passed. These checks do not test a
production importer, which has not been written, or establish a successful app build.
No full-app/privacy tests, device checks or build retries were run in this stage.

- Verified: documented public endpoint, bounded successful transport, RSS structure,
  field presence and conditional revalidation at the recorded times.
- Conditional recommendation: text-only personal feed-reader pilot with attribution,
  direct links and explicit institutional/unreviewed labels; not blanket content reuse.
- Still uncertain: long-term reliability, publisher quota, production parser choice,
  global free cache/refresh guarantees and maintenance ownership. Current app build
  and physical-iPhone acceptance remain open from stage 2.
- Work this stage: manual probe, aggregate evidence, this proposal, NASA registry
  assessment update and a link from the catalog guide. Existing UI/curated content,
  contract behavior, paused work and automation approval flags remain unchanged.
- Next bounded task: implement/test the offline importer and mock transport contract
  above; keep it disconnected from the app. Runtime evidence/UI/cache integration
  follows only after these acceptance criteria and hosting questions are resolved.
