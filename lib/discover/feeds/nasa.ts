import { DOMParser, type Element, type Node } from "@xmldom/xmldom";
import type { FeedFailure, NasaCandidate, NasaParseResult, RejectedNasaItem, RejectionReason } from "./types";
import { NASA_LIMITS, nasaArticleUrl } from "./policy";
export { NASA_FEED_URL, NASA_LIMITS, nasaArticleUrl } from "./policy";

const DC = "http://purl.org/dc/elements/1.1/";
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const SUMMARY = Object.freeze({ kind: "unavailable" as const, reason: "Feed metadata only; open the publisher's article." });

export class NasaFeedError extends Error {
  constructor(readonly code: FeedFailure) { super(code); this.name = "NasaFeedError"; }
}

export function validFeedClock(now: number): boolean {
  return Number.isFinite(now) && Number.isFinite(new Date(now).getTime());
}

/** Caller supplies only currently eligible curated article URLs. No summaries or
 * editorial timestamps are copied into a feed record or renewed here.
 */
export function suppressCuratedNasaCoverage(candidates: readonly NasaCandidate[], eligibleCuratedArticleUrls: readonly string[]) {
  const curated = new Set(eligibleCuratedArticleUrls.map(nasaArticleUrl).filter((url): url is string => url !== null));
  const visible = candidates.filter(candidate => !curated.has(candidate.url));
  return { candidates: visible, suppressedCount: candidates.length - visible.length };
}

/** Explicit-zone RFC 822-style RSS dates only; reject normalization/ambiguous zones. */
export function nasaPublicationDate(value: string): string | null {
  if (value.length > 64) return null;
  const match = /^(?:(Sun|Mon|Tue|Wed|Thu|Fri|Sat), )?(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d{2}):(\d{2}):(\d{2}) (GMT|UTC|UT|[+-]\d{4})$/.exec(value);
  if (!match) return null;
  const [, weekday, dayText, monthText, yearText, hourText, minuteText, secondText, zone] = match;
  const year = Number(yearText), month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(monthText);
  const day = Number(dayText), hour = Number(hourText), minute = Number(minuteText), second = Number(secondText);
  if (year < 1970 || hour > 23 || minute > 59 || second > 59) return null;
  const local = new Date(Date.UTC(year, month, day, hour, minute, second));
  if (local.getUTCMonth() !== month || local.getUTCDate() !== day || (weekday && ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][local.getUTCDay()] !== weekday)) return null;
  const offsetHour = /^[+-]/.test(zone) ? Number(zone.slice(1, 3)) : 0;
  const offsetMinute = /^[+-]/.test(zone) ? Number(zone.slice(3)) : 0;
  if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) return null;
  const offset = (offsetHour * 60 + offsetMinute) * (zone.startsWith("-") ? -1 : 1);
  return new Date(local.getTime() - offset * 60_000).toISOString();
}

function children(node: Node): Element[] {
  const found: Element[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) if (child.nodeType === 1) found.push(child as Element);
  return found;
}
function named(node: Node, name: string, namespace = ""): Element[] {
  return children(node).filter(child => child.localName === name && (child.namespaceURI ?? "") === namespace);
}

class ItemError extends Error {
  constructor(readonly reason: RejectionReason) { super(reason); }
}
function field(node: Element, name: string, max: number, namespace = "", optional = false): string | null {
  const matches = named(node, name, namespace);
  if (matches.length > 1) throw new ItemError("ambiguous-field");
  if (matches.length === 0) { if (optional) return null; throw new ItemError("missing-field"); }
  if (children(matches[0]).length) throw new ItemError("invalid-field");
  const text = (matches[0].textContent ?? "").trim();
  if (!text) { if (optional) return null; throw new ItemError("missing-field"); }
  if (text.length > max || CONTROL.test(text)) throw new ItemError("invalid-field");
  return text;
}
interface ParsedRow { index: number; guid: string | null; url: string | null; candidate?: NasaCandidate; reason?: RejectionReason }
function parseRow(item: Element, index: number, now: number): ParsedRow {
  const row: ParsedRow = { index, guid: null, url: null };
  // Read identities independently, so an incomplete sibling cannot hide a conflict.
  let identityError: ItemError | undefined;
  try { row.guid = field(item, "guid", NASA_LIMITS.guid); } catch (error) { identityError = error as ItemError; }
  try {
    const link = field(item, "link", NASA_LIMITS.url)!;
    row.url = nasaArticleUrl(link);
    if (!row.url) throw new ItemError("invalid-url");
  } catch (error) { identityError ??= error as ItemError; }
  try {
    if (identityError) throw identityError;
    const title = field(item, "title", NASA_LIMITS.title)!;
    const dateText = field(item, "pubDate", 64)!;
    const publishedAt = nasaPublicationDate(dateText);
    if (!publishedAt) throw new ItemError("invalid-date");
    if (Date.parse(publishedAt) > now) throw new ItemError("future-date");
    const author = field(item, "creator", NASA_LIMITS.author, DC, true);
    row.candidate = { sourceId: "nasa", sourceItemIds: [row.guid!], title, url: row.url!, publishedAt, author, format: "institutional-update", access: "unknown", summary: SUMMARY };
  } catch (error) {
    if (!(error instanceof ItemError)) throw error;
    row.reason = error.reason;
  }
  return row;
}

/** Parses bounded XML, never HTML/article content. Throws only sanitized feed errors. */
export function parseNasaFeed(xml: string, now: number): NasaParseResult {
  if (!validFeedClock(now)) throw new NasaFeedError("invalid-clock");
  if (new TextEncoder().encode(xml).byteLength > NASA_LIMITS.bytes) throw new NasaFeedError("too-large");
  // A conservative declaration guard, not an XML parser. Reject even literal tokens
  // inside comments/CDATA rather than attempting to interpret any DTD or entity declaration.
  if (/<!\s*(DOCTYPE|ENTITY)\b/i.test(xml)) throw new NasaFeedError("unsafe-xml");
  let root: Element;
  try {
    const document = new DOMParser({ onError: () => { throw new Error("Malformed XML"); } }).parseFromString(xml, "application/xml");
    root = document.documentElement!;
    if (!root) throw new Error("Missing root");
  } catch { throw new NasaFeedError("malformed-xml"); }
  if (root.localName !== "rss" || root.namespaceURI || root.getAttribute("version") !== "2.0") throw new NasaFeedError("unsupported-feed");
  const stack: { node: Node; depth: number }[] = [{ node: root, depth: 1 }];
  let nodeCount = 0;
  while (stack.length) {
    const { node, depth } = stack.pop()!;
    if (++nodeCount > NASA_LIMITS.nodes || depth > NASA_LIMITS.depth) throw new NasaFeedError("complex-xml");
    for (let child = node.firstChild; child; child = child.nextSibling) stack.push({ node: child, depth: depth + 1 });
  }
  const channels = named(root, "channel");
  if (channels.length !== 1) throw new NasaFeedError("unsupported-feed");
  const items = named(channels[0], "item");
  if (items.length > NASA_LIMITS.items) throw new NasaFeedError("too-many-items");
  const rows = items.map((item, index) => parseRow(item, index, now));
  // At most 50 items: pairwise grouping handles transitive GUID/URL conflicts simply.
  const groups: ParsedRow[][] = [];
  for (const row of rows) {
    const matches = groups.filter(group => group.some(other => (row.guid !== null && row.guid === other.guid) || (row.url !== null && row.url === other.url)));
    if (!matches.length) groups.push([row]);
    else {
      const merged = [row, ...matches.flat()];
      for (const group of matches) groups.splice(groups.indexOf(group), 1);
      groups.push(merged);
    }
  }
  const candidates: NasaCandidate[] = [], rejected: RejectedNasaItem[] = [];
  let duplicateCount = 0;
  for (const group of groups) {
    const signatures = new Set(group.filter(row => row.candidate).map(row => {
      const { title, url, publishedAt, author } = row.candidate!;
      return JSON.stringify([title, url, publishedAt, author]);
    }));
    if (group.some(row => row.reason) || signatures.size !== 1) {
      for (const row of group) rejected.push({ index: row.index, reason: row.reason ?? "duplicate-conflict" });
      continue;
    }
    duplicateCount += group.length - 1;
    candidates.push({ ...group[0].candidate!, sourceItemIds: [...new Set(group.map(row => row.guid!))].sort() });
  }
  candidates.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.url.localeCompare(b.url));
  rejected.sort((a, b) => a.index - b.index);
  return { candidates: candidates.slice(0, NASA_LIMITS.output), rejected, inputCount: items.length, duplicateCount, omittedCount: Math.max(0, candidates.length - NASA_LIMITS.output) };
}
