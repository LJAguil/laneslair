"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { buttonClasses } from "./button";

interface PopoverProps {
  /** Accessible name for the trigger button. */
  label: string;
  trigger: ReactNode;
  triggerClassName?: string;
  align?: "start" | "end";
  side?: "top" | "bottom";
  panelClassName?: string;
  /** Render prop receives a `close` function for items that should dismiss the popover. */
  children: (close: () => void) => ReactNode;
}

/** Click-to-open panel that closes on outside click or Escape and restores focus to its trigger. */
export function Popover({
  label,
  trigger,
  triggerClassName,
  align = "end",
  side = "bottom",
  panelClassName,
  children,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const triggerId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Looked up by id (not ref) because `close` is handed to children during render.
  const close = () => {
    setOpen(false);
    document.getElementById(triggerId)?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName ?? buttonClasses("ghost", "icon")}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className={cn(
            "absolute z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-panel shadow-2xl shadow-black/50",
            side === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
            align === "end" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}
