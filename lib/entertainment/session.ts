import type { EntertainmentInput, EntertainmentItem } from "./model";
import type { EntertainmentRepository } from "./repository";
export interface LibrarySnapshot { items: EntertainmentItem[]; status: "loading" | "ready" | "error" | "expired"; busy: boolean; error: string; }
/** Memory only. Late responses are fenced on account change/unmount. */
export class LibrarySession {
  snapshot: LibrarySnapshot = { items: [], status: "loading", busy: false, error: "" };
  private listeners = new Set<() => void>();
  private generation = 0;
  private expired = false;
  constructor(private repo: EntertainmentRepository, private owner: string) {}
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getSnapshot = () => this.snapshot;
  activate() { this.expired = false; this.generation++; this.publish({ items: [], status: "loading", busy: false, error: "" }); }
  private publish(change: Partial<LibrarySnapshot>) { this.snapshot = { ...this.snapshot, ...change }; this.listeners.forEach(fn => fn()); }
  expire() { this.expired = true; this.generation++; this.publish({ items: [], status: "expired", busy: false, error: "Account changed. Reload to open your library." }); }
  async load() {
    if (this.expired || this.snapshot.busy) return;
    const generation = ++this.generation;
    this.publish({ status: "loading", error: "" });
    try {
      const items = await this.repo.load();
      if (generation === this.generation) this.publish({ items: items.filter(i => i.user_id === this.owner), status: "ready" });
    } catch { if (generation === this.generation) this.publish({ items: [], status: "error", error: "Could not load Entertainment. Check connection and database setup, then retry." }); }
  }
  async mutate(action: () => Promise<EntertainmentItem | void>, id: string): Promise<boolean> {
    if (this.expired || this.snapshot.busy || this.snapshot.status !== "ready") return false;
    const generation = ++this.generation;
    this.publish({ busy: true, error: "" });
    try {
      const item = await action();
      if (generation !== this.generation) return false;
      if (item && item.user_id !== this.owner) throw new Error("Account mismatch");
      this.publish({ items: item ? [item, ...this.snapshot.items.filter(i => i.id !== id)] : this.snapshot.items.filter(i => i.id !== id), busy: false });
      return true;
    } catch { if (generation === this.generation) this.publish({ busy: false, error: "Could not save the change. Your input is kept; retry when connected. If setup is pending, apply only the reviewed Entertainment SQL after approval." }); return false; }
  }
  save(id: string, input: EntertainmentInput) { return this.mutate(() => this.repo.save(id, input), id); }
  remove(id: string) { return this.mutate(() => this.repo.remove(id), id); }
}
