# Discover: entertainment news, title saving and food offers

Local implementation on `9c45f86`. This stage is not committed or deployed.
Owner preferences: all gaming platforms and a broad movie/TV/anime genre mix.
No assumptions about owned hardware, subscriptions or viewing history are made.

## Product behavior

- News keeps the existing scroll/pagination and adds Games, Movies, TV and Anime
  category shortcuts plus four optional interests. All News restores the broader
  local, science, technology, national/world mix. No preferences are inferred from
  journals, habits or private app activity; selections remain visit-only.
- Seven checked official news/schedule/preview pages expose **13 explicit work
  titles**: eight games, two movies and three shows (one an anime series).
  Upcoming windows, recent launches and subscription-catalog additions stay
  distinct. Single-title stories show their add action directly; multi-title
  roundups use an expandable list to keep the phone feed compact.
- **Add to Entertainment → Save to Planned** works inside Discover. Opening or
  bookmarking a story alone writes nothing. The confirmation shows title, media,
  source link, platform/service and source-reported release note. No purchase,
  subscription, ownership claim, viewing time or progress is assumed.
- Anime series use existing `show` storage with an `anime` tag; anime films can
  use `movie` plus that tag. Titles are curated work names, not guessed headline
  fragments. The existing Entertainment schema, repository and library UI are
  reused without migration or new dependencies.
- Before a save, the controller loads only Entertainment through its existing
  owner-scoped repository and checks title/media duplicates (case, Unicode and
  whitespace normalized). Existing status/notes/progress, including archived
  entries, are preserved. This is a convenience check, not a database uniqueness
  guarantee across concurrent devices or alternate/localized title spellings.
- A UUID is retained per title/media for this visit. Failed/uncertain writes can
  be retried with the same identity; repeated save clicks are ignored. Reopening
  the title rechecks the library. Account change/unmount fences late responses,
  clears the draft and requires reload. Raw provider errors and private library
  records are never written into public news data or logs.
- Confirmed saves show **Open Entertainment**. Failed duplicate checks block
  saving, input remains available on failure, and success is shown only after a
  verified returned row. Existing account verification and RLS still govern writes.

## Reviewed content and source limits

| Source | Current checked coverage | Limits |
| --- | --- | --- |
| [Nintendo News](https://www.nintendo.com/us/whatsnew/) | Upcoming Xenoblade Chronicles 3 Switch 2 edition, December 3 | Platform-holder announcement, no independent review or ownership inference |
| [PlayStation Blog](https://blog.playstation.com/) | Hounded's 2027 window, GTA VI launch news, December PS Plus additions | Catalog claim periods are not game launch dates; membership may be needed |
| [Xbox Wire](https://news.xbox.com/en-us/2026/11/20/next-week-on-xbox-new-games-for-november-23-to-27/) | Newly listed puzzle/automation and couch multiplayer games | Device support and dates need store confirmation; no price guarantees |
| [Netflix Tudum](https://www.netflix.com/tudum/articles/new-on-netflix) | The Mosquito Bowl, The Hunting Wives, Fool Night and upcoming Gordon | October 31 publication date is preserved; schedule was checked November 26. Region/subscription limits apply; monthly URL changes require rechecking |
| [Explore Disney+](https://www.disneyplus.com/explore/articles/avengers-doomsday) | Avengers: Doomsday's December 18 theatrical announcement | November 24 is a revision date, not a verified original publication date. Publication is shown unknown; Disney+ availability date is unknown |

These are manually checked institutional announcements, correctly labeled as
such, with short original summaries and direct article links. No images, trailers,
full synopses/articles, accounts or paid APIs are imported. Subscription RSS/API
reuse rights were not established for these sources, so none joins automatic
acquisition. Crunchyroll pages were unreadable and were not bypassed; an indexed
snippet alone was not promoted into verified anime news. The current three-source
daily operator and its activation switches remain unchanged.

The first six entertainment pages and food offers retain their own check at
`2026-11-26T21:47:18Z`. The Disney page's separate later check is
`2026-11-26T21:56:57Z`. Existing catalog records retain their earlier evidence.
Checked dates do not become publication dates or guarantees that a release won't
change. Entertainment titles on stale/review-only stories cannot be added directly
until rechecked. This initial slice is useful coverage, not a comprehensive release
calendar or personalized recommender.

## Food offer work

Food adds a simple **All / App offers / No app needed** selector. Three checked
national offers remain separate from confirmed nearby deals; nearby participation,
stock and individual account eligibility are not established:

- [Wendy's physical 2027 Frosty Key Tag](https://www.wendys.com/adoption/frosty-key-tags):
  $3 tag purchase window November 16–January 31, while supplies last, with eligible
  in-restaurant purchase required for redemption through December 31, 2027. The
  card covers the physical tag, which needs no app/account; digital terms differ.
  Current offer-specific November 16 start is used and conflicting older brand
  page text is disclosed. Limits/upgraded-product exclusions are shown.
- [McDonald's official deals](https://www.mcdonalds.com/us/en-us/deals.html): medium
  fries with $1 pre-tax qualifying purchase and a $2 eligible breakfast-sandwich
  app offer. Both require Rewards opt-in, are limited weekly through December 31,
  exclude delivery and depend on restaurant/account eligibility. The current fries
  terms do **not** restrict it to Fridays.
- McDonald's original start dates are unpublished. Their windows explicitly mean
  **observed active November 26 through the stated end**, with a visible explanation;
  November 26 is not presented as the campaign launch. The model validates this
  distinction. Expiration/staleness still takes precedence over placement.
- Wendy's Fryday tile advertises a $5 qualifying purchase but lacks a published
  exact end and complete restrictions. It remains a review-only lead, with no
  active window or confirmed nearby availability. Burger King/Popeyes terms pages
  were not readable; no offer was fabricated from them or from a food holiday.

No order was placed, restaurant contacted, app/account accessed, subscription
created, location tracked or offer redeemed. Ongoing food automation still needs
offer-specific official data; national publicity cannot establish local availability.
The food result count reports confirmed nearby and national offers separately;
a national list no longer sits below a misleading empty-results panel.

## Implementation and verification

Affected code: Discover route, view, types, catalog validation, source registry,
candidate selection; new entertainment import controller, dialog bridge, dated
content and two test files; one existing food-placement assertion and the public
preview compiler's explicit dated-module list. No existing Entertainment/auth/global-store/privacy
implementation, schema, package, scheduler or environment settings changed.
The Discover route obtains a verified user ID within its streamed boundary and
keys the bridge by owner. The public-content-only screen stays usable without an
auth client; import actions are disabled when no owner callback exists.
The owner-only bridge is lazy-loaded; the public preview does not load it.

Relevant installed Next.js server/client and streaming conventions were read before
coding. The Supabase skill/current client guidance and existing Entertainment
schema/repository/account conventions were reviewed. Verification uses a clean
archive of `9c45f86` with only this stage's Discover edits; paused work is excluded.
All Entertainment tests use a mocked repository; no remote SQL or live personal
records were accessed. **798 tests across 92 suites**, full lint, TypeScript and
the complete production build passed against locked Next.js 16.4.6. Build-only public settings are
invented placeholders, not credentials. Authenticated phone behavior and actual
save/load round trips remain acceptance work, especially if the pre-existing
Entertainment table has not yet been set up in the target environment.
The public preview started with the current catalog and no acquisition; its local
HTTP probe was blocked/timed out and the temporary processes were stopped.
No browser or phone visual pass is claimed. The production build and static
rendering tests cover the final UI/code, not an authenticated save.

## Handoff and next bounded work

1. Review/publish this scoped release only after separate commit/deploy authorization.
2. Check on the signed-in phone: each news shortcut, multi-title expansion, correct
   planned saves for games/movies/shows/anime, duplicate/archived behavior, failure
   and retry, account switch, and app/no-app food filters. No personal records need
   to be shared back into this chat.
3. Finish the already-approved original three-source hosted refresh pilot when
   browser administration is available. New entertainment sources stay curated
   until their access/update terms and bounded adapters are reviewed.
4. Expand current releases by platform and genre based on owner feedback, keeping
   regional/release uncertainty explicit. Verify nearby food participation only
   with actual location-level evidence. Enable recurring ingestion separately;
   this implementation does not activate automatic refreshes or a real AI service.
