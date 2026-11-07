"use client";

import { Check } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { THEMES, THEME_KEY, validTheme, type ThemeId } from "@/lib/themes";
import { cn } from "@/lib/utils";

let memoryTheme: ThemeId = "lair";
let storageBlocked = false;
const CHANGE = "lair-theme-change";
function readTheme(): ThemeId {
  if (storageBlocked) return memoryTheme;
  try { return validTheme(localStorage.getItem(THEME_KEY)); }
  catch { return memoryTheme; }
}
function subscribe(onChange: () => void) {
  const storage = (e: StorageEvent) => { if (e.key === THEME_KEY || e.key === null) onChange(); };
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("storage", storage);
  return () => { window.removeEventListener(CHANGE, onChange); window.removeEventListener("storage", storage); };
}
function chooseTheme(theme: ThemeId): boolean {
  memoryTheme = theme;
  let persisted = true;
  try { localStorage.setItem(THEME_KEY, theme); } catch { persisted = false; }
  storageBlocked = !persisted;
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event(CHANGE));
  return persisted;
}

/** No private data or account preferences are cached; appearance is per browser. */
export function ThemeSync() {
  useEffect(() => {
    const apply = () => {
      const theme = readTheme();
      document.documentElement.dataset.theme = theme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEMES.find((t) => t.id === theme)!.background);
    };
    apply();
    return subscribe(apply);
  }, []);
  return null;
}

export function ThemePicker() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "lair" as const);
  const [notice, setNotice] = useState("");
  return (
    <fieldset>
      <legend className="mb-3 text-sm text-muted">Choose your atmosphere</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {THEMES.map((t) => <label key={t.id} className={cn("relative cursor-pointer rounded-xl border p-3 transition-colors", theme === t.id ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong")}>
          <div className="mb-3 rounded-lg p-3" style={{ background: t.background }} aria-hidden="true">
            <div className="mb-2 h-2 w-8 rounded" style={{ background: t.accent }} />
            <div className="h-7 rounded" style={{ background: t.panel, border: `1px solid ${t.accent}55` }} />
          </div>
          <span className="flex items-center gap-2 text-sm font-medium"><input type="radio" name="theme" value={t.id} checked={theme === t.id}
            onChange={() => setNotice(chooseTheme(t.id) ? `${t.name} saved on this browser.` : "Theme applied for this session. Browser storage is unavailable.")}
            className="accent-[var(--color-accent)]" />{t.name}{theme === t.id && <Check className="ml-auto h-4 w-4 text-accent-strong" aria-hidden="true" />}</span>
          <span className="mt-2 block text-xs leading-relaxed text-muted">{t.description}</span>
        </label>)}
      </div>
      <p role="status" className="mt-3 text-xs text-muted">{notice || "Saved on this browser. Your iPhone and laptop can each have their own theme."}</p>
    </fieldset>
  );
}
