"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppActions, useAppState } from "@/lib/store/app-store";

/** Shared by the Projects page and dashboard; failures never look like empty lists. */
export function ProjectLoadState() {
  const { projectsStatus, projectsError } = useAppState();
  const { loadProjects } = useAppActions();
  if (projectsStatus === "ready") return null;
  if (projectsStatus === "loading") return <p role="status" className="py-6 text-sm text-muted">Loading projects…</p>;
  return (
    <div role="alert" className="space-y-3 rounded-xl border border-danger/30 p-4">
      <p className="flex items-center gap-2 text-sm text-danger"><AlertCircle className="h-4 w-4" aria-hidden="true" />{projectsError ?? "Couldn't load your projects."}</p>
      <Button size="sm" onClick={() => void loadProjects()}>Try again</Button>
    </div>
  );
}
