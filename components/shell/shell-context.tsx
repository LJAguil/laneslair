"use client";

import { createContext, useContext } from "react";

/** Shell-level UI controls any page can trigger (e.g. a dashboard "Quick add" button). */
export interface ShellControls {
  openQuickAdd: () => void;
  openSearch: () => void;
}

export const ShellContext = createContext<ShellControls | null>(null);

export function useShell(): ShellControls {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside <AppShell>");
  return ctx;
}
