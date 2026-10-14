import { cn } from "@/lib/utils";

/** Lane's Lair mark: a simple "L" inside a rounded tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-on-accent", className)}
    >
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 5v14h9" />
      </svg>
    </span>
  );
}
