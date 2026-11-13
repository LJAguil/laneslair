import { curatedCatalog } from "./curated";
import { candidateNews } from "./candidate-news";
import type { DealItem, DiscoverItem, EditorialEvidence, EventItem } from "./types";

/** Explicit editorial selection; source checks are independent of build/release time. */
export const candidateCheckedAt = "2026-11-13T21:53:40Z";
export const candidateCurationNote = "Selected outings, offers and reporting checked November 13, 2026. Other picks retain their own dated checks; feed checks are shown separately.";
const zone = "America/Chicago";
const evidence = (url: string, sourceItemId: string, sourceId = "experience-ruston", level: EditorialEvidence["level"] = "official-listing"): EditorialEvidence => ({
  sourceId, sourceItemId, url, level, verifiedAt: candidateCheckedAt, fetchedAt: null, sourceUpdatedAt: null,
});
const cedar = "https://www.rustonlincoln.com/events/holidays-in-cedartown-2/";
const offers = "https://www.wendys.com/offers-coupons";

const additions: DiscoverItem[] = [
  {
    id: "prescott-holocaust-exhibit-2026", kind: "event", title: "Americans and the Holocaust — public exhibition", status: "scheduled", category: "campus",
    evidence: evidence("https://www.rustonlincoln.com/events/americans-and-the-holocaust/", "prescott-holocaust-exhibit-2026"),
    description: "Free public exhibition at Louisiana Tech. The listing's description gives October 23–December 4; daily opening hours are not supplied. Check library hours before visiting.",
    window: { kind: "dates", startDate: "2026-10-23", endDateExclusive: "2026-12-05", timeZone: zone },
    venue: "Prescott Memorial Library · Louisiana Tech", city: "Ruston", travel: "nearby", price: { kind: "free" }, admission: "public", registrationUrl: null,
  },
  {
    id: "sundown-kyle-thompson-2026-11-13", kind: "event", title: "Sundown live music: Kyle Thompson Band", status: "scheduled", category: "music",
    evidence: evidence("https://www.rustonlincoln.com/events/sundown-live-music-kyle-thompson-band/", "sundown-kyle-thompson-2026-11-13"),
    description: "Friday performance at Sundown Tavern. The dated listing confirms a 9 PM start; cover, age restrictions and a specific end time are not confirmed.",
    window: { kind: "start-only", startsAt: "2026-11-13T21:00:00-06:00", timeZone: zone },
    venue: "Sundown Tavern · 111 E Park Ave", city: "Ruston", travel: "nearby", price: { kind: "unknown" }, admission: "unknown", registrationUrl: null,
  },
  {
    id: "ruston-market-2026-11-14", kind: "event", title: "Ruston Farmers Market — Saturday", status: "scheduled", category: "community",
    evidence: evidence("https://www.rustonlincoln.com/events/ruston-farmers-market1-92/", "ruston-market-2026-11-14"),
    description: "The calendar explicitly includes November 14. The market's own FAQ confirms Saturday hours of 9 AM–1 PM at this address. Admission price is not stated; purchases are separate.",
    window: { kind: "timed", startsAt: "2026-11-14T09:00:00-06:00", endsAt: "2026-11-14T13:00:00-06:00", timeZone: zone },
    venue: "Ruston Farmers Market · 220 E Mississippi Ave", city: "Ruston", travel: "nearby", price: { kind: "unknown" }, admission: "public", registrationUrl: null,
  },
  {
    id: "cedartown-cookie-crew-2026-11-14", kind: "event", title: "Santa’s Cookie Crew at CedarTown", status: "scheduled", category: "community",
    evidence: evidence(cedar, "cedartown-cookie-crew-2026-11-14"),
    description: "Children's cookie and Santa activities at the holiday market. The calendar lists $15 per child and limited door tickets; adult admission and remaining tickets need checking.",
    window: { kind: "timed", startsAt: "2026-11-14T09:30:00-06:00", endsAt: "2026-11-14T12:00:00-06:00", timeZone: zone },
    venue: "Ruston Civic Center · 401 N Trenton St", city: "Ruston", travel: "nearby", price: { kind: "known", amount: 15, currency: "USD", note: "Per child; adult admission and remaining tickets unconfirmed" }, admission: "public", registrationUrl: null,
  },
  {
    id: "creative-meetup-2026-11-16", kind: "event", title: "Creative Meetups — location needs confirmation", status: "scheduled", category: "arts",
    evidence: evidence("https://www.rustonlincoln.com/events/creative-meetups-81/", "creative-meetup-2026-11-16", "experience-ruston", "unverified"),
    description: "November 16 is listed for 6–8 PM. The calendar gives 301 N Trenton St, while the organizer's older meetup listings give 204 W Alabama St. Confirm venue and cost before going.",
    window: { kind: "timed", startsAt: "2026-11-16T18:00:00-06:00", endsAt: "2026-11-16T20:00:00-06:00", timeZone: zone },
    venue: "Kit Gilbert Studio · address disputed", city: "Ruston", travel: "nearby", price: { kind: "unknown" }, admission: "unknown", registrationUrl: null,
  },
  {
    id: "wendys-classic-combo-undated", kind: "deal", title: "Wendy’s advertised $7.99 classic combo — dates unknown", status: "scheduled", restaurant: "Wendy’s",
    evidence: evidence(offers, "classic-combo-undated", "wendys"), window: null,
    participation: { kind: "national-local-unknown" },
    requirements: { purchase: "Advertised combo includes a Dave’s Single, small fries and a small soft drink. Local price may differ.", app: false, account: false, coupon: null, channels: ["in-store"], reviewedAt: null,
      exclusions: ["Public advertising says no offer is needed; no app/account requirement is stated for restaurant purchase.", "No exact promotion dates are published, so this is not an active verified deal.", "U.S. prices and participation vary; Ruston availability is unknown.", "Cannot combine with other discounts; no substitutions. Delivery may cost more."],
    },
  },
];

function refreshed(item: DiscoverItem): DiscoverItem {
  const reviewedNews = candidateNews.find(news => news.id === item.id);
  if (reviewedNews) return reviewedNews;
  if (item.kind === "event" && ["cedartown-shopping-2026-11-13", "local-music-2026-11-13"].includes(item.id)) {
    return { ...item, evidence: { ...item.evidence, verifiedAt: candidateCheckedAt } } satisfies EventItem;
  }
  if (item.kind === "deal" && item.id === "wendys-frosty-2026-11-15") {
    return { ...item, evidence: { ...item.evidence, url: offers, verifiedAt: candidateCheckedAt }, requirements: { ...item.requirements, exclusions: [
      "Participating U.S. restaurants only; Ruston availability remains unknown.", "Redeem the November 15 app offer with a purchase; the public page does not state a minimum amount or full redemption limits.",
      "The official coupon FAQ says offers cannot be combined. Check the actual app offer for remaining exclusions.",
    ], reviewedAt: null } } satisfies DealItem;
  }
  // No batch-wide renewal: unreviewed articles and summaries keep their checks.
  return item;
}
export const candidateCatalog: readonly DiscoverItem[] = [...curatedCatalog.map(refreshed), ...additions];
