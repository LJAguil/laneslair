import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  label: string;
  barClassName?: string;
  className?: string;
}

/** Accessible horizontal progress bar (0–100). */
export function ProgressBar({ value, label, barClassName = "bg-accent", className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-raised", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", barClassName)} style={{ width: `${clamped}%` }} />
    </div>
  );
}

/** Small circular progress ring. */
export function ProgressRing({ value, label, size = 44 }: { value: number; label: string; size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${clamped}%`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-raised" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
          className="stroke-accent transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[11px] font-semibold text-fg" aria-hidden="true">
        {clamped}%
      </span>
    </div>
  );
}
