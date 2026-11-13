"use client";

import { useId, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, MapPin } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { curatedCatalog, catalogCheckedAt } from "@/lib/discover/curated";
import { discoverSources } from "@/lib/discover/sources";
import { discoverDefaults, type DealItem, type DiscoverItem, type DiscoverSource, type EventItem } from "@/lib/discover/types";
import { bookmarkKey, catalogEntries, displayInstant, displayWindow, newsFormatLabels, publicationLabel, safeLink, type CatalogEntry } from "@/lib/discover/presentation";
import { discoverClockSnapshot, discoverServerClockSnapshot, subscribeDiscoverClock } from "@/lib/discover/clock";
import { unavailableFeed, type FeedAvailability } from "@/lib/discover/feed-availability";
import { FEED_FRESHNESS_MS } from "@/lib/discover/feeds/policy";

type Tab = DiscoverItem["kind"];
const tabs: { id: Tab; label: string }[] = [{ id: "event", label: "Things to do" }, { id: "news", label: "News" }, { id: "deal", label: "Food deals" }];
const topicLabels: Record<string, string> = { louisiana: "Louisiana / local", technology: "Technology", science: "Science", national: "National", world: "World", discovery: "Discovery mix" };
const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-muted hover:border-line-strong hover:text-fg";

export function DiscoverView({ items = curatedCatalog, feed = unavailableFeed, curationNote }: { items?: readonly DiscoverItem[]; feed?: FeedAvailability; curationNote?: string }) {
  const now = useSyncExternalStore(subscribeDiscoverClock, discoverClockSnapshot, discoverServerClockSnapshot);
  return <DiscoverScreen items={items} sources={discoverSources} feed={feed} now={now} curationNote={curationNote} />;
}

/** Public-content-only surface; no global store, auth, personal records or fetches. */
export function DiscoverScreen({ items, sources, now, initialTab = "event", feed = unavailableFeed, curationNote }: {
  items: readonly DiscoverItem[]; sources: readonly DiscoverSource[]; now: number | null; initialTab?: Tab; feed?: FeedAvailability; curationNote?: string;
}) {
  const id = useId();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [travel, setTravel] = useState<"nearby" | "trip">("nearby");
  const [budget, setBudget] = useState("all");
  const [topics, setTopics] = useState<string[]>([...discoverDefaults.newsTopics]);
  const [saved, setSaved] = useState<string[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [newsLimit, setNewsLimit] = useState(4);
  const entries = now === null ? [] : catalogEntries(items, sources, now);
  const toggleSaved = (itemId: string) => setSaved(previous => previous.includes(itemId) ? previous.filter(value => value !== itemId) : [...previous, itemId]);
  const matches = (item: DiscoverItem) => {
    if (item.kind !== tab || (savedOnly && !saved.includes(bookmarkKey(item)))) return false;
    if (item.kind === "event") return item.travel === travel && (budget === "all" || item.price.kind === "free" || (budget === "budget" && item.price.kind === "known" && item.price.amount <= 20));
    if (item.kind === "news") return item.topics.some(topic => topics.includes(topic));
    return true;
  };
  const filtered = entries.filter(entry => matches(entry.item));
  const main = filtered.filter(entry => entry.assessment.placement === "main");
  main.sort((a, b) => {
    const date = (item: DiscoverItem) => item.kind === "news" ? item.publishedAt ?? item.publishedOn ?? "" : item.window ? item.window.kind === "dates" ? item.window.startDate : item.window.startsAt : "";
    const timestamp = (item: DiscoverItem) => Date.parse(date(item)) || 0;
    return tab === "news" ? timestamp(b.item) - timestamp(a.item) : timestamp(a.item) - timestamp(b.item);
  });
  const national = filtered.filter(entry => entry.assessment.placement === "national-check-local");
  const review = filtered.filter(entry => entry.assessment.placement === "review-only");
  const archivedSaved = filtered.filter(entry => entry.assessment.placement === "archive" && saved.includes(bookmarkKey(entry.item)));
  const visible = tab === "news" ? main.slice(0, newsLimit) : main;
  const sourceFor = (item: DiscoverItem) => sources.find(source => source.id === item.evidence.sourceId)!;
  const cards = (list: CatalogEntry[]) => list.map(entry => <DiscoverItemCard key={bookmarkKey(entry.item)} entry={entry} source={sourceFor(entry.item)} saved={saved.includes(bookmarkKey(entry.item))} onSave={() => toggleSaved(bookmarkKey(entry.item))} />);
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : null;
    if (next === null) return;
    event.preventDefault(); setTab(tabs[next].id);
    (event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next])?.focus();
  };

  return <div className="mx-auto max-w-3xl">
    <PageHeader title="Discover" description="A little more to your day: nearby plans, interesting reads, and food worth checking out."
      actions={<span className="inline-flex items-center gap-1.5 text-sm text-muted"><MapPin className="h-4 w-4" aria-hidden="true" />Ruston & Lincoln Parish</span>} />
    <div className="mb-5 rounded-xl border border-line bg-panel px-4 py-3 text-sm text-muted">
      <p>{curationNote ?? <>Curated source batch checked {displayInstant(catalogCheckedAt)}. Feed checks are labeled separately on stories.</>}</p>
      <p className="mt-1 text-xs text-subtle">Updates are manual. Older picks move out of current results until rechecked. Monroe is included in nearby coverage as picks become available; trips stay separate.</p>
    </div>
    <div role="tablist" aria-label="Discover sections" className="mb-5 grid grid-cols-3 gap-1 rounded-xl border border-line bg-panel p-1">
      {tabs.map((option, index) => <button key={option.id} type="button" role="tab" id={`${id}-tab-${option.id}`} aria-controls={`${id}-panel`} aria-selected={tab === option.id} tabIndex={tab === option.id ? 0 : -1}
        onKeyDown={event => onTabKey(event, index)} onClick={() => setTab(option.id)}
        className={cn("min-h-11 rounded-lg px-1 py-2 text-sm font-medium", tab === option.id ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-hover")}>{option.label}</button>)}
    </div>
    <section role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab}`} tabIndex={0} aria-busy={now === null} className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {tab === "event" && <>
          <div role="group" aria-label="Travel range" className="flex flex-wrap gap-2">{(["nearby", "trip"] as const).map(value => <button key={value} type="button" aria-pressed={travel === value} onClick={() => setTravel(value)} className={cn(actionClass, travel === value && "border-accent/40 bg-accent-soft text-fg")}>{value === "nearby" ? "Nearby" : "Weekend trips"}</button>)}</div>
          <label className="text-sm text-muted">Price <select value={budget} onChange={event => setBudget(event.target.value)} className="ml-1 min-h-11 max-w-full rounded-lg border border-line bg-panel px-2 text-fg"><option value="all">All prices</option><option value="budget">Free / $20 or less</option><option value="free">Free</option></select></label>
        </>}
        <button type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly(value => !value)} className={cn(actionClass, savedOnly && "border-accent/40 bg-accent-soft text-fg")}><Bookmark className="h-4 w-4" aria-hidden="true" />Saved this visit</button>
      </div>
      {tab === "news" && <FeedNotice feed={feed} now={now} />}
      {tab === "news" && <details className="rounded-xl border border-line bg-panel p-3">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">News interests · {topics.length} selected</summary>
        <fieldset className="mt-2"><legend className="text-xs text-subtle">Choose what to include. Changes last for this visit; nothing is inferred from your other app activity.</legend>
          <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">{Object.entries(topicLabels).map(([value, label]) => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-hover"><input type="checkbox" checked={topics.includes(value)} onChange={event => { setTopics(previous => event.target.checked ? [...previous, value] : previous.filter(topic => topic !== value)); setNewsLimit(4); }} className="h-4 w-4 accent-accent" /><span className="text-sm">{label}</span></label>)}</div>
        </fieldset>
      </details>}
      <p className="text-xs text-subtle">{tab === "event" ? "Mostly free or under $20, with a few higher-cost options. Unknown prices stay labeled; check admission before going." : tab === "news" ? "A small starting mix, not comprehensive coverage. Original summaries link you to the publisher’s full story." : "A national promotion does not confirm Ruston participation. Check the selected restaurant and all offer terms before ordering."} Bookmarks last until you leave or reload this page.</p>
      {now === null ? <p role="status" className="py-8 text-center text-sm text-muted">Checking dates and freshness…</p> : <>
        {visible.length ? <div className="space-y-4">{cards(visible)}</div> : <EmptyState title={savedOnly ? "No saved picks in this view" : tab === "deal" ? "No confirmed nearby deals right now" : tab === "news" ? "No current stories for these interests" : travel === "trip" ? "No checked weekend trips yet" : "No current outings in this view"} description="Try another filter or browse the sources below. Picks needing a fresh check are kept separate." />}
        {tab === "news" && main.length > newsLimit && <button type="button" className={cn(actionClass, "w-full")} onClick={() => setNewsLimit(value => value + 4)}>Load more stories</button>}
        {national.length > 0 && <section aria-label="National offers"><h2 className="mb-2 text-base font-semibold">National offers · check local participation</h2><p className="mb-3 text-sm text-muted">Public terms have been checked; availability at a nearby restaurant is still unknown.</p><div className="space-y-4">{cards(national)}</div></section>}
        {review.length > 0 && <details className="rounded-xl border border-line p-4"><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Needs a check · {review.length} {review.length === 1 ? "pick" : "picks"}</summary><p className="mb-4 text-xs text-subtle">These are outside current recommendations. Dates, terms, source changes or freshness still need confirmation.</p><div className="space-y-4">{cards(review)}</div></details>}
        {archivedSaved.length > 0 && <section aria-label="Saved updates"><h2 className="mb-3 font-semibold">Updates to saved picks</h2><div className="space-y-4">{cards(archivedSaved)}</div></section>}
      </>}
      <details className="rounded-xl border border-line p-4"><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Browse official sources</summary><p className="mb-3 text-xs text-subtle">These links open source sites. They do not refresh this catalog.</p><ul className="space-y-1">{sources.filter(source => tab === "event" ? ["organizer", "official-calendar"].includes(source.authority) : tab === "news" ? source.authority === "publisher" && source.access !== "key-required" : source.authority === "restaurant").map(source => <li key={source.id}><Outbound href={source.url}>{source.name}</Outbound></li>)}</ul></details>
    </section>
  </div>;
}

function FeedNotice({ feed, now }: { feed: FeedAvailability; now: number | null }) {
  const text = feed.status === "unavailable"
    ? "Additional NASA stories are unavailable. Curated picks are shown below when current."
    : now === null ? "Checking NASA feed freshness…"
    : now < Date.parse(feed.checkedAt) || now - Date.parse(feed.checkedAt) >= FEED_FRESHNESS_MS
      ? "NASA feed needs a fresh check. Older stories stay outside current recommendations."
      : feed.itemCount === 0 ? "No additional NASA stories in this snapshot."
      : `NASA feed checked ${displayInstant(feed.checkedAt)}. Stories are not editorially checked.`;
  return <p role="status" aria-live="polite" className="rounded-xl border border-line bg-panel p-3 text-sm text-muted [overflow-wrap:anywhere]">{text}</p>;
}

function Outbound({ href, children }: { href: string; children: ReactNode }) {
  const safe = safeLink(href);
  return safe ? <a href={safe} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 py-2 text-sm font-medium text-accent-strong underline decoration-accent/30 underline-offset-4 [overflow-wrap:anywhere]">{children}<ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a> : <span>{children}</span>;
}

function eventPrice(item: EventItem): string {
  return item.price.kind === "free" ? "Free admission" : item.price.kind === "unknown" ? "Price unknown" : `${new Intl.NumberFormat("en-US", { style: "currency", currency: item.price.currency, maximumFractionDigits: 2 }).format(item.price.amount)} · ${item.price.note}`;
}

function DealRequirements({ item }: { item: DealItem }) {
  return <div className="mt-3 space-y-2 text-sm text-muted">
    <p className="font-medium text-fg">{item.window ? displayWindow(item.window) : "Valid dates not confirmed"}</p>
    <p>{item.participation.kind === "confirmed-nearby" ? `Nearby participation checked: ${item.participation.locations.join("; ")}` : "National promotion · nearby participation unknown"}</p>
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs"><dt>Purchase</dt><dd>{item.requirements.purchase}</dd><dt>App / account</dt><dd>{item.requirements.app ? "App required" : "App not required"} · {item.requirements.account ? "Account required" : "Account not required"}</dd><dt>Coupon</dt><dd>{item.requirements.coupon ?? "No code recorded; check full terms"}</dd><dt>Redeem via</dt><dd>{item.requirements.channels.join(", ")}</dd></dl>
    <ul className="list-disc space-y-1 pl-4 text-xs">{item.requirements.exclusions.map(exclusion => <li key={exclusion}>{exclusion}</li>)}</ul>
    {item.requirements.reviewedAt === null && <p className="text-xs text-warning">Full redemption terms still need confirmation.</p>}
  </div>;
}

export function DiscoverItemCard({ entry, source, saved, onSave }: { entry: CatalogEntry; source: DiscoverSource; saved: boolean; onSave: () => void }) {
  const { item, assessment } = entry;
  const SaveIcon = saved ? BookmarkCheck : Bookmark;
  const stateLabel = { active: item.kind === "deal" || (item.kind === "event" && item.window.kind === "dates") ? "Within listed dates" : "Happening now", upcoming: "Upcoming", current: "Current", stale: "Stale · recheck needed", "needs-confirmation": "Needs confirmation", canceled: "Canceled", postponed: "Postponed", withdrawn: "Withdrawn", expired: "Past its listing window", invalid: "Unavailable" }[assessment.state];
  const evidenceLabel = { "organizer-confirmed": "Organizer source checked", "official-listing": "Official listing checked", "publisher-reported": "Publisher source checked", "publisher-feed": "Publisher feed · not editorially checked", unverified: "Unverified" }[item.evidence.level];
  return <article className="min-w-0 rounded-2xl border border-line bg-panel p-4 sm:p-5 [overflow-wrap:anywhere]">
    <div className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 flex-wrap gap-1.5"><Badge tone={assessment.placement === "review-only" || assessment.placement === "archive" ? "warning" : "accent"}>{stateLabel}</Badge><Badge>{item.kind === "news" ? newsFormatLabels[item.format] : item.kind === "event" ? item.category : "Food offer"}</Badge></div>
      <button type="button" aria-pressed={saved} aria-label={`${saved ? "Unsave" : "Save"} ${item.title} for this visit`} onClick={onSave} className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line", saved ? "bg-accent-soft text-accent-strong" : "text-subtle hover:text-fg")}><SaveIcon className="h-5 w-5" aria-hidden="true" /></button>
    </div>
    <h3 className="mt-3 text-base font-semibold leading-snug">{item.title}</h3>
    {item.kind === "event" && <>
      <p className="mt-2 text-sm font-medium text-accent-strong">{displayWindow(item.window)}</p>
      <p className="mt-2 text-sm text-muted">{item.description}</p>
      <p className="mt-3 text-sm">{item.venue} · {item.city}</p>
      <p className="mt-1 text-sm font-medium">{eventPrice(item)}</p>
      <p className="mt-1 text-xs text-subtle">{item.travel === "trip" ? "Weekend trip" : "Nearby"} · {item.admission === "public" ? "Public event" : item.admission === "restricted" ? "Restricted admission · check eligibility" : "Admission requirements unknown"}</p>
    </>}
    {item.kind === "news" && <>
      <p className="mt-2 text-xs text-subtle">{source.name}{item.author ? ` · ${item.author}` : ""}</p>
      <p className="mt-1 text-xs text-subtle">Published {publicationLabel(item)}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted">{item.summary.kind === "original" ? item.summary.text : `Summary unavailable: ${item.summary.reason}`}</p>
      <p className="mt-2 text-xs text-subtle">{item.summary.kind === "original" ? "Original Discover summary · " : ""}{item.access === "paywall" ? "Publisher paywall" : item.access === "open" ? "Article opened without a paywall when checked" : "Article access unknown"}</p>
    </>}
    {item.kind === "deal" && <DealRequirements item={item} />}
    {assessment.errors.length > 0 && <p className="mt-2 text-xs text-warning">{assessment.errors.join(" ")}</p>}
    <div className="mt-4 border-t border-line pt-3">
      <p className="text-xs text-subtle">{evidenceLabel} · {source.name}</p>
      {item.evidence.level === "publisher-feed" ? <>
        <p className="mt-1 text-xs text-subtle">Feed checked: {displayInstant(item.evidence.representationCheckedAt)}</p>
        <p className="mt-1 text-xs text-subtle">Feed loaded: {displayInstant(item.evidence.fetchedAt)}</p>
      </> : <p className="mt-1 text-xs text-subtle">Last checked: {item.evidence.verifiedAt ? displayInstant(item.evidence.verifiedAt) : "Not verified"}</p>}
      <Outbound href={item.evidence.url}>{item.kind === "news" ? "Read article" : item.kind === "deal" ? "Check official offer" : "Event details"}</Outbound>
      {item.kind === "event" && item.registrationUrl && <div><Outbound href={item.registrationUrl}>Registration / tickets</Outbound></div>}
    </div>
  </article>;
}
