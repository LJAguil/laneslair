export const THEMES = [
  { id: "lair", name: "Classic Lair", description: "Charcoal and violet. Your original command center.", background: "#111216", panel: "#18191f", accent: "#8b7cf8", ink: "#f3f4f7" },
  { id: "voyage", name: "Grand Voyage", description: "Midnight seas, warm gold, and a little adventure.", background: "#0e1924", panel: "#142333", accent: "#e9ba63", ink: "#f4f4ed" },
  { id: "shire", name: "Shire Night", description: "Forest greens and soft candlelight. A quieter corner.", background: "#141b17", panel: "#1b2720", accent: "#b6cb8b", ink: "#f2f2e7" },
] as const;
export type ThemeId = typeof THEMES[number]["id"];
export const THEME_KEY = "lanes-lair-theme";
export function validTheme(value: unknown): ThemeId {
  return THEMES.some((t) => t.id === value) ? value as ThemeId : "lair";
}

// Only allowlisted, non-sensitive appearance preferences are read before hydration.
export const THEME_BOOTSTRAP = `try{var t=localStorage.getItem('${THEME_KEY}');document.documentElement.dataset.theme=${JSON.stringify(THEMES.map((t) => t.id))}.includes(t)?t:'lair'}catch{}`;
