import type { AccentColor } from "./types";

/** Joins class names, skipping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Full class strings per accent color. Tailwind only generates classes it can
 * see written out in full, so these can't be built with string templates.
 */
export const accentClasses: Record<AccentColor, { dot: string; bar: string; soft: string; text: string }> = {
  violet: { dot: "bg-violet-400", bar: "bg-violet-400", soft: "bg-violet-400/10", text: "text-violet-300" },
  blue: { dot: "bg-sky-400", bar: "bg-sky-400", soft: "bg-sky-400/10", text: "text-sky-300" },
  emerald: { dot: "bg-emerald-400", bar: "bg-emerald-400", soft: "bg-emerald-400/10", text: "text-emerald-300" },
  amber: { dot: "bg-amber-400", bar: "bg-amber-400", soft: "bg-amber-400/10", text: "text-amber-300" },
  rose: { dot: "bg-rose-400", bar: "bg-rose-400", soft: "bg-rose-400/10", text: "text-rose-300" },
  cyan: { dot: "bg-cyan-400", bar: "bg-cyan-400", soft: "bg-cyan-400/10", text: "text-cyan-300" },
};

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
