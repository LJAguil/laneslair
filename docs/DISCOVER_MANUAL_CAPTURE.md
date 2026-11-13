# Discover manual capture coordinator

Implemented locally, 2026-11-12, following the owner-authorized next task in the
[capture plan](DISCOVER_CAPTURE_PLAN.md). Git HEAD remains `8d4a84d`; existing
uncommitted work is preserved and privacy remains paused. **No live request or
manual ledger was created in this stage.** The app's release selection stays null.

## Commands and authority

```sh
npm run discover:capture -- --help
npm run discover:capture -- sample
npm run discover:capture -- status --manual
```

Help and module import are inert. Sample uses invented metadata, a fixed clock and
mocked transport; it stores a distinctly synthetic snapshot/review bundle under
`build/discover/capture/synthetic/`. It never calls global fetch. Repeating sample
at its fixed clock demonstrates persistent spacing denial, rather than resetting
the ledger. Retained sample artifacts cannot pass the published loader's synthetic
rejection. No sample appears in the default app.

Status reads the manual ledger under the local lock, reporting missing/present state;
it can create empty staging directories but never initializes observation or fetches.
Malformed state fails closed. Neither status nor help accepts a URL, clock override,
output directory, recovery override or credential input.

Once sole-operator control of feed requests is established, the explicit observation
command is:

```sh
npm run discover:capture -- observe --manual --single-operator
```

It exclusively creates manual state, seeds the six recorded probe attempts and
starts a full **24-hour controlled observation**. Reinitialization is refused.
`--single-operator` asserts the operational condition, not a technical guarantee
against other machines or tools. No automatic wait, recurring task or capture follows.
Do not run it unless other NASA feed-request paths are paused for that period.

After the full period, a deliberate invocation can make one request:

```sh
npm run discover:capture -- capture --manual --single-operator
```

The manual command uses the real clock and exposes no clock override. It has no
global-fetch fallback in the library; only this explicit command supplies network
transport. Unknown/duplicate/incomplete flags fail before execution. Actual research
acquisition is within the owner's source-research scope once history is established;
it does not authorize app artifact selection or publication.

## Request budget and persistence

`capture.ts` validates a versioned fixed-source state: input kind, initialization and
last observed instants, monotonic revision, sorted unique attempts, pending attempt,
backoff, sanitized outcome and last-good snapshot/review references. Bounds include
32 KiB state and 64 attempts. Generated attempt IDs must agree with revision history.
Timestamps require canonical valid UTC instants. Unknown fields, future state or
rolled-back evaluation clocks fail validation.

The policy allows at most **four admitted attempts in a rolling 24 hours** and at
least **six hours between admissions**. The exact 24-hour-old boundary leaves the
rolling window; the exact six-hour boundary is eligible. Failures and uncertain
admissions consume slots. The prior probe report times are rounded up conservatively
to milliseconds; exact individual request times are not invented. Older attempts
can be pruned only outside the rolling window. Historical aggregate evidence remains
in `docs/discover/` and the known-probe seed is explicit in code.

Under one local lock, the coordinator validates history, current budget, prior
snapshot/hash/review and input kind. It writes admission and reads back exact bytes
**before** delegating to transport. A process paused more than 60 seconds before
delegation leaves its slot pending without requesting. The transport makes one
fixed-endpoint request, no retry, with existing bounds/credential omission/redirect
refusal. Abort is checked after asynchronous lock validation so a delayed callback
cannot start a request after the transport deadline.

Successful 200/304 outcomes persist immutable snapshot and review artifacts, validate
readback, then select both references by complete ledger replacement. A 304 keeps
body-fetch/publication times unchanged. Reviews preserve unavailable summary, unknown
article access, institutional-update type and actual source metadata. A failed request
keeps last-good data and successful timestamps, records no raw exception/body, and
applies bounded Retry-After or a six-hour fallback. No retry is scheduled.

## Failure, interruption and recovery limits

`capture-store.ts` uses fixed separate manual/synthetic paths under ignored
`build/discover/capture/`, an exclusive tokenized lock, bounded regular-file reads,
immutable digest filenames, compare-before-commit state writes, flush/readback and
same-directory rename. It rechecks lock ownership before request delegation and
state/artifact writes. A replacement lock is preserved rather than unlinked.
The shared review staging file helpers are now exported without changing behavior.

- Missing/corrupt state, unknown history/control, incomplete observation, invalid clock,
  held/lost lock or spent budget means no publisher request.
- Admission/write ambiguity means stop and inspect state. A pending attempt blocks
  all future capture, even after its rolling window passes; it never expires silently.
- Failure before completion selection leaves the previous last-good reference and
  a spent pending admission. Partial/orphan files are not automatically selected.
- A failure after a rename or cleanup can mean a state update actually completed.
  Inspect status before another invocation; do not erase state or guess it failed.
- There is deliberately **no automatic pending-clear, lock-break or budget-reset
  command**. Explicit interrupted-state reconciliation still needs a bounded design
  before use after a crash. Normal successful/failed invocations clear their own pending
  marker while preserving the spent attempt.

This is a trusted single-host local workflow, not distributed coordination, authenticated
storage, malicious-local-process protection or power-loss durability certification.
Deleted/rolled-back files cannot prove their own loss; manual bootstrap always requires
the controlled observation again and cannot recover an old last-good pointer by guessing.
Operational provenance is the controlled capture path and ledger attempt reference;
`local-snapshot` and colocated hashes alone do not prove NASA origin.

## Verification

- **295 Discover tests passed** across 11 suites: 243 existing plus 52 coordinator/
  command cases. Only invented XML/metadata and mocked requests are used.
- Cases include observation/spacing/day boundaries, six known probes, zero-fetch
  denials, admission-before-fetch, ambiguous writes, corrupt readback/state/artifacts,
  incomplete publication, last-good preservation, 429/503 backoff, network/parser
  failure, deadline/late-delegation behavior, 304 restoration and publication expiry.
- Temporary filesystem tests cover contention, orphan/replaced locks, independent
  namespaces and restored snapshots across fresh adapters/module instances. Cleanup
  is restricted to the exact test-created temporary root.
- Import/help and 11 invalid/incomplete CLI argument cases made zero fetch calls.
  A real sample-command process produced one synthetic review bundle; a second
  process returned `attempt-spacing` with no ledger reset.
- Project TypeScript, changed-file ESLint and whitespace checks passed. Installed
  Next.js cache documentation was read; no new Next runtime integration was added.
- No authenticated/private-data tests, browser or build rerun was needed for this
  disconnected manual tooling. Prior isolated build/mobile results stand within
  their limits; full-app and physical-iPhone acceptance remain open.

## Overview & Roadmap handoff

**MVP/sources:** retain manually checked nearby outings, chain deals and broader news.
NASA is an optional metadata-only institutional science supplement; no real source
artifact is selected, and source automation remains `not-approved`.

**Verified:** synthetic coordination, persisted sample budget, failure handling and
conditional baseline restoration. **Uncertain:** actual sole-operator control,
capture provenance until a real run, ongoing curator/cadence, hosting quotas and
broader release/device gates. No publisher numeric quota or SLA is asserted.

**Free dependencies:** no new package, service, key, account, remote SQL or hosting
configuration. Node built-ins and the existing TypeScript dev dependency compile
manual modules under ignored `build/discover-offline-capture/`. No paid fallback.

**Affected files:** new coordinator, local adapter, two synthetic test files and manual
capture script; exports of existing file helpers; one package script and Discover
documentation. Existing package/dependency edits were preserved. No app source,
release selection, shared auth/store/journal/privacy files or source approval changed.
Nothing committed, pushed or deployed.

**Decision needed for a real pilot:** confirm this checkout is the sole NASA feed-request
operator for a controlled 24-hour observation period, including any external tools.
The question was sent to the owner; no answer was assumed and observation was not
started. Ongoing curation ownership remains a separate maintenance choice.

**Next bounded task:** add explicit interrupted-state reconciliation using expected
ledger digest/revision, preserving spent attempts, last-good provenance and replacement
locks. Test before/after-commit ambiguity and process restart without any network.
Once control is confirmed, observation can start as a separate explicit local action;
one actual capture can follow eligibility, stopping at a concrete review artifact.
App artifact selection and all publication still require separate authorization.

## Observation started — 2026-11-12

The owner clarified that they have not set up another downloader for this project.
That establishes the initial operating assumption; ordinary NASA browsing and unrelated
news apps are outside this project downloader's budget. No ongoing curator role was
assigned. The 24-hour observation is this application's conservative bootstrap policy,
not a NASA-published requirement.

The explicit local observation command succeeded at `2026-11-12T09:18:22.443Z`
(November 12, 3:18 AM America/Chicago). It seeded all six historical probes and made
zero feed requests. Earliest manual capture is `2026-11-13T09:18:22.443Z`
(November 13, 3:18 AM America/Chicago), subject to valid state, clock and operator
conditions. State is Git-ignored under `build/discover/capture/manual/`.
No timer process, scheduled task or automatic future download was created.

This supersedes the unanswered-question/no-manual-ledger statements above, which
describe the implementation stage. Interrupted-state reconciliation remains the next
independent engineering task; publication and the empty app selection are unchanged.

## First capture and recovery completed — 2026-11-13

The owner explicitly requested the manual capture after eligibility. One request
produced 10 accepted metadata items and a concrete review bundle; no retries or
publication. [Capture/recovery evidence](DISCOVER_CAPTURE_RECOVERY.md) records exact
digests, actual timestamps, the mixed institutional/image-article source limitation
and new explicit pending reconciliation. All 322 Discover tests pass. The actual
ledger completed successfully and needed no reconciliation; app selection stays null.
This supersedes earlier no-live-request and unimplemented-recovery statements within
their dated implementation sections. No further wait is required to review the bundle.
