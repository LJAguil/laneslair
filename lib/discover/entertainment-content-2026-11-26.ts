import type { DealItem, DiscoverTitle, EditorialEvidence, NewsItem } from "./types";

export const entertainmentCheckedAt = "2026-11-26T21:47:18Z";
const evidence = (sourceId: string, url: string, level: EditorialEvidence["level"], checkedAt = entertainmentCheckedAt): EditorialEvidence => ({ sourceId, url, level, verifiedAt: checkedAt, fetchedAt: null, sourceUpdatedAt: null });
function news(id: string, title: string, sourceId: string, url: string, publishedOn: string | null, author: string | null, topics: string[], text: string, titles: DiscoverTitle[], checkedAt = entertainmentCheckedAt): NewsItem {
  return { id, kind: "news", title, status: "scheduled", evidence: evidence(sourceId, url, "publisher-reported", checkedAt), publishedAt: null, ...(publishedOn ? { publishedOn } : {}), author, topics,
    format: "institutional-update", access: "open", summary: { kind: "original", text, writtenAt: checkedAt }, entertainment: titles };
}
const ps = "https://blog.playstation.com/";
export const entertainmentNews: readonly NewsItem[] = [
  news("disney-doomsday-guide-2026-11-26", "Marvel Studios’ Avengers: Doomsday Arrives Exclusively In Theaters December 18", "disney-entertainment",
    "https://www.disneyplus.com/explore/articles/avengers-doomsday", null, "Explore Disney+ Contributor", ["movies", "discovery"],
    "Disney's guide lists a December 18 theatrical opening and outlines the crossover's cast. The page was revised November 24, but gives no original publication date. A Disney+ streaming date has not been announced.",
    [{ title: "Avengers: Doomsday", media: "movie", platform: "Theaters · check local listings", release: "Announced theatrical release: December 18, 2026. Disney+ date is not known." }], "2026-11-26T21:56:57Z"),
  news("nintendo-xenoblade-2026-11-25", "Watch the Xenoblade Chronicles 3 – Nintendo Switch 2 Edition Overview trailer ahead of the game launch on Dec. 3!", "nintendo-news",
    "https://www.nintendo.com/us/whatsnew/watch-the-xenoblade-chronicles-3-nintendo-switch-2-edition-overview-trailer-ahead-of-the-game-launch-on-dec-3/", "2026-11-25", null, ["games", "discovery"],
    "Nintendo previews its upcoming Switch 2 edition of the role-playing game. The announcement lists a December 3 launch; this is platform-holder promotion rather than an independent review.",
    [{ title: "Xenoblade Chronicles 3 – Nintendo Switch 2 Edition", media: "game", platform: "Nintendo Switch 2", release: "Announced release: December 3, 2026; check the store for changes." }]),
  news("ps-plus-december-2026", "PlayStation Plus Monthly Games for December: Tony Hawk’s Pro Skater 3+4, Dragon Ball Xenoverse 2, Amnesia: The Bunker", "playstation-blog",
    `${ps}2026/11/25/playstation-plus-monthly-games-for-december-tony-hawks-pro-skater-34-dragon-ball-xenoverse-2-amnesia-the-bunker/`, "2026-11-25", "Adam Michel", ["games"],
    "Sony announces December's subscription selections. These are additions to PlayStation Plus, not new launch dates for the games; membership and redemption conditions apply.",
    [{ title: "Tony Hawk's Pro Skater 3+4", media: "game", platform: "PS5 / PS4", release: "PS Plus selection: December 1, 2026–January 4, 2027; subscription required." },
      { title: "Dragon Ball Xenoverse 2", media: "game", platform: "PS5 / PS4", release: "PS Plus selection: December 1, 2026–January 4, 2027; subscription required." },
      { title: "Amnesia: The Bunker", media: "game", platform: "PS4", release: "PS Plus selection: December 1, 2026–January 4, 2027; subscription required." }]),
  news("ps-gta-launch-2026-11-23", "Thank you for making Grand Theft Auto VI the biggest launch in PlayStation history", "playstation-blog",
    `${ps}2026/11/23/thank-you-for-making-grand-theft-auto-vi-the-biggest-launch-in-playstation-history/`, "2026-11-23", "Tim Turi", ["games"],
    "PlayStation celebrates the game's launch and describes its platform performance. The launch claim comes from Sony; it is a company update, not an independently audited sales comparison.",
    [{ title: "Grand Theft Auto VI", media: "game", platform: "PS5", release: "Recent release; check the official store for current pricing and editions." }]),
  news("xbox-new-games-2026-11-23", "Next Week on XBOX: New Games for November 23 to 27", "xbox-wire",
    "https://news.xbox.com/en-us/2026/11/20/next-week-on-xbox-new-games-for-november-23-to-27/", "2026-11-20", "Will Fulton", ["games", "discovery"],
    "Xbox's release roundup includes a compact factory puzzle game and a couch multiplayer brawler. Dates and supported devices vary by title; confirm individual store listings before buying.",
    [{ title: "Jaden Industries: Cozy Automation Puzzler", media: "game", platform: "Xbox / PC · Play Anywhere", release: "Listed release: November 23, 2026; verify device support in the store." },
      { title: "Bungle Brawl: Couch Co-op Party", media: "game", platform: "Xbox", release: "Listed release: November 24, 2026." }]),
  news("hounded-preview-2026-11-17", "Introducing Hounded: Crafting the dog adventure coming to PS5 in 2027", "playstation-blog",
    `${ps}2026/11/17/introducing-hounded-crafting-the-dog-adventure-coming-to-ps5-in-2027/`, "2026-11-17", "Julia Galus", ["games", "discovery"],
    "The publisher introduces an adventure starring a border collie and discusses its character animation. This is an upcoming-game preview; only a 2027 window is confirmed on this page.",
    [{ title: "Hounded", media: "game", platform: "PS5", release: "Upcoming in 2027; exact release day not announced here." }]),
  news("netflix-november-2026-picks", "New on Netflix in November 2026", "netflix-tudum", "https://www.netflix.com/tudum/articles/new-on-netflix", "2026-10-31", "Ashley Lee", ["movies", "tv", "anime", "discovery"],
    "Netflix's dated schedule includes a wartime film, a returning thriller and a dystopian anime. A further crime series is listed as coming soon. Streaming needs a suitable subscription; availability can differ by region.",
    [{ title: "The Mosquito Bowl", media: "movie", platform: "Netflix", release: "Listed streaming release: November 25, 2026; availability varies by region." },
      { title: "The Hunting Wives", media: "show", platform: "Netflix", release: "Season 2 listed for November 26, 2026. No viewing progress is assumed." },
      { title: "Fool Night", media: "show", anime: true, platform: "Netflix", release: "Anime series listed for November 26, 2026; check regional availability." },
      { title: "Gordon", media: "show", platform: "Netflix", release: "Coming soon; this schedule does not give an exact date." }]),
];

const requirements = (purchase: string, app: boolean, exclusions: string[]): DealItem["requirements"] => ({ purchase, app, account: app, coupon: null, channels: app ? ["app"] : ["in-store"], exclusions, reviewedAt: entertainmentCheckedAt });
export const foodDealUpdates: readonly DealItem[] = [
  { id: "wendys-physical-keytag-2027", kind: "deal", title: "Wendy's: $3 physical Frosty Key Tag", restaurant: "Wendy's", status: "scheduled",
    evidence: evidence("wendys", "https://www.wendys.com/adoption/frosty-key-tags", "official-listing"), participation: { kind: "national-local-unknown" },
    window: { kind: "dates", startDate: "2026-11-16", endDateExclusive: "2027-02-01", timeZone: "America/Chicago" },
    requirements: requirements("Buy the $3 physical tag by January 31, 2027, while stock lasts. Present it with an in-restaurant purchase to redeem one Classic Jr. Frosty through December 31, 2027.", false,
      ["Participating U.S. restaurants; Ruston participation and stock not confirmed.", "Limit one per transaction per visit per physical tag. Upgraded Frosty versions are excluded.", "This card covers the physical tag; digital tags have account and redemption differences. The offer-specific page gives November 16 as its start; other brand pages have older conflicting text."]) },
  { id: "mcdonalds-fries-observed-2026-11-26", kind: "deal", title: "McDonald's: free medium fries with $1+ purchase", restaurant: "McDonald's", status: "scheduled",
    evidence: evidence("mcdonalds-deals", "https://www.mcdonalds.com/us/en-us/deals.html", "official-listing"), participation: { kind: "national-local-unknown" }, windowBasis: "observed-active",
    window: { kind: "dates", startDate: "2026-11-26", endDateExclusive: "2027-01-01", timeZone: "America/Chicago" },
    requirements: requirements("Spend at least $1 before tax and redeem the offer in the app. Rewards enrollment/opt-in is required.", true,
      ["Once per week through December 31, 2026. The current page does not restrict this to Fridays.", "Participating restaurants only; nearby participation is unknown. Delivery is excluded.", "Original promotion start is not published. Confirm eligibility and any additional account-specific limits on your app's offer card."]) },
  { id: "mcdonalds-breakfast-observed-2026-11-26", kind: "deal", title: "McDonald's: $2 breakfast sandwich app offer", restaurant: "McDonald's", status: "scheduled",
    evidence: evidence("mcdonalds-deals", "https://www.mcdonalds.com/us/en-us/deals.html", "official-listing"), participation: { kind: "national-local-unknown" }, windowBasis: "observed-active",
    window: { kind: "dates", startDate: "2026-11-26", endDateExclusive: "2027-01-01", timeZone: "America/Chicago" },
    requirements: requirements("Buy an eligible sandwich for $2 before tax during your restaurant's breakfast service. No extra purchase is stated; app offer and Rewards opt-in required.", true,
      ["Once per week through December 31, 2026; tax is extra. McDelivery is excluded.", "Participating restaurants; nearby availability and account eligibility are unconfirmed.", "Original start is unpublished. Eligible sandwich choices and breakfast hours must be checked in the selected restaurant's app."]) },
  { id: "wendys-fryday-undated-2026-11-26", kind: "deal", title: "Wendy's Fryday app offer · dates need checking", restaurant: "Wendy's", status: "scheduled",
    evidence: evidence("wendys", "https://www.wendys.com/offers-coupons", "official-listing"), participation: { kind: "national-local-unknown" }, window: null,
    requirements: { ...requirements("The public offer tile advertises fries with a $5 qualifying purchase. Check the actual app offer before ordering.", true,
      ["The public page gives no exact promotion end date or complete redemption limits; this is not an active recommendation.", "Nearby restaurant participation is unknown. Wendy's states coupons cannot be combined."]), reviewedAt: null } },
];
