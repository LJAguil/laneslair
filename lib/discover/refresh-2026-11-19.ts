import type { EditorialEvidence, EventItem, NewsItem } from "./types";

/** Manual detail-page inspections, November 19 Central. Never renewed by rendering. */
export const november19CheckedAt = "2026-11-20T04:30:54Z";
const evidence = (sourceId: string, id: string, url: string, level: EditorialEvidence["level"]): EditorialEvidence => ({
  sourceId, sourceItemId: id, url, level, verifiedAt: november19CheckedAt, fetchedAt: null, sourceUpdatedAt: null,
});
const event = (id: string, title: string, sourceId: string, url: string, start: string, end: string | null, venue: string, city: string, category: EventItem["category"], description: string, price: EventItem["price"] = { kind: "unknown" }): EventItem => ({
  id, kind: "event", status: "scheduled", title, evidence: evidence(sourceId, id, url, "official-listing"),
  window: end ? { kind: "timed", startsAt: start, endsAt: end, timeZone: "America/Chicago" } : { kind: "start-only", startsAt: start, timeZone: "America/Chicago" },
  venue, city, category, description, travel: "nearby", price, admission: "public", registrationUrl: null,
});

export const november19Events: readonly EventItem[] = [
  event("local-bingo-2026-11-20", "The Local: Bingo Night", "experience-ruston", "https://www.rustonlincoln.com/events/the-local-bingo-night-3/",
    "2026-11-20T18:30:00-06:00", "2026-11-20T20:30:00-06:00", "The Local · 130 W Park Avenue", "Ruston", "community",
    "An evening bingo outing with food and drinks available to buy. The calendar does not specify admission, game charges or age requirements; check with the venue."),
  event("sundown-tammy-martin-2026-11-20", "Sundown Live Music: Tammy Martin Band", "experience-ruston", "https://www.rustonlincoln.com/events/sundown-live-music-tammy-martin-band/",
    "2026-11-20T21:00:00-06:00", null, "Sundown Tavern · 111 E Park Avenue", "Ruston", "music",
    "The official calendar lists a 9 PM performance. Cover charge, age requirements and end time are not provided; check with the tavern before going."),
  event("ruston-market-2026-11-21", "Ruston Farmers Market", "experience-ruston", "https://www.rustonlincoln.com/events/ruston-farmers-market1-92/",
    "2026-11-21T09:00:00-06:00", "2026-11-21T13:00:00-06:00", "Ruston Farmers Market · 220 E Mississippi Ave", "Ruston", "community",
    "Browse local produce and handmade goods at the dated Saturday market. Purchases cost extra; the listing does not state an admission fee. No later occurrence is inferred from its recurring schedule."),
  event("stone-letter-monroe-2026-11-20", "Stone Letter at El Paso", "monroe-west-monroe", "https://www.monroe-westmonroe.org/events/stone-letter-at-el-paso/",
    "2026-11-20T18:00:00-06:00", "2026-11-20T21:00:00-06:00", "El Paso Mexican Grill · 3211 Sterlington Road", "Monroe", "music",
    "The tourism calendar lists this Friday evening appearance. Admission and purchase requirements are unstated. Monroe is included in nearby coverage; travel time depends on your starting point."),
  ...([{ day: "21", end: "17:00" }, { day: "22", end: "16:00" }] as const).map(({ day, end }) => event(
    `herps-west-monroe-2026-11-${day}`, `HERPS reptile and pet show · ${day === "21" ? "Saturday" : "Sunday"}`, "monroe-west-monroe",
    "https://www.monroe-westmonroe.org/events/herps-west-monroe-exotic-reptile-and-pet-show-4/",
    `2026-11-${day}T10:00:00-06:00`, `2026-11-${day}T${end}:00-06:00`, "West Monroe Convention Center · 901 Ridge Ave", "West Monroe", "other",
    "Exhibitors bring reptiles, amphibians and supplies. Each day's hours are listed separately. The calendar lists $15 adult two-day admission, $5 child one-day / $8 two-day admission for ages 5–12, and free admission for ages 4 and under. Confirm ticket availability.",
    { kind: "known", amount: 10, currency: "USD", note: "Adult one-day admission; child and two-day rates differ" })),
];

const story = (id: string, title: string, sourceId: string, url: string, publishedOn: string, author: string, topics: string[], text: string, format: NewsItem["format"] = "reporting", publishedAt: string | null = null): NewsItem => ({
  id, kind: "news", status: "scheduled", title, evidence: evidence(sourceId, id, url, "publisher-reported"),
  publishedAt, publishedOn, author, topics, format, access: "open", summary: { kind: "original", text, writtenAt: november19CheckedAt },
});
export const november19News: readonly NewsItem[] = [
  story("illuminator-tech-president-2026-11-19", "Louisiana Tech hires alumnus, Trump administration official as next president", "illuminator",
    "https://lailluminator.com/2026/11/19/louisiana-tech-hires-alumnus-trump-administration-official-as-next-president/", "2026-11-19", "Piper Hutchinson", ["louisiana"],
    "The Illuminator reports that university supervisors selected Monroe native and Tech graduate Matt Napoli to succeed Jim Henderson. Its reporting examines his federal-service background, the search process and the financial pressures facing the Ruston campus."),
  story("kedm-holiday-guide-2026-11-19", "The Holiday Season returns with a full lineup of festive events", "kedm",
    "https://www.kedm.org/kedm-news/2026-11-19/the-holiday-season-returns-with-a-full-lineup-of-festive-events", "2026-11-19", "Taylor Wilson", ["louisiana", "discovery"],
    "KEDM rounds up seasonal outings around Monroe and West Monroe, including markets, light displays and an outdoor movie. Some require paid admission; this overview is a starting point for checking each organizer's current details.", "reporting", "2026-11-19T13:58:00-05:00"),
  story("nasa-pulsars-2026-11-19", "NASA Science Data Powers New Method to Discover Hard-to-Find Pulsars", "nasa-editorial",
    "https://science.nasa.gov/open-science/fermi-data-pulsar-discovery/", "2026-11-19", "Amanda Moon Adams", ["science", "technology", "discovery"],
    "NASA describes researchers applying a cryptography-inspired search to public Fermi observations. The team found a rapidly spinning pulsar with far less computing time, illustrating how a new algorithm can reveal discoveries in an existing dataset.", "institutional-update"),
  story("nasa-atacama-bloom-2026-11-19", "El Niño Rains Paint the Atacama", "nasa-editorial",
    "https://science.nasa.gov/earth/earth-observatory/el-nino-rains-paint-the-atacama/", "2026-11-19", "Kathryn Hansen", ["science", "world", "discovery"],
    "NASA Earth Observatory compares satellite views of an unusually extensive flowering in Chile's Atacama Desert. Rain awakened dormant seeds; the article explains how field observations and satellite records help researchers understand the bloom.", "institutional-update"),
  story("ars-android-verification-2026-11-19", "Google will launch Android app verification requirement globally in January 2027", "ars-technica",
    "https://arstechnica.com/gadgets/2026/11/google-will-launch-android-app-verification-requirement-globally-in-january-2027/", "2026-11-19", "Ryan Whitwam", ["technology"],
    "Ars reports on Google's planned expansion of developer verification beyond Play Store apps. It describes changes affecting sideloading, a limited hobbyist option and a more involved user opt-out, alongside developers' objections."),
  story("ars-climate-llms-2026-11-19", "“You’re right”—LLMs will get climate info wrong if you ask", "ars-technica",
    "https://arstechnica.com/science/2026/11/llms-will-provide-accurate-climate-info-except-when-they-wont/", "2026-11-19", "Scott K. Johnson", ["technology", "science", "discovery"],
    "Ars examines a study testing language models on climate questions and repeated disagreement. Models that answered factual questions well could still falter on policy combinations or abandon correct answers when challenged; the results concern the tested models and prompts.", "analysis"),
  story("ars-gta-review-2026-11-18", "Grand Theft Auto VI: The Ars Technica review", "ars-technica",
    "https://arstechnica.com/gaming/2026/11/grand-theft-auto-vi-the-ars-technica-review/", "2026-11-18", "Kyle Orland", ["technology", "discovery"],
    "Kyle Orland's review explores how the game's quieter relationship scenes contrast with its action and elaborate city simulation. This is a critic's assessment, offered as a discovery pick rather than a reported news event.", "opinion"),
];
