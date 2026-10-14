"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckCircleProps {
  checked: boolean;
  onChange: () => void;
  /** Accessible name, e.g. "Mark 'Call mom' complete". */
  label: string;
  className?: string;
}

/** Round completion checkbox built on a native input so it works with keyboard and screen readers. */
export function CheckCircle({ checked, onChange, label, className }: CheckCircleProps) {
  return (
    <label className={cn("relative inline-flex h-5 w-5 shrink-0 cursor-pointer", className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="peer absolute inset-0 cursor-pointer appearance-none rounded-full"
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none grid h-5 w-5 place-items-center rounded-full border-2 transition-colors duration-150",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-strong",
          checked ? "border-accent bg-accent text-on-accent" : "border-line-strong hover:border-accent",
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </label>
  );
}
