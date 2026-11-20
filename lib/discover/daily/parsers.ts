import { DOMParser, type Element } from "@xmldom/xmldom";
import { parseNasaFeed, nasaPublicationDate } from "../feeds/nasa";
import { ATHLETICS_DETAILS, DAILY_BODY_BYTES, DAILY_ITEMS_PER_SOURCE, dailyArticleUrl, type DailySourceId } from "./policy";

export interface DailyNews {
  kind: "news"; id: string; title: string; url: string; publishedAt: string; author: string | null;
  topics: string[]; format: "institutional-update" | "opinion" | "unclassified";
}
export interface DailyEvent {
  kind: "event"; id: string; title: string; url: string; startsAt: string; endsAt: string | null;
  venue: "Ruston High School"; city: "Ruston"; status: "scheduled" | "canceled";
}
export type DailyRecord = DailyNews | DailyEvent;
export function plain(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max && !/[<>\u0000-\u001f\u007f]/.test(value);
}
export function instant(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function children(element: Element, name: string): Element[] {
  return Array.from(element.childNodes).filter((node): node is Element => node.nodeType === 1 && (node as Element).nodeName === name);
}
function one(element: Element, name: string): string {
  const nodes = children(element, name);
  if (nodes.length !== 1) throw Error("ambiguous-field");
  return (nodes[0].textContent ?? "").trim();
}
function parseIlluminator(xml: string, now: number): DailyNews[] {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || (xml.match(/</g)?.length ?? 0) > 50_000) throw Error("unsafe-xml");
  const doc = new DOMParser({ onError: () => { throw Error("malformed-xml"); } }).parseFromString(xml, "application/xml");
  const root = doc.documentElement;
  if (!root || root.nodeName !== "rss" || children(root, "channel").length !== 1) throw Error("unsupported-feed");
  const items = children(children(root, "channel")[0], "item");
  if (items.length > 100) throw Error("too-many-items");
  const records: DailyNews[] = [];
  for (const item of items) {
    try {
      const title = one(item, "title"), url = dailyArticleUrl("illuminator-daily", one(item, "link"));
      const publishedAt = nasaPublicationDate(one(item, "pubDate"));
      const author = one(item, "dc:creator");
      if (!plain(title, 300) || !url || !publishedAt || Date.parse(publishedAt) > now || !plain(author, 200)) continue;
      const categories = children(item, "category").map(node => (node.textContent ?? "").trim().toLowerCase());
      records.push({ kind: "news", id: url, title, url, publishedAt, author,
        topics: [categories.includes("dc bureau") ? "national" : "louisiana", "discovery"],
        format: categories.includes("commentary") || categories.includes("opinion") ? "opinion" : "unclassified" });
    } catch { /* An incomplete item is omitted, never guessed from its article body. */ }
  }
  if (items.length && !records.length) throw Error("no-valid-news");
  return records;
}
function icsInstant(value: string | undefined): string | null {
  if (!value || !/^\d{8}T\d{6}Z$/.test(value)) return null;
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}.000Z`;
  return instant(iso) ? iso : null;
}
function parseAthletics(body: string): DailyEvent[] {
  const lines = body.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  if (lines.length > 20_000 || lines[0] !== "BEGIN:VCALENDAR" || lines.filter(Boolean).at(-1) !== "END:VCALENDAR") throw Error("invalid-calendar");
  const result: DailyEvent[] = [];
  let event: Map<string, string> | null = null, bad = false, count = 0, homeCount = 0;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { if (event) throw Error("nested-event"); event = new Map(); bad = false; if (++count > 500) throw Error("too-many-events"); continue; }
    if (line === "END:VEVENT") {
      if (!event) throw Error("unmatched-event");
      const start = icsInstant(event.get("DTSTART")), end = icsInstant(event.get("DTEND"));
      const id = event.get("UID"), title = event.get("SUMMARY"), status = event.get("STATUS");
      if (event.get("LOCATION") === "Ruston High School") homeCount++;
      if (!bad && event.get("LOCATION") === "Ruston High School" && plain(id, 300) && plain(title, 300) && start &&
        (!event.has("DTEND") || end && Date.parse(end) > Date.parse(start)) && (!status || ["CONFIRMED", "CANCELLED"].includes(status))) {
        result.push({ kind: "event", id, title, url: ATHLETICS_DETAILS, startsAt: start, endsAt: end,
          venue: "Ruston High School", city: "Ruston", status: status === "CANCELLED" ? "canceled" : "scheduled" });
      }
      event = null; continue;
    }
    if (!event || !line) continue;
    const colon = line.indexOf(":"), key = line.slice(0, colon);
    if (colon < 1 || key.includes(";") || /^(BEGIN|END|RRULE|RDATE|EXDATE|RECURRENCE-ID)$/.test(key) || event.has(key)) { bad = true; continue; }
    event.set(key, line.slice(colon + 1).replace(/\\[nN]/g, " ").replace(/\\([,;\\])/g, "$1"));
  }
  if (event) throw Error("unterminated-event");
  if (homeCount && !result.length) throw Error("unsupported-home-schedule");
  return result;
}
export function parseDailyFeed(id: DailySourceId, body: string, now: number): DailyRecord[] {
  if (new TextEncoder().encode(body).length > DAILY_BODY_BYTES || !Number.isFinite(now)) throw Error("invalid-input");
  const records: DailyRecord[] = id === "ruston-athletics" ? parseAthletics(body) : id === "illuminator-daily" ? parseIlluminator(body, now)
    : parseNasaFeed(body, now).candidates.map(item => ({ kind: "news", id: item.url, title: item.title, url: item.url,
      publishedAt: item.publishedAt, author: item.author, topics: ["science", "discovery"], format: "institutional-update" }));
  const seen = new Map<string, DailyRecord>();
  for (const record of records) {
    const previous = seen.get(record.id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(record)) throw Error("conflicting-identity");
    seen.set(record.id, record);
  }
  return [...seen.values()].filter(item => item.kind === "news" ? now - Date.parse(item.publishedAt) < 7 * 86_400_000
    : Date.parse(item.endsAt ?? item.startsAt) > now - 86_400_000 && Date.parse(item.startsAt) < now + 60 * 86_400_000)
    .sort((a, b) => a.kind === "news" && b.kind === "news" ? Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
      : a.kind === "event" && b.kind === "event" ? Date.parse(a.startsAt) - Date.parse(b.startsAt) : 0).slice(0, DAILY_ITEMS_PER_SOURCE);
}
