import type { DiscoverItem, EditorialEvidence, NewsItem } from "./types";

/** Selected pages reinspected November 19 in America/Chicago; never a build clock. */
export const refreshCheckedAt = "2026-11-20T04:03:44Z";
const evidence = (sourceId: string, sourceItemId: string, url: string, level: EditorialEvidence["level"]): EditorialEvidence => ({
  sourceId, sourceItemId, url, level, verifiedAt: refreshCheckedAt, fetchedAt: null, sourceUpdatedAt: null,
});
const article = (id: string, title: string, sourceId: string, url: string, publishedOn: string, author: string, topics: string[], text: string, format: NewsItem["format"] = "reporting"): NewsItem => ({
  id, kind: "news", status: "scheduled", title, evidence: evidence(sourceId, id, url, "publisher-reported"),
  // The visible publisher clocks do not establish a time zone. Do not invent instants.
  publishedAt: null, publishedOn, author, topics, format, access: "open",
  summary: { kind: "original", text, writtenAt: refreshCheckedAt },
});

export const refreshAdditions: readonly DiscoverItem[] = [
  {
    id: "ruston-art-ramble-2026-11-19", kind: "event", status: "scheduled", title: "Ruston Art Ramble", category: "arts",
    evidence: evidence("experience-ruston", "ruston-art-ramble-2026-11-19", "https://www.rustonlincoln.com/events/ruston-art-ramble-7/", "official-listing"),
    description: "Downtown businesses host artists and makers during an evening art walk. Art, food and drinks may be purchased separately; the listing does not state an admission price.",
    window: { kind: "timed", startsAt: "2026-11-19T17:30:00-06:00", endsAt: "2026-11-19T20:00:00-06:00", timeZone: "America/Chicago" },
    venue: "Downtown Ruston · multiple businesses", city: "Ruston", travel: "nearby", price: { kind: "unknown" }, admission: "public", registrationUrl: null,
  },
  {
    id: "ruston-christmas-kickoff-2026-11-19", kind: "event", status: "scheduled", title: "Kickoff to Christmas", category: "community",
    evidence: evidence("experience-ruston", "ruston-christmas-kickoff-2026-11-19", "https://www.rustonlincoln.com/events/kickoff-to-christmas/", "official-listing"),
    description: "Downtown holiday lights are scheduled to switch on at 6 PM, with music and late shopping. Arrive before the switch-on; admission price is not stated. This overlaps the Art Ramble nearby.",
    window: { kind: "timed", startsAt: "2026-11-19T18:00:00-06:00", endsAt: "2026-11-19T20:00:00-06:00", timeZone: "America/Chicago" },
    venue: "Downtown · 101 W Park Ave", city: "Ruston", travel: "nearby", price: { kind: "unknown" }, admission: "public", registrationUrl: null,
  },
  article("illuminator-ul-system-2026-11-18", "UL System board violated Open Meetings Law with presidential hire, DA rules", "illuminator",
    "https://lailluminator.com/2026/11/18/ul-system-board-violated-open-meetings-law-with-presidential-hire-da-rules/", "2026-11-18", "Piper Hutchinson", ["louisiana"],
    "The Illuminator reports that the district attorney found the university board’s hiring notice inadequate. Its November 18 report describes a planned ratification meeting with a more specific public agenda."),
  article("ars-server-preview-2026-11-18", "Windows Server 2028 trades compatibility for out-of-the-box security", "ars-technica",
    "https://arstechnica.com/gadgets/2026/11/windows-server-2028-public-preview-bets-on-a-security-first-approach/", "2026-11-18", "Nick Indge", ["technology"],
    "Ars reports that Microsoft’s server preview starts with stricter security settings for Server Core installations. The changes may disrupt older tools, and the article distinguishes preview limitations from features promised for later builds."),
  article("ars-vulcan-2026-11-18", "Vulcan failure caused by inadequate fuel supply to engines, ULA says", "ars-technica",
    "https://arstechnica.com/space/2026/11/vulcan-failure-caused-by-inadequate-fuel-supply-to-engines-ula-says/", "2026-11-18", "Eric Berger", ["science", "national", "discovery"],
    "ULA’s preliminary account points to the vehicle’s fuel delivery rather than engine performance. Ars explains why that distinction matters for other launch programs while emphasizing that the investigation is still unfinished."),
  article("ars-ukraine-bridge-2026-11-18", "Ukraine blew up Putin’s bridge using relay drones to bypass Starlink limits", "ars-technica",
    "https://arstechnica.com/gadgets/2026/11/ukraine-blew-up-putins-bridge-using-relay-drones-to-bypass-starlink-limits/", "2026-11-18", "Jeremy Hsu", ["world", "technology"],
    "Ars examines reports of damage to the Kerch bridge and its implications for transport links to occupied Crimea. The article draws on other reporting and competing accounts about communications restrictions.", "analysis"),
  article("ars-copilot-office-2026-11-17", "Copilot is “the new OS for work,” and now Office runs inside of it", "ars-technica",
    "https://arstechnica.com/gadgets/2026/11/microsoft-calls-copilot-the-new-os-for-work-at-ignite-keynote/", "2026-11-17", "Nick Indge", ["technology", "discovery"],
    "Ars examines Microsoft’s move to put Office applications inside Copilot, alongside proposed autonomous agents. Its analysis separates available integrations from forthcoming features and questions how organizations will govern access and measure costs.", "analysis"),
];

/** Only these two existing pages were reinspected. No batch-wide timestamp renewal. */
export function applyRefreshChecks(item: DiscoverItem): DiscoverItem {
  if (item.evidence.level === "subscription-feed") return item;
  if ((item.kind === "event" && item.id === "prescott-holocaust-exhibit-2026") ||
    (item.kind === "deal" && item.id === "wendys-classic-combo-undated")) {
    return { ...item, evidence: { ...item.evidence, verifiedAt: refreshCheckedAt } };
  }
  return item;
}
