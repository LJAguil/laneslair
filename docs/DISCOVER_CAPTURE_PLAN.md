# Discover: bounded manual NASA capture plan

Proposed 2026-11-12, after [public-only loader acceptance](DISCOVER_MOBILE_ACCEPTANCE.md).
This specifies one manual source-acquisition workflow. It does not enable live
fetching, choose a release artifact, appoint an ongoing curator or authorize publication.

## Source and content scope

The [official NASA RSS directory](https://www.nasa.gov/rss-feeds/) was rechecked and
still lists News Releases. The fixed endpoint previously validated by direct probes is
`https://www.nasa.gov/news-release/feed/`. This stage revisited the directory and usage
guidelines, not the feed endpoint; it made **zero feed requests** and captured no article.
Anonymous access/conditional responses remain dated evidence from earlier probes.

NASA's [media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
require acknowledgment, distinguish third-party rights and prohibit implied endorsement.
These do not establish a blanket license for every hosted item. Continue the narrow
publisher-distributed metadata approach from [the source assessment](DISCOVER_FEED_PROPOSAL.md):
exact headlines, direct article links, dates and optional author only. Discard descriptions,
article bodies, media, logos and HTML. No AI summarization, model connection/training,
copied article excerpts or NASA endorsement claims. Retain institutional-update,
unknown-access and summary-unavailable labels. Reassess terms if the use changes.

## Manual authority and request admission

Proposed initial authority: one operator in this local checkout, invoked deliberately
by the owner/authorized implementation task. The owner has not committed to being the
ongoing curator; agree a sustainable cadence before promising maintenance. The existing
manual research authorization does not authorize publication or account/service creation.

The proposed coordinator must make **at most one fixed-endpoint request per invocation**,
no retry, at least six hours between admitted attempts and at most four attempts in a
rolling 24-hour window. Count failures and admissions whose process crashes before
requesting. These are conservative application limits, not a NASA quota or guarantee.
Browser visits, builds and review/promotion commands never acquire a request slot.

Persist local admission before handing control to transport. Use the same trusted
single-host/exclusive-lock assumptions as staging, with independent versioned state,
attempt times, last observed clock, bounded Retry-After/backoff and a last-good snapshot
reference. Validate and atomically replace complete state. Refuse network access if
state is missing/corrupt, the clock rolls back, admission cannot be confirmed, or a
lock is held. An ambiguous write counts as potentially admitted and needs reconciliation.
Do not reset a budget on restart, deletion, midnight or a new calendar month.

Bootstrap must account for **six previously recorded manual probe requests**, plus
any other operator activity in the preceding 24 hours. Their timestamps are in the
existing aggregate evidence; they must not silently disappear from a new ledger.
If activity is unknown, use an explicit controlled 24-hour no-request observation
period before bootstrap rather than guessing an empty budget. No automatic wait,
recurring task, budget override or untracked second machine is proposed. A local
ledger cannot enforce a global cap across other hosts; disclose that limitation.

## One-capture operation

1. Check the fixed source, clock, single-operator authority and validated admission
   state. A transport baseline must come from the selected last-good metadata snapshot,
   restored with the existing decoder; never from arbitrary request/body input.
2. Persist admission and verify it before making the one request. Use the existing
   injected transport: credentials omitted, redirects refused, 15-second deadline,
   1 MiB body bound and no per-article request. An ETag/Last-Modified validator can be
   sent only from a validated baseline; the first request uses no guessed validator.
3. On HTTP/parser/timeout failure, retain last-good data and successful timestamps.
   Persist sanitized failure/backoff state, not raw source bodies or transport errors.
   If completion-state persistence fails, leave admission spent and stop. No retry.
4. On a valid 200, keep bounded metadata only; on a valid 304, retain the body-fetch
   and publication timestamps and advance representation check only. Persist/read-validate
   a new immutable last-good snapshot before conditionally selecting it. An interrupted
   selection must be reconciled before another request.
5. Prepare an offline review bundle labeled `local-snapshot`, preserving actual capture
   times and recording operational provenance (fixed endpoint, attempt ID and successful
   outcome in local evidence). The label/digest is not cryptographic proof of NASA origin.
   Keep content under ignored local staging; never copy an invented artifact and
   relabel it to satisfy a real-source step.
6. Produce a review report with exact candidate metadata, rejects/duplicates/omissions,
   source/terms links, check/publication ages and the exact digest. Prefer eligible curated
   duplicates; preserve withdrawals. No unreviewed summary or paywall assumption.
7. Stop with the concrete review artifact. Changing `publishedFeed` from null, importing
   release bytes, commit, push or deployment requires the user's separately authorized
   release scope. Do not ship the mixed uncommitted privacy tree.

The capture can yield zero eligible stories. An empty/expired snapshot is an honest
outcome, not a reason to retry immediately, invent a headline or relax age policy.
Manual release frequency must be practical against the 24-hour freshness window;
otherwise keep curation and defer the feed pilot. Local events and restaurant offers
remain separate human checks, with exact dates, participation and terms.

## Next implementation scope and acceptance

Proposed files: a manual coordinator and focused tests under `lib/discover/feeds/`,
an explicitly invoked command under `scripts/discover/`, one package script if needed,
and this guide. Keep local admission/snapshot storage under ignored `build/discover/`.
Do not add a provider, SDK, database, hosting configuration, active catalog artifact,
auth/store dependency or source-automation approval.

Acceptance uses invented data and mocked transport first:

- Unknown/invalid history, rollback, spent slots and overlapping operators produce zero
  fetch calls. Test six-hour and rolling-day boundaries with an injected clock.
- Persisted admission precedes fetch; crashes and write ambiguity cannot erase a slot.
  No automatic retry after 429/503, timeout, parser failure or failed persistence.
- Successful 200/304 use the existing immutable snapshot and review-bundle boundaries;
  fresh checks do not revive publication-expired stories or editorial withdrawals.
- Partial/orphan/corrupt files and lock loss preserve or fail closed around last-good
  selection. Verify separate-process/local restart behavior and no stdout private data.
- The command has a conspicuous manual acquisition mode and never fetches on module
  import, help, review, prepare, promotion, app load or build. Validate unknown flags and
  unsafe output paths before requesting. No network occurs during synthetic tests.

After those checks, an actual bounded research capture can be considered within the
owner's source-research instruction once history/admission is established. There is no
new requirement to buy a service, create an account or approve a vague deployment.
The review artifact must exist before any publication approval is requested.

## Manual coordinator implementation — 2026-11-12

The [manual capture guide](DISCOVER_MANUAL_CAPTURE.md) records the implemented
coordinator, persistent local request admission, explicit commands and 295 synthetic
Discover test results. Sample capture/repeated-process spacing denial were verified;
no live request or manual ledger was created. Sole-operator control is still an
owner question; observation has not started. Next: bounded interrupted-state
reconciliation, preserving budget/provenance and making no publisher requests.
