"use client";

import { useState } from "react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { FilterChips } from "@/components/ui/filter-chips";
import { projectProgress } from "@/lib/selectors";
import { useAppState } from "@/lib/store/app-store";
import type { ProjectStatus } from "@/lib/types";
import { ProjectCard } from "./project-card";

type Filter = "all" | ProjectStatus;

export function ProjectsView() {
  const { projects, tasks } = useAppState();
  const [filter, setFilter] = useState<Filter>("all");
  const visible = filter === "all" ? projects : projects.filter((p) => p.status === filter);
  const count = (s: Filter) => (s === "all" ? projects.length : projects.filter((p) => p.status === s).length);

  const options = (["all", "active", "planning", "on_hold", "completed"] as const).map((value) => ({
    value,
    label: { all: "All", active: "Active", planning: "Planning", on_hold: "On hold", completed: "Completed" }[value],
    count: count(value),
  }));

  return (
    <>
      <PageHeader title="Projects" description="Progress is calculated from each project's tasks." />
      <div className="mb-4">
        <FilterChips<Filter> label="Filter by status" options={options} value={filter} onChange={setFilter} />
      </div>
      {visible.length === 0 ? (
        <EmptyState title="No projects with this status" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => (
            <ProjectCard key={p.id} project={p} progress={projectProgress(p, tasks)} />
          ))}
        </div>
      )}
    </>
  );
}
