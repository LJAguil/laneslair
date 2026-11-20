# Discover outing refresh and broader news — November 19, 2026

Local work after deployed commit `144354d`, requested by the owner. No commit,
push, deployment, database operation, new account or paid dependency in this slice.
Privacy/auth/store/journal changes remain paused, preserved and outside this scope.

## Content checked

New detail pages were inspected by `2026-11-20T04:30:54Z` (November 19, 10:30 PM
Central). This is an editorial inspection clock, not a publisher update time.
The prior selection and every older check clock remain intact.

Six new dated outing listings:

| Outing | America/Chicago dates and hours | Source / limits |
| --- | --- | --- |
| Bingo at The Local, Ruston | Nov 20, 6:30–8:30 PM | [Tourism detail](https://www.rustonlincoln.com/events/the-local-bingo-night-3/). Game/admission charges and age requirements unstated. |
| Tammy Martin Band, Sundown Tavern, Ruston | Nov 20, 9 PM | [Tourism detail](https://www.rustonlincoln.com/events/sundown-live-music-tammy-martin-band/). End, cover and age requirements unknown; start-only listing expires at its start under the existing conservative policy. |
| Ruston Farmers Market | Nov 21, 9 AM–1 PM | [Dated listing](https://www.rustonlincoln.com/events/ruston-farmers-market1-92/); [organizer](https://www.rustonfarmersmarket.org/) supports hours/address. Admission price unstated; purchases separate. No future occurrences generated. |
| Stone Letter, El Paso Mexican Grill, Monroe | Nov 20, 6–9 PM | [Official tourism detail](https://www.monroe-westmonroe.org/events/stone-letter-at-el-paso/). Admission/purchase requirements unstated. Monroe counts as nearby; no drive-time promise. |
| HERPS show, West Monroe Convention Center | Nov 21, 10 AM–5 PM; Nov 22, 10 AM–4 PM | [Official tourism detail](https://www.monroe-westmonroe.org/events/herps-west-monroe-exotic-reptile-and-pet-show-4/). Two separate daily listings, $10 adult one-day; alternate child/two-day rates retained. Ticket availability unconfirmed. |

Seven additional stories, each with publisher headline, author, direct link and
brief original summary:

| Coverage | Source | Treatment |
| --- | --- | --- |
| Ruston campus leadership | [Louisiana Illuminator](https://lailluminator.com/2026/11/19/louisiana-tech-hires-alumnus-trump-administration-official-as-next-president/) | Nov 19 reporting about the Tech presidency, distinct from the prior UL System leadership story. |
| Monroe-area seasonal outings | [KEDM](https://www.kedm.org/kedm-news/2026-11-19/the-holiday-season-returns-with-a-full-lineup-of-festive-events) | Nov 19 reporting; the explicit EST clock is preserved as an instant. This overview does not verify every individual event. |
| Pulsar search and open data | [NASA Science](https://science.nasa.gov/open-science/fermi-data-pulsar-discovery/) | Nov 19 institutional update, manually inspected and summarized; no feed refresh. |
| Atacama desert flowering | [NASA Earth Observatory](https://science.nasa.gov/earth/earth-observatory/el-nino-rains-paint-the-atacama/) | Nov 19 institutional update; links to imagery on the publisher site without importing media. |
| Android app distribution | [Ars Technica](https://arstechnica.com/gadgets/2026/11/google-will-launch-android-app-verification-requirement-globally-in-january-2027/) | Nov 19 reporting, attributed to the publisher. |
| AI and climate answers | [Ars Technica](https://arstechnica.com/science/2026/11/llms-will-provide-accurate-climate-info-except-when-they-wont/) | Nov 19 analysis; findings limited to tested models/prompts. |
| Game criticism | [Ars Technica](https://arstechnica.com/gaming/2026/11/grand-theft-auto-vi-the-ars-technica-review/) | Actual article date Nov 18. Labeled Opinion, with review identified in headline/summary; a discovery experiment rather than an assumed new interest. |

All selected pages were readable without a paywall when inspected. Except KEDM,
no precise publication instant is asserted where only date/clock without a verified
zone was established. Search/homepage mentions were not used as article summaries.
AP, Stateline and some KEDM syndicated pages could not be opened and were excluded.
Independent national/world reporting remains a coverage gap; an institutional
international science story does not fill that gap by itself.

## Usability and source maintenance

- Things to do now offers **All checked dates / Today / Next 7 days** alongside
  travel and price filters. Calendar overlap uses each event's named time zone,
  including ongoing exhibitions and exact midnight/DST boundaries. Seven days means
  today plus the next six calendar days. Filters cannot revive stale/expired items.
- Current-result counts explain the active filters. News cards show their explicit
  topics so the owner can understand the starting interest mix. Interests and saved
  items still last only for the visit; no personal-record inference or new storage.
- New sources: Discover Monroe West Monroe, KEDM and separately curated NASA Science.
  These are manual public-page sources. No documented acquisition API, automated
  scraping permission, reuse license for bodies/media, free-tier quota or guaranteed
  update frequency is assumed. No automated source is approved.
- Refresh stays **on owner request**. Updating/reloading the app only reevaluates
  dates and freshness; it does not fetch new events or renew checks. There is no
  background scheduler, subscription, key, overage risk or real AI connection.
- New news and near-term outings move to needs-a-check after 24 hours without an
  actual reinspection. For this batch that is November 20 at 10:30 PM Central.
  Weekend listings therefore need rechecking before weekend recommendations can
  stay current. End/expiry and cancellations still override freshness.
- Food data and the saved NASA feed bundle/check clock are unchanged. Two new NASA
  article pages were inspected manually; zero NASA feed requests were made.

## Validation and handoff

The public preview starts and loads the existing saved feed without acquisition.
The [catalog audit](discover/CONTENT_REFRESH_2026-11-19.json) records **7 current
outing listings / 12 current stories / 0 active nearby deals** at its stated clock;
counts are evidence snapshots, not an ongoing guarantee. The show contributes two
daily listings. Historical tests now use the frozen earlier selection instead of
requiring future content checks to exist at an earlier clock.

351 Discover tests passed across 17 suites; 713 tests passed across 78 suites in
an isolated copy of committed HEAD plus only this slice. Changed-file and isolated
full ESLint passed, along with project TypeScript and an isolated production build
(including the existing font downloads). Local browser access is unavailable, so no new visual,
authenticated or physical-iPhone acceptance is claimed.

Affected files: new `lib/discover/refresh-2026-11-19.ts` and tests; new
`lib/discover/event-filters.ts` and tests; candidate catalog/two historical test
files; source registry; Discover view; preview compiler; this guide and audit JSON.
No overlap with paused work. No dependency/schema or navigation changes.

Next bounded task: review the date controls on phone, refresh the dated weekend
pages on request, then broaden independent national/world sources with accessible
article pages. Decide whether the game-review discovery pick is useful after trying
the mix. No new decision blocks this local slice; publication needs separate approval.
