# Discover: simpler manual refresh and broader coverage

Local work on top of `60443ae`, November 26, 2026. Not committed or deployed by
this stage. Existing uncommitted privacy/auth/journal/store/configuration work is
preserved and excluded from the validation copy. No accounts, paid services,
credentials, personal records, remote SQL or production settings were accessed.

## What the owner does

For curated content, say **“Refresh Discover”** in the project chat. That requests
fresh source checks and prepared catalog updates. It does not silently publish
code or make food offers verified without reviewing their actual terms.

For the selected feeds, after first-time setup:

1. Open [Refresh Discover](https://github.com/LJAguil/laneslair/actions/workflows/discover-daily.yml).
2. Click **Run workflow**, keep `main` and the default `refresh-now`, then run it.
3. Read the run summary for source success/failure, item counts and last successful
   checks. Reload Discover after a few minutes when the app reader is enabled.

GitHub write access is required, but no token entry, local downloader, command
line or new subscription is needed. Opening the controls does not perform a
refresh. Refreshing the app page alone reads saved content, not publisher sites.
Discover now includes an expandable help panel linking to these controls.

**One-time setup is still pending:** the previous hosted pilot could not run
because this chat had no browser connection for GitHub/Vercel administration.
Inspect the existing free project, off switches and deployment exclusions, run
the approved `controlled-pilot`, inspect its snapshot and authorize production
reads separately. The new default refuses an absent or incomplete successful
baseline; it cannot bypass that pilot. An initialized failed pilot still needs
reviewed recovery. Do not erase its durable reservations.

## What refreshes, and what stays curated

| Content | Current path | Next step toward automation |
| --- | --- | --- |
| NASA news releases, Louisiana Illuminator, Ruston High home athletics | Existing bounded feed operator; repeat manual control added locally | Validate pilot/reader, then separately enable the existing daily schedule |
| Ruston music, markets, arts and campus outings; Monroe-area outings | Manually checked official details, independent evidence clocks | Find published subscriptions or retain a small maintained editorial selection |
| World perspectives | Three manually reviewed Global Voices stories; offline RSS adapter added | Integrate metadata, author/source/license attribution and storage validation into the operator after pilot review |
| Broader community feed | Offline City of West Monroe category-25 adapter | Review high quarantine rate, then add a bounded adapter with migration and source-specific request history |
| Technology | Manually reviewed Ars stories with short original summaries | Resolve feed display/storage terms or evaluate a documented alternative before automatic ingestion |
| Food offers | Individual manual verification | Never turn a holiday name or national offer into confirmed nearby availability |

Manual repeat refresh uses the same reservation, conditional-fetch, timeout,
no-retry, Retry-After and last-good-data rules as the scheduler. It requires the
recurring switch off, so manual operation does not secretly activate daily work.
Repeated clicks within the UTC-day/spacing limits cause no publisher requests.
A no-op keeps the durable snapshot byte-identical, including its update/check
clocks. This avoids a false reservation conflict on a second manual click.
Both reservation/setup guidance and fetch results appear in the run summary;
both summary pipelines preserve a failing command's exit status.
It only updates the existing three-source data branch, whose deployments remain
excluded; no new live source is added in this patch. Failures consume attempts and
are visible in the summary. No AI connection or article-body ingestion was added.
The UI says “Saved feed updates” because an enabled reader is not proof that the
daily acquisition schedule is enabled.

## New checked content and reliability

The November 26 batch has **10 outing entries**: five Ruston listings (Tech
basketball, Cold Canyons at Sundown, Farmers Market, Downtown Vendors open house,
Creative Meetups), Enoch's live music, two Makers Market days and two individual
Land of Lights evenings. Markets, music, arts, campus and outdoor options are
represented. Two entries explicitly have free admission; other unstated prices
remain unknown. Nightly displays have separate hours, not an invented continuous
multi-day opening. No future weekly occurrence is inferred from an undated pattern.

Primary evidence: [Ruston calendar](https://www.rustonlincoln.com/),
[Monroe/West Monroe calendar](https://www.monroe-westmonroe.org/events/), and each
card's direct details link. Pearson Cross at Heirloom was excluded: its November
27 header conflicts with March 7 in its description. The Creative Meetup uses the
official tourism page's 6–8 PM window; a secondary local roundup listed 6–9 PM.
No direct organizer confirmation, guaranteed occurrence or admission charge is
inferred from a tourism listing.

**Nine news stories** cover Louisiana's space-academy bid, striped-bass research,
Ladybird, Etsy's AI terms, ISS research, Nepal food heritage, Nigerian justice,
Kyrgyzstan justice and a national economy/AI headline. Headlines are real publisher
titles. Eight have brief original summaries; the economy article was unavailable,
so its index-confirmed headline/byline/date has an unavailable summary and unknown
access. Opinion, analysis and NASA institutional updates are labeled. Publication
dates without a verified timezone stay date-only, not invented midnight times.
Previous content and food-offer checks are not renewed.

Global Voices [welcomes RSS embedding](https://globalvoices.org/feeds/);
[attribution guidance](https://globalvoices.org/about/global-voices-attribution-policy/)
requires source/author links and CC BY credit, with item/media exceptions. The UI
includes source, byline, direct article and license links, and identifies Discover's
own summary. No images or article bodies are copied. Ars remains manual; no
permission for an automatic public feed mirror is assumed.

## Offline expansion contracts and evidence

`lib/discover/expansion/parsers.ts` has no fetching or app-catalog side effects.
Global Voices retains headline, author, publication time and safe canonical link;
only explicit Technology/Opinion metadata affects those labels. It rejects unsafe
XML, missing authors, future dates and conflicting article identities, expires
news after seven days, and caps results at 20.

The city parser accepts explicit UTC or Chicago timed starts/ends, rejects DST
gaps/repeated hours and invalid dates, accepts only explicit West Monroe, LA
locations, extracts individual official event links and preserves cancellation.
It deduplicates UIDs and rejects conflicts; all-day/zero-length windows, recurrence,
closures, unknown/out-of-state venues and spans over 24 hours need curation.
It filters to upcoming events within 60 days, at most 30. It does not copy full
descriptions or invent prices/admission. It currently returns only a review count
for excluded entries; an operator review queue is future work.

Run `node scripts/discover/preview-expansion.mjs --local-captures` to inspect saved
research files without network access. At the November 26 check, the November 20
captures produced **3 eligible timed city events, 18 entries needing review and 1
still-recent world metadata item**. These are compatibility results from old bytes,
not fresh content, verified events or default catalog additions. The ignored
`build/discover-expansion-preview/report.json` records this distinction. Neither
adapter is connected to the live allowlist. No new subscription quota, free-tier
guarantee or API/scraping permission was invented.

## Validation and release scope

An isolated copy of committed `60443ae` plus only the scoped Discover edits passed
**788 tests across 90 suites**, including manual authority, real-content lifecycle,
license/help rendering and synthetic adapter cases. Offline capture preview and
synthetic update sample passed. TypeScript passed after route generation.
Full isolated lint, workflow YAML and scoped whitespace checks passed. The summary
pipeline explicitly uses Bash with pipefail so a failed update cannot appear
successful just because its summary was written.

The full production build passed, including prerendering and tracing, using
invented public build-only settings (`https://discover-build.invalid` and an
invented publishable-key placeholder) in the ignored validation runner. This
supersedes the earlier missing-settings build blocker. No credentials were read
or copied, no real Supabase project was contacted, and no auth/Entertainment code
or production settings changed. Existing Google Font downloads used approved
network access. This verifies build completion, not runtime sign-in or authenticated
phone behavior. Installed Next.js deployment/environment guides and relevant
Supabase client documentation were reviewed.

Final checks were repeated against locked **Next.js 16.4.6**: all 788 tests, full
lint and the production build passed. A preflight found shared `node_modules` on
16.4.1 despite the lockfile specifying 16.4.6. The dependency installation was
accidentally run in the shared checkout rather than the validation copy; installed
dependencies now match the lockfile. `package.json`, `package-lock.json`, AGENTS
and paused source edits were not changed. The owner was informed. Build output
and public dummy settings remain confined to ignored validation files.

The browser connection was checked again and still returned “Local browser
access is unavailable for this chat.” No hosted workflow was dispatched or
activation variable changed. Publication of this new content/manual-refresh
scope still needs the owner's separate commit/deploy authorization.

Affected: Discover view, types/source registry, candidate selection/new dated
content and tests; refresh-help text; manual-authority/update scripts and workflow;
offline expansion parsers/tests/preview script; this runbook and the daily-guide
index note. No database, package, auth, navigation, global-store, Next config or
privacy files changed. The daily reservation helper also has the no-op fix and
two regression tests. Historical November 19 tests use its frozen catalog so
future checks do not retroactively invalidate the older inspection clock.

## Next bounded task

Finish the three-source hosted pilot and validate its data-only outcome. Then
release the manual-refresh/content changes after separate publication authorization
and check authenticated mobile behavior. The build requirement is resolved. Enable the
reader only with authorization. After two successful manual refreshes, request
activation of the existing daily schedule and observe two daily cycles. Broader
adapter integration needs explicit storage migration/attribution tests before
either source joins acquisition. Keep a small curated Ruston selection alongside
feeds; automatic refresh will not make every local listing or food offer reliable.
