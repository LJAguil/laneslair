"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPuzzleStore, puzzleStorageKey, type PuzzleStore } from "@/lib/games/deduction/storage";
import { usePlay } from "./play-provider";
const noSubscribe = () => () => {};
/** Reuse the existing verified game-account boundary. No task/journal data or new auth path. */
export function useLocalPuzzle<T>(identity: string, initial: T, validate: (value: unknown) => value is T) {
  const account = usePlay();
  const accountId = account.status === "ready" && account.store ? account.store.key.slice(account.store.key.lastIndexOf(":") + 1) : null;
  const key = accountId ? puzzleStorageKey(accountId, identity) : null;
  const [local, setLocal] = useState<PuzzleStore<T> | null>(null);
  const fallback = useMemo(() => ({ data: initial, error: null }), [initial]);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active && key) setLocal(createPuzzleStore(key, initial, validate, {
        getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value),
      }));
    });
    return () => { active = false; };
  }, [key, initial, validate]);
  const store = key && local?.key === key ? local : null;
  const snapshot = useSyncExternalStore(store?.subscribe ?? noSubscribe, store?.getSnapshot ?? (() => fallback), () => fallback);
  useEffect(() => {
    if (!store) return;
    const changed = (event: StorageEvent) => {
      // Don't replace this tab's notes with another tab's state. The next save
      // detects the conflict against the last acknowledged bytes.
      if (event.key === store.key) store.retry();
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [store]);
  return { ...snapshot, store, accountError: account.status === "error" ? account.error : null, retryAccount: account.retry };
}
