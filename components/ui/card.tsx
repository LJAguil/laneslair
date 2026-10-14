import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-2xl border border-line bg-panel p-5", className)} {...props} />;
}

interface CardHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  /** Heading level; defaults to h2. */
  as?: "h2" | "h3";
}

export function CardHeader({ title, description, icon, action, as: Heading = "h2" }: CardHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <span className="text-accent" aria-hidden="true">{icon}</span>}
        <div className="min-w-0">
          <Heading className="text-[15px] font-semibold text-fg">{title}</Heading>
          {description && <p className="mt-0.5 text-sm text-subtle">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
