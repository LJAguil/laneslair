# Discover catalog contract — stage 1

2026-11-12, America/Chicago. Local implementation only; no publication authorized.

## Scope and evidence

Owner authorized stage 1 after the discovery proposal. Local HEAD was rechecked at
`8d4a84d`; production was not checked. Existing tracked/untracked privacy, journal,
assistant, store and configuration changes were preserved. This stage adds only
`lib/discover/*` and this guide. It does not change Discover's existing sample UI,
Overview, search, assistant, auth, notifications, storage, database or navigation.

The installed Next.js server/client guide was read before coding. The contract is
framework-independent TypeScript with no fetches, clock reads, personal-data imports
or new dependencies. No remote SQL, accounts, credentials, subscription, commit,
push or deployment was involved.

## Owner preferences

- Ruston/Lincoln Parish first; include Monroe and nearby outings roughly 30 minutes
  away. This is an editorial city preference, not calculated driving time or GPS.
  Weekend trips remain a separate category.
- Prefer free and under $20, with occasional clearly priced higher-cost choices.
- News: Louisiana/local, technology, science, national/world and a discovery mix.
  Topic strings are extensible; no inference from journals, habits or other app data.
- Mainly fast food/chains; app/account offers are welcome with explicit requirements.

## Files and use

- `lib/discover/types.ts`: public-content types and owner defaults.
- `lib/discover/sources.ts`: research source registry, not a list of active adapters.
- `lib/discover/catalog.ts`: typed-record validation, lifecycle assessment and
  conservative duplicate grouping. Consumers inject an epoch-millisecond clock.
- `lib/discover/catalog.fixtures.ts`: invented `.invalid`-domain fixtures for tests
  only. These are not actual events, articles, promotions or a production catalog.
- `lib/discover/catalog.test.ts`: synthetic lifecycle and policy checks.

`catalogErrors` accepts typed curated records. It is deliberately **not** an arbitrary
JSON/XML validation boundary. A future importer needs its own schema/parser,
payload limits, sanitization, source-specific field mapping and terms review before
calling these helpers. Render content as text, not publisher HTML. HTTPS links are
validated; their domains need not match the registry because organizers can link to
ticket providers. A curator must verify that relationship; these URLs are not a
server-fetch allowlist.

## Evidence and time rules

Each item records a source ID and item URL, optional source item ID, evidence level,
human verification time, fetch time and source-update time. Registry assessment dates
are historical research dates, never item verification. Evidence level describes the
claim's provenance, not a guarantee of accuracy. A fetch does not renew human checks.
Non-unverified evidence without a verification time is invalid; unverified records
remain review-only even if freshly fetched.
An item whose recorded source update postdates its human verification also needs
confirmation; fetching changed content cannot preserve an old verification claim.

Instants require explicit UTC/offset timestamps with seconds. Venue/offer windows
also carry an Intl-supported time zone. Local all-day/date-only windows use an
exclusive ending calendar date in that zone. Do not convert them to UTC midnight or
assume a day is 24 hours. Only use date-only event windows for explicitly all-day
events, never to disguise an unknown start time. A start-only event is allowed;
it retires at its start because an end time must not be invented. Here `expired`
means no longer eligible for upcoming results, not proof that such an event ended.

Invalid records fail closed into review-only. Canceled, postponed and withdrawn
records go to archive, where a later UI can warn users who saved them. Passed end
boundaries go to archive before stale checks. Future windows are `upcoming`, not
currently redeemable. Valid current news is `current`; date/time or access can remain
explicitly unknown. Original summaries require text and a written timestamp;
unavailable summaries require a reason. Reporting, opinion, analysis, institutional
updates and unclassified content are distinct. No runtime summary or headline
generation is connected.

Freshness policy is elapsed time since human review:

| Content | Recheck threshold |
| --- | --- |
| Event more than 48 hours away | 7 days |
| Event within 48 hours, or already running | 24 hours |
| All-day event within two local calendar dates | 24 hours (conservative) |
| News | 24 hours |
| Deal | 24 hours for evidence, terms and any local participation check |

Equality at a threshold is stale. `stale` records are review-only, outside active
results. These are product policies, not source update guarantees. A later automatic
news adapter may propose a different freshness policy; it must not silently turn
fetch time into human verification. Reevaluate on load, foreground, and relevant
time boundaries; evaluating once when the data was built is insufficient.

## Deals and duplicates

Deals require an exact validity window to enter eligible results. Unknown dates or
unreviewed requirements remain `needs-confirmation`; a food holiday is not evidence.
Purchase requirements, app/account flags, coupon, channels and exclusions are
explicit. Curators must substantiate even "none"/false/empty values before marking
terms reviewed. Missing end dates are not interpreted as indefinitely valid.

Local participation requires named locations plus its own recent check. National
offers with unknown local participation go to `national-check-local`, never the
main nearby collection. A restaurant locator alone cannot establish participation.
Unknown prices remain unknown; zero is not a substitute for missing price evidence.

Duplicate grouping preserves all records, including disagreements, rather than
silently choosing a winner. News groups by canonical article URL or explicit editorial
story group; tracking parameters and fragments are removed, article-defining query
parameters retained. Similar headlines alone do not prove duplicates. Events group
by source item/editorial group plus start instant (or local date window); changed end
times remain together for review and separate recurrence starts remain separate.
Deals use source offer identity plus validity window, so a shared general terms page
does not collapse unrelated promotions. Curators must use distinct IDs for separate
offers/locations and explicit groups for confirmed duplicates. Rescheduled starts,
changed article URLs and cross-publisher coverage require editorial review.
Validate before grouping. Do not flatten conflicting groups into recommendations
until cancellation/status conflicts have been resolved.

## Sources, cost and next stage

The source registry preserves the discovery research snapshot dated 2026-11-11:
Experience Ruston, The Local, Louisiana Tech, Lincoln Parish Library and Chamber;
Louisiana Illuminator, NASA and optional Guardian API; Wendy's, Popeyes, Burger King
and Chick-fil-A Ruston. It enables no automatic access. Public availability is not
scraping permission. Feed transport, parsing, attribution and applicable reuse terms
remain adapter-specific gates. Guardian needs a separately approved key; its recorded
500/day and 1/second noncommercial limits are historical research, not reverified here.
No paid fallback is permitted. See official URLs in the registry and the original
discovery chat for source evaluations. There is no confirmed live promotion dataset.

Stage 2 proposal: one mobile Discover route with Things to do / News / Food deals,
checked curated public content, source/freshness labels and truthful empty states.
It must honor `placement` as well as `state`, preserve news format/paywall labels,
and distinguish nearby from trips. Curated updates require a named maintenance owner
and separately approved publication. One permitted RSS adapter can follow after its
access/reuse gates pass, using explicit Next.js Cache Components caching and bounded
requests. No database is needed for these stages.

Expected UI files: `app/(app)/discover/page.tsx`, `components/discover/*`, plus new
isolated catalog data/helpers. Overview/search still consume the old sample events;
coordinate real-catalog adoption or clear sample labeling there. The already-modified
shared app store, assistant, app layout and Next configuration overlap paused work;
this stage avoided all of them. A future release must scope staged files deliberately
to avoid publishing the existing privacy tree. No release authorization is implied.

## Validation and Overview & Roadmap handoff

Validation on 2026-11-12: `npx vitest run lib/discover/catalog.test.ts` passed
32 tests; `npx eslint lib/discover` passed; `npx tsc --noEmit --incremental false`
passed for the current checkout. Full application tests, build and device checks
were not run for these isolated modules. These results do not certify paused work.
Stage 1 establishes a local contract, not live source availability, a feed integration
or phone acceptance. Existing modified files remain unchanged by this task.

Next bounded task: implement the three-tab mobile view against a small checked public
catalog, after agreeing on curation ownership and coordinating shared sample surfaces.
Keep existing daily features and paused work intact. No production access is needed.

## Stage 2 — local mobile view, 2026-11-12

Owner authorized the next stage in this chat. Discover now uses its independent
public catalog rather than the global sample-event store. The existing protected
route and main navigation are unchanged. New UI: Things to do / News / Food deals,
nearby versus weekend trips, free/$20 price filters, editable news interests, four
initial stories plus Load more, and bookmarks explicitly limited to this mounted
page visit. Preferences and bookmarks reset on reload/navigation; no storage/sync or
AI service was added. No curator or recurring update service has been assigned.

Only current eligible records enter recommendations. National offers have their
own section; stale/incomplete/conflicting records appear in a collapsed Needs a
check section. Unsaved ended/canceled items are hidden; bookmarked archived items
retain status warnings. Empty states include source links. Dates are reevaluated
with a second-precision client clock plus focus/pageshow/visibility catch-up, never
with a fabricated renewed source-check time. Server rendering withholds listings
until that clock is available, preventing old prerendered active-deal claims.

The record's `verifiedAt` means editorial source inspection, including the assistant's
manual source research in this chat; it does not claim direct venue contact or a
human confirmation. Public page retrieval may be cached. Routine future feed fetches
must not set this field automatically. The initial batch was inspected at
`2026-11-12T07:06:20Z` (November 12, 1:06 AM CST). It is deliberately dated and will
age out under stage 1 policy. No automatic discovery or updates run in the app.

### Initial public content and uncertainties

| Source | Catalog use / qualification |
| --- | --- |
| [CedarTown](https://www.rustonlincoln.com/events/holidays-in-cedartown-2/) | Separate Nov 12 preview and Nov 13 shopping sessions with published hours; preview $30, Friday price unknown. Ticket availability is not confirmed. |
| [Downtowns Out to Lunch](https://www.rustonlincoln.com/events/downtowns-out-to-lunch/) | Nov 13, 11:30 AM–1 PM Central; free admission. |
| [The Local music listing](https://www.rustonlincoln.com/events/the-local-live-music-henry-hood-viryln/) | Nov 13, 7–9 PM Central; price/admission requirements unknown. |
| [Louisiana computer program](https://lailluminator.com/2026/11/10/apple-to-provide-18000-computers-to-louisiana-groups-local-governments/) | Updated publisher headline/body used, rather than the outdated figure in the URL/search excerpt; Elise Plunk credited. |
| [Nuclear-campus reporting](https://lailluminator.com/2026/11/11/congress-nuclear/) | Greg LaRose credited; original short summary links to reporting. |
| [Battery-farm reporting](https://lailluminator.com/2026/11/11/repub/battery-farms/) | Alex Brown/Stateline and republishing outlet credited; original short summary. |
| [Scotland peatlands](https://science.nasa.gov/earth/earth-observatory/scotlands-flow-country/) and [Navajo Reservoir](https://science.nasa.gov/earth/earth-observatory/water-surges-into-navajo-reservoir/) | NASA institutional updates, with author credit and original short summaries. No images/full articles reproduced. |
| [Wendy's official homepage](https://www.wendys.com/) | Lists a Nov 15, 2026 U.S. small-Frosty-with-purchase app promotion. App and account required; Ruston participation and full in-app exclusions/redemption limits unconfirmed. Terms review remains null, so it is only a Needs a check item, never a confirmed/active nearby deal. |

Four event sessions, five articles and one incomplete national offer are present.
No checked Monroe outing, weekend trip, campus event or trivia occurrence is seeded
yet. These are coverage gaps, not invented recurring listings. A candidate Campfire
Run search result was excluded because opening its organizer URL showed a different,
older canceled event. No food-holiday-only claims were admitted.

News uses a new optional `publishedOn` date when an exact time and zone have not
been verified. The UI explicitly says publication time unavailable; no midnight time
is invented. Access says the article opened without a paywall when checked, rather
than promising continued access. Source registry assessment dates remain historical.
Current selection is a small initial mix, not comprehensive local/world reporting.

### Files and shared-work boundary

- Changed `components/discover/discover-view.tsx`; no global-store dependency remains
  in the new view. Existing legacy event-card/event-row remain for other consumers.
- Added `lib/discover/curated.ts`, `presentation.ts`, `presentation.test.ts`,
  `clock.ts`, and `clock.test.ts`; extended date-only publication validation in
  `types.ts`/`catalog.ts`.
- Changed only the output titles in `lib/sample-data/events.ts` to begin with
  `Sample:`. This propagates honest labeling to existing Overview/search/mock replies
  without editing their shared store or paused assistant files. Those surfaces are
  still prototypes; their old save actions do not save real Discover picks.
- Updated this guide. No changes to paused privacy/journal/auth/store/configuration
  source, migrations, personal records, credentials, remote services or publication.

### Stage 2 validation and handoff

Final checks: 46 tests across three Discover suites passed; changed-file ESLint,
project `tsc --noEmit --incremental false`, and `git diff --check` passed. Full app
tests were not run; no paused privacy acceptance was resumed. Browser checks use an isolated
public-content-only Vite preview of the real component, not the authenticated app
provider. This avoids loading personal records. It is not physical-iPhone or full
Safari/Home Screen acceptance. Temporary preview/build files live under ignored
`build/`; no new application route or dependency was introduced for testing.
Browser checks passed for free-price filtering, visit bookmarks and reload reset,
news pagination, interest selection and zero-interest empty state, keyboard tab
switching, weekend-trip empty state, and incomplete-offer separation. At 320px and
390px viewport overrides, measured page width equaled available viewport width;
the preview reported no console errors. These are isolated-browser checks, not
authenticated-route, Safari or physical-device acceptance. The preview server was
stopped and the disposable build snapshot removed after testing. Native desktop
interaction was stopped when user input was detected; remaining checks used the
in-app browser without taking over the desktop.

The ordinary build attempt failed while cleaning an existing `.next` hardening
directory (`EPERM`). No permissions or cleanup were forced on that directory.
An isolated source snapshot was attempted to keep output separate: after correcting
snapshot route discovery and ancillary TypeScript imports, it encountered blocked
Google Fonts downloads. The network-enabled retry hit a Turbopack CSS-worker startup
panic. A complete Next production build is **not established**. Do not treat a
preliminary snapshot build that listed only /404 as application build evidence.

Next bounded task: choose a maintenance owner/cadence and validate one documented
news feed's transport and reuse terms before proposing a bounded RSS adapter. Keep
manual local-event/deal checks; no key registration, remote SQL or publication is
authorized by this handoff. Any release also requires the full build and actual
phone checks plus explicit selection that excludes the paused privacy tree.

## Next-stage update — feed validation, 2026-11-12

The [feed-validation report and concrete importer proposal](DISCOVER_FEED_PROPOSAL.md)
now record direct tests of NASA's documented News Releases feed, primary-source
reuse assessment and the remaining evidence/cache contract changes. Two bounded
manual probes confirmed anonymous RSS 2.0 responses and conditional 304s. Only
aggregate metadata was saved; no runtime ingestion, source automation, summary
generation or UI behavior was enabled. The next bounded task is an offline NASA
importer with synthetic parser/mocked transport tests, disconnected from the app.
Maintenance ownership remains undecided; deployment/build/device gates remain open.

## Offline importer update — 2026-11-12

The [offline NASA importer](DISCOVER_OFFLINE_IMPORTER.md) now includes bounded XML
parsing, injected conditional transport, synthetic tests and a local-file dry-run
command. All 112 Discover tests passed, plus lint and project TypeScript checks.
No real feed requests, application integration or automation were enabled in this
implementation stage. Next: explicit publisher-feed evidence/labels and lifecycle
rules tested with synthetic data. Free durable caching and maintenance ownership
still need resolution before any live connection.

## Publisher-feed evidence update — 2026-11-12

[Feed evidence and its handoff](DISCOVER_FEED_EVIDENCE.md) now separate transport
checks from editorial verification, define 24-hour freshness/seven-day publication
age, select curated/feed duplicates without borrowing summaries, and label feed
cards explicitly. All 140 Discover tests pass. Default catalog content and automation
remain unchanged; only synthetic snapshots exercise the new bridge. Next: offline
durable snapshot restoration tests before proposing free storage/refresh authority.
