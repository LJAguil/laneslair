"use client";

import { useEffect } from "react";

/** Keep dialogs inside the visible area when the iPhone keyboard opens. */
export function ViewportSync() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    let frame = 0;
    const sync = () => {
      root.style.setProperty("--app-visual-height", `${viewport.height}px`);
      const keyboard = viewport.height < window.innerHeight - 150 && viewport.scale === 1;
      root.dataset.keyboardOpen = String(keyboard);
      if (keyboard) {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const field = document.activeElement;
          if (field instanceof HTMLElement && field.matches("input, textarea, select")) field.scrollIntoView({ block: "nearest" });
        });
      }
    };
    sync();
    viewport.addEventListener("resize", sync);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", sync);
      root.style.removeProperty("--app-visual-height");
      delete root.dataset.keyboardOpen;
    };
  }, []);
  return null;
}
