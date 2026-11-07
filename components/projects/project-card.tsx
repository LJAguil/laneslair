import { CalendarDays, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectStatusBadge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { formatShortDate } from "@/lib/dates";
import type { Project } from "@/lib/types";
import { accentClasses, cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
  progress: { done: number; total: number; percent: number };
  /** Compact variant for the dashboard. */
  compact?: boolean;
  onEdit?: () => void;
  pending?: boolean;
  tasksStatus?: "loading" | "ready" | "error";
}

export function ProjectCard({ project, progress, compact, onEdit, pending, tasksStatus = "ready" }: ProjectCardProps) {
  const accent = accentClasses[project.color];
  return (
    <article className={cn("rounded-xl border border-line bg-raised/40 transition-colors hover:border-line-strong", compact ? "p-4" : "p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", accent.dot)} aria-hidden="true" />
          <h3 className="truncate text-sm font-semibold">{project.name}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ProjectStatusBadge status={project.status} />
          {onEdit && <Button variant="ghost" size="icon-sm" disabled={pending} onClick={onEdit} aria-label={`Edit “${project.name}”`}><Pencil className="h-4 w-4" aria-hidden="true" /></Button>}
        </div>
      </div>
      {!compact && <p className="mt-2 text-sm text-muted">{project.description}</p>}
      {tasksStatus !== "ready" ? (
        <p className="mt-4 text-xs text-subtle">{tasksStatus === "loading" ? "Loading task progress…" : "Task progress unavailable. Retry loading tasks on the Tasks page."}</p>
      ) : progress.total === 0 ? (
        <p className={cn("text-xs text-subtle", compact ? "mt-3" : "mt-4")}>No tasks linked yet</p>
      ) : (
        <>
          <div className={cn("flex items-center justify-between text-xs text-subtle", compact ? "mt-3" : "mt-4")}>
            <span>
              {progress.done}/{progress.total} tasks
            </span>
            <span className="font-medium text-fg tabular-nums">{progress.percent}%</span>
          </div>
          <ProgressBar value={progress.percent} label={`${project.name} progress`} barClassName={accent.bar} className="mt-2" />
        </>
      )}
      {!compact && (
        <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-subtle">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          {project.dueDate ? `Due ${formatShortDate(project.dueDate)}` : "No due date"}
        </p>
      )}
    </article>
  );
}
