/** Offline expansion adapters. Not connected to live acquisition or the daily source allowlist. */
import { DOMParser, type Element } from "@xmldom/xmldom";
import { plain, instant } from "../daily/parsers";
import { nasaPublicationDate } from "../feeds/nasa";

export interface ExpansionNews {
  id: string; title: string; url: string; author: string; publishedAt: string;
  topics: string[]; format: "unclassified" | "opinion";
}
export interface CommunityEvent {
  id: string; title: string; url: string; startsAt: string; endsAt: string;
  venue: string; city: "West Monroe"; status: "scheduled" | "canceled";
}
function bound(body: string) {
  if (new TextEncoder().encode(body).length > 2 * 1024 * 1024) throw Error("oversized-feed");
}
const child = (node: Element, name: string) => Array.from(node.childNodes).filter((value): value is Element => value.nodeType === 1 && value.nodeName === name);
function one(node: Element, name: string) {
  const values = child(node, name);
  if (values.length !== 1) throw Error("ambiguous-field");
  return (values[0].textContent ?? "").trim();
}
export function globalVoicesArticle(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "globalvoices.org" || url.port || url.username || url.password ||
      url.search || !/^\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9-]+\/$/.test(url.pathname) || /[\s\\]/.test(value)) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}
export function parseGlobalVoices(body: string, now: number): ExpansionNews[] {
  bound(body);
  if (!Number.isFinite(now) || /<!DOCTYPE|<!ENTITY/i.test(body) || (body.match(/</g)?.length ?? 0) > 50_000) throw Error("unsafe-xml");
  const doc = new DOMParser({ onError: () => { throw Error("malformed-xml"); } }).parseFromString(body, "application/xml");
  const root = doc.documentElement;
  if (!root || root.nodeName !== "rss" || child(root, "channel").length !== 1) throw Error("unsupported-feed");
  const items = child(child(root, "channel")[0], "item"), seen = new Map<string, ExpansionNews>();
  if (items.length > 100) throw Error("too-many-items");
  for (const item of items) {
    let row: ExpansionNews;
    try {
      const title = one(item, "title"), url = globalVoicesArticle(one(item, "link"));
      const author = one(item, "dc:creator"), publishedAt = nasaPublicationDate(one(item, "pubDate"));
      if (!plain(title, 300) || !plain(author, 200) || !url || !publishedAt || Date.parse(publishedAt) > now) continue;
      const categories = child(item, "category").map(value => (value.textContent ?? "").trim().toLowerCase());
      row = { id: url, title, url, author, publishedAt,
        topics: ["world", ...(categories.includes("technology") ? ["technology"] : []), "discovery"],
        format: categories.includes("opinion") || categories.includes("commentary") || categories.includes("the bridge") ? "opinion" : "unclassified" };
    } catch { continue; }
    const previous = seen.get(row.id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(row)) throw Error("conflicting-article");
    seen.set(row.id, row);
  }
  if (items.length && !seen.size) throw Error("no-valid-news");
  return [...seen.values()].filter(row => now - Date.parse(row.publishedAt) < 7 * 86_400_000)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 20);
}

const chicago = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
/** Match both possible modern Chicago offsets; reject DST gaps and repeated hours. */
export function communityInstant(value: string, parameter = ""): string | null {
  const utc = /^\d{8}T\d{6}Z$/.test(value);
  if (!utc && (parameter !== "TZID=America/Chicago" || !/^\d{8}T\d{6}$/.test(value))) return null;
  if (utc && parameter) return null;
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}.000Z`;
  if (!instant(iso)) return null;
  if (utc) return iso;
  const wanted = value.replace("T", ""), candidates = [5, 6].map(offset => Date.parse(iso) + offset * 3_600_000).filter(at => {
    const parts = Object.fromEntries(chicago.formatToParts(at).map(part => [part.type, part.value]));
    return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}` === wanted;
  });
  return candidates.length === 1 ? new Date(candidates[0]).toISOString() : null;
}
const unescapeIcs = (value: string) => value.replace(/\\[nN]/g, " ").replace(/\\([,;\\])/g, "$1").trim();
export function parseWestMonroe(body: string, now: number): { items: CommunityEvent[]; needsReview: number } {
  bound(body);
  const lines = body.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  if (!Number.isFinite(now) || lines.length > 20_000 || lines[0] !== "BEGIN:VCALENDAR" || lines.filter(Boolean).at(-1) !== "END:VCALENDAR") throw Error("invalid-calendar");
  let fields: Map<string, { value: string; parameter: string }> | null = null, bad = false, count = 0, needsReview = 0;
  const seen = new Map<string, CommunityEvent>();
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      if (fields || ++count > 500) throw Error("invalid-events");
      fields = new Map(); bad = false; continue;
    }
    if (line === "END:VEVENT") {
      if (!fields) throw Error("unmatched-event");
      const get = (key: string) => fields!.get(key)?.value ?? "";
      const start = fields.get("DTSTART"), end = fields.get("DTEND");
      const startsAt = start && communityInstant(start.value, start.parameter), endsAt = end && communityInstant(end.value, end.parameter);
      const id = get("UID"), title = get("SUMMARY"), venue = get("LOCATION"), status = get("STATUS");
      const details = get("DESCRIPTION").match(/(?:^|\s)(https:\/\/www\.cityofwestmonroe\.com\/calendar\.aspx\?EID=\d+|\/calendar\.aspx\?EID=\d+)(?=\s|$)/i)?.[1];
      // Multi-day timed spans can hide nightly hours. All-day/recurring/unknown venues need curation.
      if (bad || !plain(id, 300) || !plain(title, 300) || !plain(venue, 300) || !/\bWest Monroe\s+LA\s+7129[12]\b/i.test(venue) ||
        !startsAt || !endsAt || Date.parse(endsAt) <= Date.parse(startsAt) || Date.parse(endsAt) - Date.parse(startsAt) > 86_400_000 || !details ||
        /\b(?:offices?|city hall)\b.*\bclos/i.test(title) || status && !["CONFIRMED", "CANCELLED"].includes(status)) {
        needsReview++; fields = null; continue;
      }
      const row: CommunityEvent = { id, title, venue, city: "West Monroe", url: new URL(details, "https://www.cityofwestmonroe.com").href,
        startsAt, endsAt, status: status === "CANCELLED" ? "canceled" : "scheduled" };
      const previous = seen.get(id);
      if (previous && JSON.stringify(previous) !== JSON.stringify(row)) throw Error("conflicting-event");
      seen.set(id, row); fields = null; continue;
    }
    if (!fields || !line) continue;
    const colon = line.indexOf(":"), property = line.slice(0, colon), [key, ...parameters] = property.split(";");
    if (colon < 1 || /^(BEGIN|END|RRULE|RDATE|EXDATE|RECURRENCE-ID)$/.test(key) || fields.has(key)) { bad = true; continue; }
    fields.set(key, { value: unescapeIcs(line.slice(colon + 1)), parameter: parameters.join(";") });
  }
  if (fields) throw Error("unterminated-event");
  return { items: [...seen.values()].filter(row => Date.parse(row.endsAt) > now && Date.parse(row.startsAt) < now + 60 * 86_400_000)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)).slice(0, 30), needsReview };
}
