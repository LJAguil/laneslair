import type { EditorialEvidence, EventItem, NewsItem } from "./types";

/** Inspected public pages. This clock is never renewed by a build, page view or feed fetch. */
export const november26CheckedAt = "2026-11-26T17:34:17Z";
const evidence = (sourceId: string, url: string, level: EditorialEvidence["level"]): EditorialEvidence => ({ sourceId, url, level, verifiedAt: november26CheckedAt, fetchedAt: null, sourceUpdatedAt: null });
function outing(id: string, title: string, sourceId: string, url: string, startsAt: string, endsAt: string | null, venue: string, city: string, category: EventItem["category"], description: string, free = false): EventItem {
  return { id, kind: "event", title, status: "scheduled", evidence: evidence(sourceId, url, "official-listing"),
    window: endsAt ? { kind: "timed", startsAt, endsAt, timeZone: "America/Chicago" } : { kind: "start-only", startsAt, timeZone: "America/Chicago" },
    venue, city, category, description, travel: "nearby", price: free ? { kind: "free" } : { kind: "unknown" }, admission: "public", registrationUrl: null };
}
const ruston = "https://www.rustonlincoln.com/events/", monroe = "https://www.monroe-westmonroe.org/events/";
export const november26Events: readonly EventItem[] = [
  outing("tech-basketball-2026-11-27", "LA Tech men's basketball vs. Texas State", "experience-ruston", `${ruston}la-tech-mens-basketball-33/`,
    "2026-11-27T14:00:00-06:00", "2026-11-27T16:00:00-06:00", "Thomas Assembly Center · 1650 W Alabama Ave", "Ruston", "campus",
    "The tourism listing gives a 2–4 PM window for the Bulldogs game. Ticket price and availability are not supplied; check the university's ticket information before going."),
  outing("sundown-cold-canyons-2026-11-27", "Sundown Live Music: Cold Canyons", "experience-ruston", `${ruston}sundown-live-music-cold-canyons/`,
    "2026-11-27T21:00:00-06:00", null, "Sundown Tavern · 111 E Park Avenue", "Ruston", "music",
    "A dated Friday-night performance downtown. Cover charge, age requirements and end time are unstated; check with the tavern."),
  outing("ruston-market-2026-11-28", "Ruston Farmers Market", "experience-ruston", `${ruston}ruston-farmers-market1-92/`,
    "2026-11-28T09:00:00-06:00", "2026-11-28T13:00:00-06:00", "Ruston Farmers Market · 220 E Mississippi Ave", "Ruston", "community",
    "Shop local produce and handmade goods at the specifically listed Saturday market. Purchases cost extra; the source does not state an admission fee."),
  outing("downtown-vendors-2026-11-28", "Downtown Vendors Market Open House", "experience-ruston", `${ruston}downtown-vendors-market-open-house/`,
    "2026-11-28T10:00:00-06:00", "2026-11-28T17:00:00-06:00", "Downtown Vendors Market · 311 E Georgia Ave", "Ruston", "community",
    "A local shopping open house with visiting vendors and refreshments advertised. Purchases are extra; admission and refreshment charges are not specified."),
  outing("creative-meetup-2026-11-30", "Creative Meetups", "experience-ruston", `${ruston}creative-meetups-81/`,
    "2026-11-30T18:00:00-06:00", "2026-11-30T20:00:00-06:00", "Kit Gilbert Studio · 301 N Trenton St", "Ruston", "arts",
    "Bring a project and meet other artists at this dated Creative Exchange gathering. The official tourism listing gives 6–8 PM; price and registration requirements are unstated."),
  outing("enochs-cypress-knees-2026-11-27", "Jordan Sheppard & The Cypress Knees Live at Enoch's", "monroe-west-monroe", `${monroe}jordan-sheppard-the-cypress-knees-live-at-enochs/`,
    "2026-11-27T21:00:00-06:00", null, "Enoch's Irish Pub · 507 Louisville Ave", "Monroe", "music",
    "The official calendar lists a 9 PM band appearance. Cover charge, age restrictions and end time are not provided."),
  ...["28", "29"].map(day => outing(`west-monroe-makers-2026-11-${day}`, `West Monroe Makers Market · ${day === "28" ? "Saturday" : "Sunday"}`, "monroe-west-monroe", `${monroe}west-monroe-makers-market/`,
    `2026-11-${day}T08:00:00-06:00`, `2026-11-${day}T16:00:00-06:00`, "Lazarre Park · 703 Riverfront St", "West Monroe", "community",
    "Browse artisans and makers in the park. The calendar explicitly lists free admission and 8 AM–4 PM each day; vendor purchases cost extra.", true)),
  ...["26", "27"].map(day => outing(`land-of-lights-2026-11-${day}`, `Land of Lights · ${day === "26" ? "Thursday" : "Friday"}`, "monroe-west-monroe", `${monroe}land-of-lights-2/`,
    `2026-11-${day}T17:30:00-06:00`, `2026-11-${day}T22:00:00-06:00`, "Downtown West Monroe · 100 Commerce Street", "West Monroe", "outdoors",
    "Walk through downtown light displays. The dated listing advertises nightly 5:30–10 PM hours through December 31. Only this night's window is shown; admission is not stated.")),
];

function story(id: string, title: string, sourceId: string, url: string, publishedOn: string, author: string, topics: string[], text: string, format: NewsItem["format"] = "reporting"): NewsItem {
  return { id, kind: "news", title, status: "scheduled", evidence: evidence(sourceId, url, "publisher-reported"), publishedAt: null, publishedOn, author, topics, format, access: "open",
    summary: { kind: "original", text, writtenAt: november26CheckedAt } };
}
export const november26News: readonly NewsItem[] = [
  story("illuminator-space-academy-2026-11-25", "Louisiana’s quest for US Space Academy persists despite midterm setback", "illuminator", "https://lailluminator.com/2026/11/25/space-academy/", "2026-11-25", "Piper Hutchinson", ["louisiana", "science", "national"],
    "Louisiana is pursuing a New Orleans site for a proposed federal space academy. The Illuminator examines the state's pitch and the political hurdles facing its bid."),
  story("illuminator-striped-bass-2026-11-25", "Biologists work to boost Louisiana’s striped bass numbers. They need help from anglers.", "illuminator", "https://lailluminator.com/2026/11/25/striped-bass/", "2026-11-25", "Elise Plunk", ["louisiana", "science", "discovery"],
    "Louisiana researchers are studying declining striped bass populations and asking anglers for catch information and samples. The reporting connects the project to warmer water and shrinking habitat."),
  story("ars-ladybird-alpha-2026-11-25", "Ladybird browser’s first downloadable alpha is surprisingly capable", "ars-technica", "https://arstechnica.com/gadgets/2026/11/ladybirds-new-alpha-shows-theres-life-beyond-chromium/", "2026-11-25", "Nick Indge", ["technology", "discovery"],
    "Ars tests an early Linux and macOS release of a browser built around an independent engine. Its hands-on assessment explores compatibility and the value of another implementation of web standards.", "analysis"),
  story("ars-etsy-ai-2026-11-25", "Etsy clarifies AI terms after seller backlash", "ars-technica", "https://arstechnica.com/tech-policy/2026/11/etsy-clarifies-ai-terms-after-seller-backlash/", "2026-11-25", "Cyrus Farivar", ["technology", "discovery"],
    "Etsy revised its explanation of how seller content relates to AI after creators objected to new terms. Ars reports the company's response and why some sellers remain dissatisfied."),
  story("nasa-iss-biomedical-2026-11-25", "Crew Works Biomedical Research Day Before Thanksgiving Space Delivery", "nasa-editorial", "https://www.nasa.gov/blogs/spacestation/2026/11/25/crew-works-biomedical-research-day-before-thanksgiving-space-delivery/", "2026-11-25", "Mark A. Garcia", ["science", "technology", "discovery"],
    "NASA's station update describes astronaut ultrasound and cardiovascular investigations, alongside life-support maintenance and preparations for incoming supplies. It is an agency account of mission activity.", "institutional-update"),
  story("gv-nepal-food-2026-11-21", "Reclaiming Indigenous culinary histories in Nepal", "global-voices", "https://globalvoices.org/2026/11/21/rereclaiming-indigenous-culinary-histories-in-nepal/", "2026-11-21", "Sanjib Chaudhary", ["world", "discovery"],
    "An interview with food historian Binti Gurung explores efforts to document Indigenous Himalayan recipes and the knowledge held by women's groups. It connects food traditions with identity and whose histories receive attention."),
  story("gv-nigeria-justice-2026-11-25", "Jailed for being poor, forgotten by slow courts in Nigeria, saved by strangers online", "global-voices", "https://globalvoices.org/2026/11/25/jailed-for-being-poor-forgotten-by-slow-courts-in-nigeria-saved-by-strangers-online/", "2026-11-25", "Fatima Zahra Yahaya · Guest Contributor", ["world", "discovery"],
    "The contributor uses cases of online fundraising for Nigerian prisoners to question a system in which publicity can influence access to freedom. This is a perspective on justice and inequality, rather than a broad breaking-news roundup.", "opinion"),
  story("gv-kyrgyzstan-justice-2026-11-24", "In Kyrgyzstan, public meetings with the president turn into a quest to seek justice", "global-voices", "https://globalvoices.org/2026/11/24/in-kyrgyzstan-public-meetings-with-the-president-turn-into-a-quest-to-seek-justice/", "2026-11-24", "Nurbek Bekmurzaev", ["world", "discovery"],
    "Global Voices examines residents bringing unresolved legal grievances directly to Kyrgyzstan's president. The piece explores what those public appeals suggest about trust in courts and law enforcement.", "analysis"),
  { ...story("illuminator-economy-ai-2026-11-25", "US economy heats up on AI investment, consumer spending", "illuminator", "https://lailluminator.com/2026/11/25/repub/economy-ai/", "2026-11-25", "Tim Henderson", ["national", "technology"], ""), access: "unknown",
    summary: { kind: "unavailable", reason: "Headline, author and date checked on the publisher's news index. The article page was unavailable during review; no summary supplied." } },
];
