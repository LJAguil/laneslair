# Discover: free publication and refresh proposal

Researched 2026-11-12 (America/Chicago), following the owner-authorized next task
from [snapshot restoration](DISCOVER_SNAPSHOT_RESTORATION.md). **Proposal only.**
Local Git HEAD is `8d4a84d`; production state, account plan and remaining quotas
were not inspected. Existing uncommitted work is preserved; privacy remains paused.
No code, configuration, source automation, remote storage or production change is
part of this stage. This document supersedes earlier generic refresh suggestions.

## Recommended first release path

Use a **reviewed metadata snapshot bundled with an explicitly approved release**.
Keep events and chain offers manually checked against organizers/restaurant terms.
Keep curated local/Louisiana, technology, national/world and discovery news; NASA
is a supplementary institutional science source. Do not promise an automatically
maintained feed or imply that NASA satisfies the full news-interest mix.

This path adds no storage service, token, scheduler or paid exposure. Its real cost
is human checking and separately authorized releases. With the existing 24-hour
feed freshness policy, a missed refresh makes stories stale; a weekly publication
cadence cannot provide continuously current news. Do not silently lengthen freshness
or stamp publication/release time onto transport evidence to disguise this limitation.
If frequent manual publication is too much work, keep curated news and defer the
NASA pilot until the shared-storage stage is explicitly selected.

| Option | What it offers | Limit or maintenance cost | Recommendation |
| --- | --- | --- | --- |
| Reviewed snapshot bundled with app | Reviewed version, no runtime publisher/storage requests; survives function cold starts | Every content update needs a reviewed release; data ages between updates | First bounded implementation |
| Next in-memory cache or function scratch file | Convenient temporary optimization | No shared durable request ledger or cross-deployment baseline | Insufficient as refresh authority |
| Vercel Blob plus Schedules beta | Shared metadata, conditional writes, potential updates without redeployment | Store/token/configuration, concurrency and failure design, quota monitoring, beta dependency | Plausible later free pilot; not enabled |
| Legacy Vercel Cron plus Blob | Daily shared refresh | Timing drift/missed runs conflict with a strict 24-hour current window | Inferior to Schedules for this purpose |

## Official limits checked

The following are public documentation findings, **not verification of this account**.
Recheck them when enabling any service. No dashboard, credentials or billing values
were read, and no provider connection is required to complete the offline next task.

- Hobby is intended for personal, non-commercial projects. Its documented included
  allowance includes 100 GB fast data transfer, 1 million CDN requests, 1 million
  function invocations and 4 active CPU-hours. Exceeding Hobby limits generally
  pauses the affected feature; shared app usage matters. No upgrade/trial is proposed.
  [Hobby plan](https://vercel.com/docs/plans/hobby)
- Blob lists Hobby allowances of 1 GB storage, 10,000 simple operations, 2,000 advanced
  operations and 10 GB Blob transfer. Writes/copies/listing consume advanced operations;
  cache misses and metadata reads can consume simple operations. CDN/origin usage
  also applies. On Hobby, exceeding Blob limits blocks access without additional
  usage charges; Pro can incur on-demand charges. Hence any later adoption requires
  verified Hobby status and remaining allowances, with no upgrade or paid fallback.
  [Blob usage and pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing)
- Blob supports ETag-based `ifMatch` conditional writes. Overwrites can remain cached
  for at least the minimum configurable 60-second propagation window. This supports
  optimistic concurrency but does not by itself establish a complete refresh lock,
  safe initial creation, fencing or a strongly consistent read path.
  [Blob conditional writes and caching](https://vercel.com/docs/vercel-blob)
- The newer **Schedules beta** documents Hobby intervals as frequent as 15 minutes,
  a 15-minute jitter window and 5,000 runs per team per period, including manual runs.
  Exceeding creation/run limits blocks work until the next period; targets consume
  their own resources. Beta limits may change. Hourly scheduling is therefore a
  possible free option; an old blanket assertion that Hobby only supports daily
  scheduling would be incorrect for this newer product.
  [Schedules limits](https://vercel.com/docs/schedules/limits)
- **Legacy Cron** remains daily-only on Hobby with imprecise timing. Its delivery is
  best effort, can be missed or duplicated, and failed jobs are not automatically
  retried. Do not apply its limits to Schedules or infer exact-once execution.
  [Cron limits](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing),
  [Cron delivery](https://vercel.com/docs/schedules/cron-jobs/manage-cron-jobs)
- Vercel Functions have a read-only filesystem plus writable `/tmp` scratch space;
  that is not a chosen shared durable store.
  [Function filesystem](https://vercel.com/docs/functions/runtimes#file-system-support)

Installed Next.js 16.4.1 `use-cache.md`, runtime-caching section, also says the default
handler is in memory, serverless entries may not persist, and cache keys change across
deployments. A cached function is not a global publisher-request budget. This review
does not establish guarantees for a different provider cache handler or fetch cache.

## Concrete reviewed-snapshot workflow

1. **Acquire separately:** an explicitly authorized manual NASA request uses the fixed,
   documented endpoint and bounded importer. No per-article requests, user context,
   cookies or app credentials. A local XML file alone does not prove when a body was
   fetched; importing it must not manufacture recent transport evidence. Offline
   development continues with invented snapshots.
2. **Prepare locally:** serialize an importer/restore capability, validate a round trip,
   and create a review artifact containing snapshot bytes, their SHA-256 digest, schema
   version, preparation time and counts. Keep this under ignored `build/discover/`.
   Preparation time is distinct from body-fetch, feed-check and publication times.
   A digest detects changed bytes relative to a trusted expected digest; it is not
   source authentication, a signature or editorial verification.
3. **Review exact bytes:** show bounded headlines, publisher, direct links, publication
   and check times, and rejections/duplicates separately. Preserve unknown access and
   unavailable summaries. Record a reviewed digest tied to the artifact. This is
   selection/release review, not a claim that each article was independently verified.
   Events/deals need their own dated editorial checks and complete validity terms.
4. **Promote explicitly:** a separate local promotion requires the expected digest and
   fully validates again. Write a new immutable artifact with exclusive creation;
   never overwrite the active version. Verify/read back before selecting it. A failed
   write or review mismatch leaves the old selection intact. No executable source is
   generated from publisher text; metadata stays inert JSON/text.
5. **Release separately:** propose the exact reviewed artifact and loader changes for
   approval. No script commits, pushes, deploys or edits an active manifest as a side
   effect of preparation. A release carries a complete selected version; do not claim
   all open browser sessions switch at the same instant. Runtime validation failure
   falls back to existing curated content, without fetching or accepting partial data.

**Trust/provenance:** publisher TLS acquisition plus the controlled local/release path
provide operational provenance. Neither the restore decoder nor a colocated digest
prevents malicious replacement. Only reviewed release artifacts enter app input;
do not turn uploads or request bodies into feed baselines. Keep metadata only, with
source attribution and links. Continue the earlier source/terms limitations in
[the NASA assessment](DISCOVER_FEED_PROPOSAL.md); no new reuse rights are inferred.

**Rollback and last-good behavior:** a reviewed older release may carry older data.
Restore its actual timestamps and let it become stale/expired; never re-date it.
Compare against the locally selected revision/digest to catch accidental downgrade
during promotion. Lost local state requires an explicit selection review, not an
assumption of monotonic history. No browser-global anti-rollback guarantee is offered.
Malformed/incomplete artifacts do not replace last-good data. Withdrawal and curated
duplicate rules still apply. UTC instants drive age; America/Chicago drives display.

**Refresh admission:** no reader/build/render invokes the publisher. One named manual
operator is the initial authority. Future manual acquisition should persist admission
before requesting, cap attempts including failures, and respect Retry-After with no
immediate retry. Proposed pilot ceiling: four attempts per rolling 24 hours, at least
six hours apart. This is an application restraint, not a NASA-published quota. Without
a durable admission record, refuse a conditional refresh rather than reset its budget.
There is no such acquisition runner yet; separate terminals/machines cannot currently
claim enforcement of a shared cap.

## Later shared-storage design, conditional recommendation

If manual publication proves impractical, evaluate one private Blob store and an hourly
Schedules trigger with the same conservative four-attempt/six-hour policy. Readers
must never trigger NASA fetches. No new service may be enabled until actual free-plan
eligibility and remaining quotas are checked in a separately authorized task.

The refresh record would need a version/fencing token, rolling attempt timestamps,
`nextAllowedAt`, bounded backoff, lease expiry and the selected immutable snapshot's
identity/digest. Before any publisher request, acquire admission with a conditional
write; count admission even if the worker crashes before requesting. Lease loss,
uncertain write outcome, missing/corrupt state or unavailable storage means **no fetch**.
There is no automatic reset on a cold start, redeploy, month boundary or missing key.
Initial creation and recovery require a reviewed bootstrap. A fencing token must also
stop an expired worker from publishing over a newer winner.

After a valid 200/304, write/read-validate an immutable snapshot, then conditionally
advance the selected pointer and complete the ledger. Admission and completion cannot
be treated as an ordinary blind overwrite. Failed publication preserves the old
pointer; orphaned artifacts can be pruned later. Partial/ambiguous writes require
reconciliation, not a second publisher request. Failure/backoff records never advance
successful check times. Enforce writer identity and production-only triggering;
previews/development stay disconnected. Scheduler duplication and jitter must not
bypass admission. Blob CDN-cached reads cannot be assumed suitable for locking;
prove conditional-write/create/read semantics in isolated tests before adoption.

A **calculated illustration**, not a quota guarantee: 31 days of hourly triggers gives
744 runs; four admitted attempts/day gives at most 124 attempts. Three successful
advanced writes per attempt (admission, snapshot, selection/completion) gives 372 writes.
Conflicts, retries, recovery, monitoring and existing app usage add overhead. Eight
256 KiB snapshots occupy about 2 MiB before ledger/metadata. At 100 uncached snapshot
reads/day, body transfer alone is about 0.813 GB/month. This is not a traffic cap;
reads, function delivery and abuse can exhaust shared allowances. Stop at limits,
serve available curated/last-good data with honest age labels, and never upgrade.
Storage outage can remove runtime last-good access too; retain a bundled fallback.

This path also requires secret provisioning and a new SDK/configuration review.
None is performed here. No database is necessary for the recommended first path;
any later database proposal must follow its skill/schema conventions without remote SQL.

## Stages, affected files and acceptance

**A — Next bounded task: offline review bundle preparation/promotion.** Add
`lib/discover/feeds/review-bundle.ts` and synthetic tests; a manual command under
`scripts/discover/` may prepare/promote only explicitly supplied local artifacts to
ignored staging output. Extend package scripts only if a command is delivered.
Reuse snapshot validation/serialization; add no service, dependency, endpoint or live
fetch. Test digest mismatch, altered bytes, invalid clocks/schema, stale preservation,
exclusive creation/write failure, partial artifacts, rollback selection and unchanged
last-good selection. Printed content must be limited to this explicitly supplied public
metadata. No production artifact or active app import changes in this stage.

**B — Reviewed bundled loader and mobile acceptance.** Propose
`lib/discover/feeds/published.ts`, a reviewed artifact location, Discover route/view
input wiring and focused tests. Keep parser/transport out of client bundles; pass
validated plain items through the existing view. Invalid/missing feed content falls
back to curation, with a visible feed availability message. Verify no publisher request
on load/build, stale/expiry and withdrawal rules, duplicate selection, direct links and
320/390px layout. Then resolve the known full-build and physical-phone gates.

**C — Optional shared refresh.** Only after a selected storage design and authorization:
propose a server-only adapter, admission/refresh coordinator, target handler and minimal
hosting configuration. Require contention/crash/recovery tests, proof of free plan and
remaining allowance, a shutdown procedure, synthetic deployment acceptance and an exact
approved release scope. This is not approval to create a store, token or schedule.

Paused-work overlaps: the recommended A stage touches only new Discover modules,
scripts/tests and documentation. B would touch the existing Discover route/view and
possibly package scripts; C could touch hosting config and package/lock files. None
requires shared auth/store/journal/privacy edits. Existing package/config changes
must be preserved and distinguished before any release. Do not publish the mixed tree.

## Overview & Roadmap handoff

- **MVP/source recommendation:** reviewed bundled public metadata first; manual local
  events/deals and broader curated news remain essential. NASA covers a narrow slice.
- **Verified:** local baseline, existing offline contracts, and the cited current public
  provider documentation. **Uncertain:** actual plan/quota, operational storage
  guarantees, maintenance ownership, long-term source behavior and device/build gates.
- **Free dependencies:** no new package/service/account. Blob/Schedules are conditional
  alternatives with finite shared limits; no automatic paid fallback is acceptable.
- **Work this stage:** this proposal and a link from the restoration handoff only.
  No tests rerun for documentation-only changes; earlier 191-test results remain
  historical evidence, not production acceptance.
- **Decisions before live use:** name the curator/operator, choose a sustainable cadence,
  and accept manual publication or select the shared-refresh design. A named cadence
  is not an automation request. No decision blocks the next synthetic offline task.
- **Next task:** stage A's offline review bundle, with explicit local outputs and no
  live acquisition, active-catalog replacement, commit, push or deployment.

## Stage A implementation update — 2026-11-12

[Offline review bundles](DISCOVER_REVIEW_BUNDLES.md) now implement explicit preparation,
exact-byte digest review, staging-only promotion, monotonic selection checks and local
filesystem failure handling. 229 Discover tests pass. Synthetic sample preparation and
promotion were exercised only under ignored staging; no active app content or live
source was connected. Next: validated bundled loader with curated fallback and an
explicit synthetic-content rejection, following the bounded handoff in that guide.
