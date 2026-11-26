# Daily Discover subscriptions — prepared November 19, 2026

**Latest local work, November 26:** [manual refresh and coverage expansion](DISCOVER_MANUAL_REFRESH_2026-11-26.md)
adds a repeatable `refresh-now` choice (the new default), only after a successful
first pilot. The published `60443ae` control release still uses the earlier default
until these new changes are separately released. This supersedes the default-mode
description below; no schedule, reader or source-acquisition setting was changed.

**November 26 update:** the owner approved a first, data-only controlled pilot.
See [pilot runbook](DISCOVER_CONTROLLED_PILOT_2026-11-26.md). Its manual control is
independent of the recurring switch: default dispatch skips the job; explicit
`controlled-pilot` requires the recurring switch off and an absent data branch.
An existing branch, even a failed/pending reservation, blocks another pilot.
This supersedes the shared-gate manual-run instructions below. Production reads
and recurring activation remain outside the first-pilot authorization.

The owner authorized implementation of daily news updates and one verified local
event feed. This supersedes the manual-only design direction for these selected
feeds, but **activation and publication are still pending**. No commit, push,
deployment, remote data branch, account, subscription, production setting, remote
SQL or live scheduled job was created during implementation. The implementation
baseline was `144354d`; the owner authorized commit/deployment on November 20,
with the two activation switches left unchanged.
The prior outing/news/filter improvements and all paused work are preserved.

## Implemented first slice

| Subscription | Verified evidence | Automatic content / limitations |
| --- | --- | --- |
| NASA news releases | [Official RSS page](https://www.nasa.gov/rss-feeds/), existing November 13 manual transport evidence and bounded parser | Headline, byline when supplied, date, direct link. Institutional updates, not independent reporting. No new NASA feed request in this stage; the daily transport still needs its first controlled live run. |
| Louisiana Illuminator | [RSS endpoint](https://lailluminator.com/feed/) returned HTTP 200, RSS XML, about 1.01 MB on November 19; [republishing guidelines](https://lailluminator.com/republishing-guidelines/) reviewed | Parsed 30 recent headline records from the saved response. Publisher/author credit and direct links; no article bodies, images or generated summaries. Explicit commentary tags become Opinion; other stories remain Unclassified. DC Bureau maps to National; otherwise Louisiana is a source-level starting tag, with Discovery included. This is not semantic topic analysis. |
| Ruston High athletics | [Organizer calendar](https://www.rustonhighathletics.com/calendar) explicitly offers a subscription; its [linked iCalendar feed](https://mmboltapi.azurewebsites.net/api/v2/events/calendar/2490194/0/calendar.ics) returned HTTP 200 / text/calendar / 20,618 bytes | Saved capture parsed into 19 upcoming entries explicitly located at Ruston High School within a 60-day window. Away/unknown locations are excluded. UTC start/end times convert to America/Chicago. Admission, ticket price and spectator eligibility remain unknown. This is a narrow athletics source, not a general Ruston nightlife feed. |

Subscription availability is verified; the actual occurrence of every event is not
independently verified. The organizer offers calendar synchronization, but no
blanket license for descriptions/media or undocumented APIs is inferred. Only
short public event facts and a link back to the official calendar are retained.
No published numeric publisher request quota was established; our limits below
are courtesy/application caps, not a claim about publisher-granted quotas.
The Illuminator news HTML page returned an access challenge, which was not bypassed;
the separately published RSS endpoint worked normally. Future blocks fail closed.

## Daily update path and free-only controls

1. A GitHub Actions workflow is prepared for **11:17 UTC daily** (5:17 AM CST /
   6:17 AM CDT). Scheduling is best effort; manual dispatch is also supported.
2. It runs only in `LJAguil/laneslair`, on `main`, when the repository is public and
   repository variable `DISCOVER_DAILY_ENABLED` equals `true`. It uses the standard
   `ubuntu-24.04` runner, Node 22 and a five-minute job timeout. No Actions artifacts,
   cache uploads, larger runner, paid fallback or new account is configured.
3. The built-in workflow token needs repository `contents: write`. The script
   targets only the fixed **discover-data** branch; the permission itself is a
   repository-level permission, not a branch-scoped credential. No new API key or
   personal access token is needed. No token is saved in the data or printed.
4. Before fetching publishers, the workflow writes each attempt reservation to that
   branch. If persistence fails, no publisher request follows. One attempt per
   source per UTC date, at least six hours apart; failures consume the attempt.
   Recent reservations survive restarts and crashes. Concurrency serializes jobs;
   compare-and-swap/non-force ref updates reject another writer's change.
5. Each source gets at most one GET, no redirect following or automatic retry,
   no cookies or article/detail requests, a 15-second deadline and 2 MiB body cap
   (NASA's existing stricter parser bounds still apply). ETag/Last-Modified support
   conditional 304s. Retry-After is respected with a bounded 30-day backoff.
6. A validated public JSON snapshot (at most 200 KB, 30 items/source) is written
   after processing. A source failure retains that source's prior successful
   content/check clocks while allowing other sources to update. A crash leaves
   the durable pending reservation and last good data visible, without resetting
   its request allowance.
7. The branch contains only `catalog.json` and a deployment-disabling `vercel.json`.
   The app's `vercel.json` also excludes `discover-data` from Git deployments.
   There are no daily application-code commits or daily Vercel builds. Data history
   does grow and should be reviewed periodically; no destructive history cleanup
   is automated.
8. With production environment variable `DISCOVER_DAILY_ENABLED=true`, Discover
   reads the fixed public GitHub data URL through a public Next cache. It normally
   revalidates after 15 minutes, with a one-hour cache expiry. Host caching and
   outages can delay visibility. No publisher request occurs during page rendering.
   Disabled mode performs zero data-host reads and keeps the current curated path.

[GitHub documents standard public-repository runners as free](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
The public-repository guard is deliberate: private repositories can incur usage
charges. Existing Vercel Hobby limits still apply to normal app traffic; no upgrade,
subscription or automatic paid fallback was enabled. GitHub scheduling can be
delayed or dropped, and public scheduled workflows can be disabled after inactivity;
this does not provide a daily-delivery SLA. See [schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
and [Vercel branch deployment exclusions](https://vercel.com/docs/project-configuration/git-configuration).

## Truthful presentation and lifecycle

- Automatically imported records carry **subscription-feed** evidence. They never
  acquire an editorial verification timestamp or borrow an original summary.
  News cards explicitly state that summaries and article access are unknown.
- Daily subscription metadata becomes stale at **36 hours** after its last
  successful feed check, allowing some daily scheduling delay. This is a new
  transport-evidence policy, not a relaxation of the existing 24-hour editorial
  checks or the historical manual NASA feed policy. News also expires seven days
  after original publication; a 304 cannot revive an old story.
- The UI shows successful feed timestamps and failed/unfinished attempts separately.
  Stale records leave current results. Malformed/unavailable data-host snapshots
  fall back to curated content with an unavailable notice. A cold app instance does
  not invent a durable local cache if GitHub itself is unavailable.
- Valid 200 responses replace each source representation, so removed or rescheduled
  events do not accumulate. Explicit cancellations are archived. Unsupported
  recurrence, floating/TBA times, unknown locations and conflicting identifiers are
  excluded or fail parsing rather than being guessed. Missing events are not called
  canceled. Near-real-time cancellation detection is not promised.
- Known end times take precedence over freshness. Start-only listings retain the
  conservative rule of leaving current results at their stated start.
- Canonical article URLs deduplicate curated and subscribed news. Fresh curation
  wins without borrowing feed checks; editorial withdrawal/conflict remains
  authoritative. A successful daily NASA representation supersedes only the old
  bundled NASA transport copy, including an authoritative empty feed.
- The saved November 13 NASA bundle/digest and all curated evidence clocks remain
  unchanged. Manual NASA capture must be paused before enabling the daily operator;
  separate machines/tools do not share this workflow's ledger.
- Food offers and the rest of the Ruston/Monroe venue calendars remain curated.
  No AI connection, personal-data inference, precise-location tracking or database
  storage was added.

## Local verification and affected files

The isolated validation tree contains committed HEAD plus the 29 scoped code/config
files (including the previous local content/filter work), without the paused
privacy/auth/store/journal changes. **739 tests passed across 80 suites**, including
the new daily parser/storage/transport/lifecycle tests. Full isolated ESLint,
project TypeScript, production build, YAML parsing and whitespace checks passed.
The production build used network access only for existing font downloads.
The offline sample runs without live acquisition:

```sh
node scripts/discover/daily-update.mjs --help
node scripts/discover/daily-update.mjs sample
```

Live prepare/fetch commands refuse operation outside the named enabled GitHub
workflow. No remote storage write, scheduler run or end-to-end hosted pilot is
claimed. Local browser access remains unavailable; new authenticated/mobile visual
acceptance is pending. Raw research captures stay ignored under `build/`; they are
not app content or test fixtures.

New files: `lib/discover/daily/` policy, parsers, snapshot/reservation validation,
bounded transport, reader/server cache, status and tests; two daily scripts;
`.github/workflows/discover-daily.yml`; `vercel.json`; this guide. Integration edits:
Discover route/view, catalog types/lifecycle/presentation, published loader/source
registry, selective-refresh guards and preview compiler. No package/schema,
privacy/auth/global-store or journal changes. Prior improvements are preserved.

## Recommended next bounded task

After separate release/activation authorization:

1. Review and publish only the Discover changes, with both switches still off.
   Recheck current Git/hosting/free-plan state and the working-tree release scope.
2. Verify workflow write permission and data-branch deployment exclusion; pause
   independent manual NASA requests. Enable the repository variable, run one manual
   workflow dispatch and inspect each source's actual status/check timestamp.
3. Confirm a successful snapshot, no unintended deployment, public metadata-only
   storage and preserved clocks on a deliberately mocked failure. Enable the app
   variable in the authorized release and verify authenticated phone behavior.
4. Observe two daily cycles: no more than one source request per UTC date, useful
   news mix, real local times, stale/failure notices and zero paid services. Turn off
   the repository variable to stop ingestion; turn off the app variable to return
   to the curated-only path. No SQL, deletion or force push is required.

Only after that pilot, add another documented local community/arts feed and an
independent national/world or technology feed with suitable display terms. The
athletics feed and science/statehouse feeds are useful first adapters, not complete
coverage. Broader curation and food-deal verification remain separate work.
