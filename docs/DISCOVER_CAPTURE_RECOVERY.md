# Discover: first manual capture and interruption recovery

Completed locally on 2026-11-13 under the owner's instruction to make the manual
capture and continue work. Local HEAD remains `8d4a84d`. Existing uncommitted work
is preserved; privacy remains paused. No app artifact selection, commit, push,
deployment, account, service or database change occurred.

## Actual capture and review

The validated manual ledger showed completed observation, no pending attempt and
no unexpired prior probe in its rolling budget. The owner had confirmed no other
project downloader was set up. One explicitly invoked capture ran outside the
restricted network sandbox; the coordinator admitted exactly one transport call
and made no retry or per-article request.

| Evidence | Result |
| --- | --- |
| Attempt | `capture-2`, admitted `2026-11-13T19:30:14.630Z` |
| Feed | `https://www.nasa.gov/news-release/feed/` |
| Successful body/check time | `2026-11-13T19:30:14.739Z` — November 13, 1:30 PM Central |
| Outcome | Updated representation; transport's HTTP-200 path |
| Input / accepted | 10 / 10 |
| Rejected / duplicates / omitted | 0 / 0 / 0 |
| Conditional validators | ETag and Last-Modified present; no baseline was guessed for this first capture |
| Offline catalog review | 10 main-eligible feed items at review time; zero detected overlap with the existing curated catalog |
| Completion | Ledger revision 3, pending null, successful outcome and both immutable artifact references selected locally |

Aggregate evidence is in [the capture report](discover/NASA_CAPTURE_2026-11-13.json).
Raw metadata/review artifacts remain Git-ignored under `build/discover/capture/manual/`:

- Snapshot: `75155e30fce7408baf2ac3707d278c1335727932d1b2b1e744d78793b6a9383d`.
- Exact review bundle: `94bd1b2083a41695fe9b33f7cd4779647d13c0979147fb4acf31bd1c02f06bfb`.
- Human-readable review: `review-2026-11-13.md`, with exact publisher headlines, dates,
  optional authors and direct links; summaries/access remain unavailable/unknown.

The endpoint returned a broader institutional mix: **five URLs contain
`/image-article/`**. Its directory listing name does not guarantee release-only
content. No article pages were fetched to classify them further. Continue the
institutional-update label, not independent reporting or a claim that every item
is a news release. No article body, image or logo was retained; no AI summary made.

Eligibility is dated evidence. Without successful revalidation, the check becomes
stale at `2026-11-14T19:30:14.739Z` (November 14, 1:30 PM Central), regardless of
release time. The earliest next admission under the six-hour spacing rule is
`2026-11-14T01:30:14.630Z` (November 13, 7:30 PM Central), subject to valid state,
budget and operator conditions. **No future request was scheduled.** The app's
release selection stays null and existing curated values/check times are unchanged.

## Explicit interruption recovery

`capture-recovery.ts` adds a local-only operation that abandons an uncertain pending
outcome without claiming whether a request happened. It requires exact current ledger
SHA-256, revision and pending attempt ID, plus input-kind and single-operator checks.
The ledger must be valid and the local lock must be acquired normally.

The status command now prints the state digest. The explicit command is:

```sh
npm run discover:capture -- status --manual
npm run discover:capture -- reconcile --manual --single-operator --expected-state <reviewed-state-sha256> --revision <reviewed-revision> --pending <reviewed-capture-id>
```

Reconciliation performs zero network requests. It validates the existing selected
snapshot/review pair, preserves all attempts, initialization time and last-good
references, clears only the matched pending marker, increments revision, and records
`outcome: interrupted`. It imposes a fresh six-hour hold, preserving any longer
publisher backoff. It does not refund an attempt, renew a feed check, discover/adopt
orphan files, repair corrupt state or break an orphan/replacement lock.

Stale operands, missing state, no pending attempt, invalid clocks, kind mismatch,
corrupt last-good data or lock loss refuse changes. Before/after-commit uncertainty
requires status inspection; retrying old operands cannot clear a newer state. A
completed successful capture is left untouched. The actual manual ledger had no
pending attempt, so **recovery was not applied to it**.

The existing trusted single-host assumptions remain: this is not a distributed lock,
malicious-local-process defense, authenticated provenance or power-loss durability
guarantee. A shared helper now restores only ledger-selected baselines for both normal
capture and recovery, retaining exact snapshot/review consistency checks.

## Verification and scope

- **322 Discover tests passed** across 12 suites, including 27 new recovery/CLI cases.
  All automated requests used invented data and injected mocks; only the one manual
  capture above contacted NASA.
- New coverage includes operand conflicts, spent-budget preservation, longer backoff,
  no orphan adoption, corrupt last-good data, lock loss, before/after-commit ambiguity,
  completed-outcome preservation and recovery across fresh filesystem/module instances.
- Project TypeScript, changed-file ESLint and whitespace checks passed.
- Offline validation used the actual immutable bundle with the existing loader/catalog
  policy; no second feed request, article lookup or app selection was needed.
- No full-app build, browser/private-data test or phone acceptance rerun was needed for
  this disconnected recovery tooling. Earlier isolated build/mobile evidence retains
  its limits; full authenticated build and physical iPhone acceptance remain open.

Affected files: `capture.ts` (shared baseline validation and interrupted outcome), new
`capture-recovery.ts` and synthetic tests, CLI/status/recovery argument validation,
Discover documentation and aggregate capture evidence. No new package, account,
subscription, key, database, hosting configuration or source-automation approval.
Shared auth/store/journal/privacy code and all prior edits remain untouched.

## Overview & Roadmap handoff

**Recommended MVP:** curate nearby outings and actionable chain offers with full terms,
plus a broad curated news mix. This capture can supplement science discovery but its
mixed institutional/photo-oriented material is not comprehensive news reporting.

**Verified:** one bounded actual capture, validated local review artifacts and the
synthetic recovery behavior above. **Uncertain:** ongoing curation/cadence, article
access/content classifications beyond feed metadata, long-term feed behavior,
actual hosting quotas, complete app build and physical-phone release acceptance.

**Free limits/dependencies:** existing Node/TypeScript/XML tooling only, one manual
request, four-per-rolling-day/six-hour local policy intact. No paid or automatic
fallback. Single-operator control remains an operating assumption, not global enforcement.

**Next bounded task:** prepare a concrete local catalog-preview candidate using the
reviewed bundle, and refresh a small set of nearby events and chain offers from their
official dated sources. Preserve the actual feed check/publication times and explicit
unknown terms. Report exact proposed source/artifact changes and overlap before
editing; keep publication separate and exclude paused work from any release scope.
The captured bundle is already reviewable; another infrastructure phase or waiting
period is not needed merely to inspect it.

## Local candidate prepared — 2026-11-13

The [candidate preview](DISCOVER_CANDIDATE_PREVIEW.md) combines the exact captured
bundle with a separate source-checked outings/offers overlay. It records conflicting
venue and incomplete offer evidence rather than inventing confirmation. All 327
Discover tests and narrow-browser checks pass. The baseline catalog/release selection
remain unchanged, and no additional NASA request or publication occurred.
