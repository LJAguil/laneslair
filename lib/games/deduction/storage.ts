import type { PlayStorage } from "../play-store";
export const puzzleStorageKey = (accountId: string, identity: string) => `lanes-lair-deduction-v1:${accountId}:${identity}`;
export function createPuzzleStore<T>(key: string, initial: T, validate: (value: unknown) => value is T, storage: PlayStorage) {
  const listeners = new Set<() => void>();
  let base: string | null = null, blocked = false;
  let snapshot: { data: T; error: string | null } = { data: initial, error: null };
  function decode(raw: string | null): T {
    if (raw === null) return initial;
    if (raw.length > 250000) throw new Error("Invalid saved progress.");
    const value: unknown = JSON.parse(raw);
    if (!validate(value)) throw new Error("Invalid saved progress.");
    return value;
  }
  function emit() { listeners.forEach(fn => fn()); }
  function reload() {
    try { const raw = storage.getItem(key); const data = decode(raw); base = raw; blocked = false; snapshot = { data, error: null }; }
    catch { blocked = true; snapshot = { ...snapshot, error: "Saved progress could not be read. The existing copy is untouched. You can play this visit; retry loading before leaving." }; }
    emit();
  }
  function save(data: T) {
    if (!validate(data)) throw new Error("Invalid puzzle progress.");
    try {
      if (blocked) throw new Error("blocked");
      if (storage.getItem(key) !== base) throw new Error("conflict");
      const raw = JSON.stringify(data); storage.setItem(key, raw); base = raw;
      snapshot = { data, error: null };
    } catch (error) {
      const conflict = error instanceof Error && error.message === "conflict";
      snapshot = { data, error: conflict ? "Another tab changed this puzzle. Your moves are kept here but not saved. Reload the saved copy to resolve it." : "Progress is only kept for this visit. Retry saving before leaving; the existing saved copy is untouched." };
    }
    emit();
  }
  reload();
  return { key, getSnapshot: () => snapshot, subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; }, save, reload, retry: () => save(snapshot.data) };
}
export type PuzzleStore<T> = ReturnType<typeof createPuzzleStore<T>>;
