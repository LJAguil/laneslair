"use client";

import { cn } from "@/lib/utils";

interface FilterChipsProps<T extends string> {
  label: string;
  options: ReadonlyArray<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (value: T) => void;
}

/** A row of toggle buttons where exactly one option is active. */
export function FilterChips<T extends string>({ label, options, value, onChange }: FilterChipsProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
              active
                ? "border-accent/40 bg-accent-soft text-fg"
                : "border-line bg-panel text-muted hover:border-line-strong hover:text-fg",
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span className={cn("text-xs tabular-nums", active ? "text-accent-strong" : "text-subtle")}>{opt.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
