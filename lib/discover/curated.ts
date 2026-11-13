import type { DiscoverItem, EditorialEvidence, NewsItem } from "./types";

/** Editorial source inspection in this chat, not a runtime feed refresh.
 * Never advance this timestamp without inspecting the linked item again.
 */
export const catalogCheckedAt = "2026-11-12T07:06:20Z";
const evidence = (sourceId: string, url: string, sourceItemId: string, level: EditorialEvidence["level"] = "official-listing"): EditorialEvidence => ({
  sourceId, url, sourceItemId, level, verifiedAt: catalogCheckedAt, fetchedAt: null, sourceUpdatedAt: null,
});
const cedarUrl = "https://www.rustonlincoln.com/events/holidays-in-cedartown-2/";
const article = (id: string, title: string, sourceId: string, url: string, publishedOn: string, author: string, topics: string[], text: string, format: NewsItem["format"] = "reporting"): NewsItem => ({
  id, kind: "news", title, evidence: evidence(sourceId, url, id, "publisher-reported"), status: "scheduled",
  publishedAt: null, publishedOn, author, topics, format, access: "open",
  summary: { kind: "original", text, writtenAt: catalogCheckedAt },
});

/** Small dated public catalog. No fictional fillers or automatically renewed dates. */
export const curatedCatalog: DiscoverItem[] = [
  {
    id: "cedartown-preview-2026-11-12", kind: "event", title: "Holidays in CedarTown — preview party",
    evidence: evidence("experience-ruston", cedarUrl, "cedartown-preview-2026-11-12"), status: "scheduled", category: "community",
    description: "An evening preview of the holiday shopping market. The calendar lists refreshments and limited door tickets; check availability before going.",
    window: { kind: "timed", startsAt: "2026-11-12T17:00:00-06:00", endsAt: "2026-11-12T20:30:00-06:00", timeZone: "America/Chicago" },
    venue: "Ruston Civic Center · 401 N Trenton St", city: "Ruston", travel: "nearby", price: { kind: "known", amount: 30, currency: "USD", note: "Preview ticket; availability not confirmed" }, admission: "public", registrationUrl: null,
  },
  {
    id: "cedartown-shopping-2026-11-13", kind: "event", title: "Holidays in CedarTown — Friday market",
    evidence: evidence("experience-ruston", cedarUrl, "cedartown-shopping-2026-11-13"), status: "scheduled", category: "community",
    description: "Browse the holiday market on Friday. The listing gives Friday hours but does not establish a Friday admission price.",
    window: { kind: "timed", startsAt: "2026-11-13T09:00:00-06:00", endsAt: "2026-11-13T18:00:00-06:00", timeZone: "America/Chicago" },
    venue: "Ruston Civic Center · 401 N Trenton St", city: "Ruston", travel: "nearby", price: { kind: "unknown" }, admission: "public", registrationUrl: null,
  },
  {
    id: "downtown-lunch-2026-11-13", kind: "event", title: "Downtowns Out to Lunch",
    evidence: evidence("experience-ruston", "https://www.rustonlincoln.com/events/downtowns-out-to-lunch/", "downtown-lunch-2026-11-13"), status: "scheduled", category: "music",
    description: "A public lunchtime performance at the food park. Admission is listed as free; food purchases are separate.",
    window: { kind: "timed", startsAt: "2026-11-13T11:30:00-06:00", endsAt: "2026-11-13T13:00:00-06:00", timeZone: "America/Chicago" },
    venue: "Heard Freighthouse Food Park · 93 E Railroad Ave", city: "Ruston", travel: "nearby", price: { kind: "free" }, admission: "public", registrationUrl: null,
  },
  {
    id: "local-music-2026-11-13", kind: "event", title: "The Local Live Music: Henry Hood & Viryln",
    evidence: evidence("experience-ruston", "https://www.rustonlincoln.com/events/the-local-live-music-henry-hood-viryln/", "local-music-2026-11-13"), status: "scheduled", category: "music",
    description: "An evening performance at The Local, also named Board and Bottle in the calendar. Check the venue for any admission requirements.",
    window: { kind: "timed", startsAt: "2026-11-13T19:00:00-06:00", endsAt: "2026-11-13T21:00:00-06:00", timeZone: "America/Chicago" },
    venue: "The Local · 130 W Park Ave", city: "Ruston", travel: "nearby", price: { kind: "unknown" }, admission: "unknown", registrationUrl: null,
  },
  article("illuminator-computers-2026-11-10", "Louisiana to provide 25,000 computers for workforce training to community colleges, local orgs", "illuminator",
    "https://lailluminator.com/2026/11/10/apple-to-provide-18000-computers-to-louisiana-groups-local-governments/", "2026-11-10", "Elise Plunk", ["louisiana", "technology"],
    "Louisiana plans to distribute computers and digital-skills training through eleven organizations. The updated report explains how the state-funded program targets access to workforce training."),
  article("illuminator-nuclear-2026-11-11", "Congress has to act first before nuclear campuses take shape, US Energy secretary says", "illuminator",
    "https://lailluminator.com/2026/11/11/congress-nuclear/", "2026-11-11", "Greg LaRose", ["louisiana", "national", "science"],
    "A proposed nuclear-industry campus faces a federal waste-storage approval hurdle. The report examines Louisiana’s bid and the congressional action needed before a site can proceed."),
  article("illuminator-batteries-2026-11-11", "States are counting on battery farms. Some towns don’t want them.", "illuminator",
    "https://lailluminator.com/2026/11/11/repub/battery-farms/", "2026-11-11", "Alex Brown · Stateline, republished by Louisiana Illuminator", ["national", "technology"],
    "Large battery installations can support electricity grids, but some communities oppose nearby projects. This reporting weighs their energy benefits against concerns about fire safety and siting."),
  article("nasa-flow-country-2026-11-12", "Scotland’s Flow Country", "nasa",
    "https://science.nasa.gov/earth/earth-observatory/scotlands-flow-country/", "2026-11-12", "Adam Voiland · NASA Earth Observatory", ["science", "world", "discovery"],
    "A satellite view introduces Scotland’s peat bogs. NASA explains how waterlogged soils preserve plant material and keep carbon stored over long periods.", "institutional-update"),
  article("nasa-navajo-2026-11-11", "Water Surges Into Navajo Reservoir", "nasa",
    "https://science.nasa.gov/earth/earth-observatory/water-surges-into-navajo-reservoir/", "2026-11-11", "Lindsey Doermann · NASA Earth Observatory", ["science", "national", "discovery"],
    "Satellite comparisons show a rapid reservoir rise after heavy Southwest rainfall. NASA connects the changing water levels with flooding and short-term drought relief.", "institutional-update"),
  {
    id: "wendys-frosty-2026-11-15", kind: "deal", title: "Wendy’s: small Frosty with a purchase on November 15",
    restaurant: "Wendy’s", evidence: evidence("wendys", "https://www.wendys.com/", "frosty-day-us-2026"), status: "scheduled",
    window: { kind: "dates", startDate: "2026-11-15", endDateExclusive: "2026-11-16", timeZone: "America/Chicago" },
    participation: { kind: "national-local-unknown" },
    requirements: { purchase: "Purchase required; the public page does not specify a minimum spend.", app: true, account: true, coupon: null, channels: ["app"],
      exclusions: ["Participating U.S. restaurants only; Ruston participation has not been confirmed.", "Full redemption limits, eligible purchase details and other exclusions must be checked in the app."], reviewedAt: null },
  },
];
