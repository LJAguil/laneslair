"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/filter-chips";
import { PROJECT_LABELS, PROJECT_STATUSES } from "@/lib/data/projects";
import { projectProgress } from "@/lib/selectors";
import { useAppState } from "@/lib/store/app-store";
import type { Project, ProjectStatus } from "@/lib/types";
import { ProjectCard } from "./project-card";
import { ProjectFormDialog } from "./project-form-dialog";
import { ProjectLoadState } from "./project-load-state";

type Filter = "all" | ProjectStatus;

export function ProjectsView() {
  const { projects, projectsStatus, pendingProjectIds, tasks, tasksStatus } = useAppState();
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Project | undefined>();
  const visible = filter === "all" ? projects : projects.filter((p) => p.status === filter);
  const options = (["all", ...PROJECT_STATUSES] as const).map((value) => ({
    value,
    label: value === "all" ? "All" : PROJECT_LABELS[value],
    count: value === "all" ? projects.length : projects.filter((p) => p.status === value).length,
  }));

  return (
    <>
      <PageHeader title="Projects" description="Organize your work and track progress through linked tasks. Archive a project from its edit form."
        actions={<Button variant="primary" disabled={projectsStatus !== "ready"} onClick={() => setCreating(true)}><Plus className="h-4 w-4" aria-hidden="true" />New project</Button>} />
      <ProjectLoadState />
      {projectsStatus === "ready" && <>
        <div className="mb-4"><FilterChips<Filter> label="Filter by status" options={options} value={filter} onChange={setFilter} /></div>
        {visible.length === 0 ? (
          <EmptyState title={projects.length === 0 ? "No projects yet" : "No projects with this status"}
            description={projects.length === 0 ? "Create your first project, then link tasks to it." : "Choose another status or create a project."} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((p) => <ProjectCard key={p.id} project={p} progress={projectProgress(p, tasks)} tasksStatus={tasksStatus}
              pending={pendingProjectIds.includes(p.id)} onEdit={() => setEditing(p)} />)}
          </div>
        )}
      </>}
      <ProjectFormDialog open={creating || !!editing} project={editing} onClose={() => { setCreating(false); setEditing(undefined); }} />
    </>
  );
}
