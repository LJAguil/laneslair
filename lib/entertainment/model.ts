export const MEDIA = ["movie", "show", "game"] as const;
export const STATUSES = ["planned", "in_progress", "finished", "dropped"] as const;
export type Media = typeof MEDIA[number];
export type Status = typeof STATUSES[number];
export const statusLabels: Record<Status, string> = { planned: "Planned", in_progress: "In progress", finished: "Finished", dropped: "Dropped" };
export interface EntertainmentInput {
  title: string; media: Media; status: Status; tags: string[]; priority: number;
  platform: string; minutes: number | null; note: string;
  season: number | null; episode: number | null; progress: string; archived: boolean;
}
export interface EntertainmentItem extends EntertainmentInput { id: string; user_id: string; }
export const emptyInput: EntertainmentInput = { title: "", media: "movie", status: "planned", tags: [], priority: 1, platform: "", minutes: null, note: "", season: null, episode: null, progress: "", archived: false };
export function normalize(input: EntertainmentInput): EntertainmentInput {
  const title = input.title.trim();
  if (!title || title.length > 200) throw new Error("Enter a title of 1–200 characters.");
  if (!MEDIA.includes(input.media) || !STATUSES.includes(input.status)) throw new Error("Choose a valid type and status.");
  if (![0, 1, 2].includes(input.priority)) throw new Error("Choose a valid priority.");
  for (const n of [input.minutes, input.season, input.episode]) if (n !== null && (!Number.isInteger(n) || n < 1 || n > 10000)) throw new Error("Use whole numbers from 1 to 10000, or leave blank.");
  const tags = [...new Set(input.tags.map(t => t.trim().toLowerCase()).filter(Boolean))];
  if (tags.length > 12 || tags.some(t => t.length > 40)) throw new Error("Use up to 12 tags, each under 41 characters.");
  if (input.platform.length > 120 || input.note.length > 1000 || input.progress.length > 500) throw new Error("Shorten the service, note or progress text.");
  return { title, media: input.media, status: input.status, tags, priority: input.priority, platform: input.platform.trim(), minutes: input.minutes, note: input.note.trim(), season: input.media === "show" ? input.season : null, episode: input.media === "show" ? input.episode : null, progress: input.media === "game" ? input.progress.trim() : "", archived: input.archived };
}
export function filterLibrary(items: readonly EntertainmentItem[], media: string, status: string, archived: boolean) {
  return items.filter(i => i.archived === archived && (media === "all" || i.media === media) && (status === "all" || (status === "unfinished" ? ["planned", "in_progress"].includes(i.status) : i.status === status)));
}
export function groupLibrary(items: readonly EntertainmentItem[]) {
  return MEDIA.map(media => ({ media, items: items.filter(item => item.media === media).sort((a, b) => Number(b.status === "in_progress") - Number(a.status === "in_progress") || a.title.localeCompare(b.title) || a.id.localeCompare(b.id)) })).filter(group => group.items.length);
}
/** Explicit inputs only; a future Jarvis adapter can implement the same contract. */
export interface RecommendationRequest { items: readonly EntertainmentItem[]; preferences: { media: Media | "all"; minutes: number | null; tags: string[]; favor: "priority" | "continue" | "variety"; allowUnknown: boolean }; }
export interface Suggestion { item: EntertainmentItem; reasons: string[]; score: number; }
export type Recommender = (request: RecommendationRequest) => Suggestion[];
export const recommend: Recommender = ({ items, preferences: p }) => {
  const tags = p.tags.map(t => t.trim().toLowerCase()).filter(Boolean);
  return items.filter(i => !i.archived && ["planned", "in_progress"].includes(i.status) && (p.media === "all" || i.media === p.media)
    && (p.minutes === null || (i.minutes === null ? p.allowUnknown : i.minutes <= p.minutes)) && (!tags.length || tags.some(t => i.tags.includes(t))))
    .map(item => {
      const reasons = [item.status === "in_progress" ? "Already in progress" : "Ready to start"];
      if (item.minutes !== null) reasons.push(`${item.minutes} min estimated session`); else reasons.push(p.minutes === null ? "Session length unknown" : "Session length unknown — may exceed your time limit");
      if (tags.length) reasons.push(`Matches: ${tags.filter(t => item.tags.includes(t)).join(", ")}`);
      if (item.priority === 2) reasons.push("High priority");
      return { item, reasons, score: p.favor === "variety" ? 0 : p.favor === "continue" ? (item.status === "in_progress" ? 10 : 0) + item.priority : item.priority * 10 + (item.status === "in_progress" ? 1 : 0) };
    }).sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title) || a.item.id.localeCompare(b.item.id));
};
export function randomSuggestion(items: readonly Suggestion[], random = Math.random): Suggestion | undefined {
  return items.length ? items[Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)))] : undefined;
}
