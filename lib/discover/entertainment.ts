import { emptyInput, normalize, type EntertainmentInput, type EntertainmentItem } from "../entertainment/model";
import type { EntertainmentRepository } from "../entertainment/repository";
import type { DiscoverTitle } from "./types";

export function titleKey(title: string, media: string): string {
  return `${media}:${title.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US")}`;
}
export function entertainmentDraft(pick: DiscoverTitle, sourceUrl: string): EntertainmentInput {
  const url = new URL(sourceUrl);
  if (url.protocol !== "https:" || url.username || url.password || sourceUrl.length > 700) throw Error("Invalid source link.");
  if (typeof pick.release !== "string" || pick.release.length > 180 || /[<>\u0000-\u001f]/.test(pick.release) ||
    typeof pick.platform !== "string" || /[<>\u0000-\u001f]/.test(pick.title + pick.platform) || pick.anime !== undefined && typeof pick.anime !== "boolean") throw Error("Invalid title metadata.");
  return normalize({ ...emptyInput, title: pick.title, media: pick.media, status: "planned", platform: pick.platform,
    tags: pick.anime ? ["anime", "discover"] : ["discover"], note: `${pick.release}\nFound in Discover: ${url.href}` });
}
type Phase = "idle" | "checking" | "ready" | "saving" | "saved" | "exists" | "error" | "expired";
export interface DiscoverLibraryState { phase: Phase; draft: EntertainmentInput | null; existing: Pick<EntertainmentItem, "id" | "archived"> | null; error: string }
/** One visit, one owner. No persistence, global store or private records outside Entertainment. */
export class DiscoverLibrarySession {
  private state: DiscoverLibraryState = { phase: "idle", draft: null, existing: null, error: "" };
  private listeners = new Set<() => void>();
  private generation = 0;
  private expired = false;
  private identities = new Map<string, string>();
  private id: string | null = null;
  constructor(private repo: EntertainmentRepository, private owner: string, private uuid: () => string) {}
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getSnapshot = () => this.state;
  private publish(state: DiscoverLibraryState) { this.state = state; this.listeners.forEach(fn => fn()); }
  activate() { this.expired = false; this.generation++; this.publish({ phase: "idle", draft: null, existing: null, error: "" }); }
  expire() { this.expired = true; this.generation++; this.identities.clear(); this.id = null; this.publish({ phase: "expired", draft: null, existing: null, error: "Your account changed. Reload before adding a title." }); }
  close() {
    if (this.expired || this.state.phase === "saving") return;
    this.generation++; this.publish({ phase: "idle", draft: null, existing: null, error: "" });
  }
  async open(pick: DiscoverTitle, url: string) {
    if (this.expired || this.state.phase === "saving") return;
    const generation = ++this.generation;
    let draft: EntertainmentInput;
    try { draft = entertainmentDraft(pick, url); }
    catch { this.publish({ phase: "error", draft: null, existing: null, error: "This title's details need a fresh check before adding it." }); return; }
    const key = titleKey(draft.title, draft.media);
    this.id = this.identities.get(key) ?? this.uuid(); this.identities.set(key, this.id);
    this.publish({ phase: "checking", draft, existing: null, error: "" });
    try {
      const items = await this.repo.load();
      if (generation !== this.generation) return;
      const existing = items.find(item => item.user_id === this.owner && titleKey(item.title, item.media) === key);
      this.publish({ phase: existing ? "exists" : "ready", draft, existing: existing ? { id: existing.id, archived: existing.archived } : null, error: "" });
    } catch {
      if (generation === this.generation) this.publish({ phase: "error", draft, existing: null, error: "Could not check Entertainment. Retry when connected; nothing new was added." });
    }
  }
  async save(): Promise<boolean> {
    if (this.expired || this.state.phase !== "ready" || !this.id || !this.state.draft) return false;
    const generation = ++this.generation, draft = this.state.draft, id = this.id;
    this.publish({ phase: "saving", draft, existing: null, error: "" });
    try {
      const saved = await this.repo.save(id, draft);
      if (generation !== this.generation) return false;
      if (saved.user_id !== this.owner || saved.id !== id) throw Error("Account mismatch");
      this.publish({ phase: "saved", draft, existing: null, error: "" }); return true;
    } catch {
      if (generation === this.generation) this.publish({ phase: "ready", draft, existing: null, error: "Save was not confirmed. Your title is kept; retry uses the same entry." });
      return false;
    }
  }
}
