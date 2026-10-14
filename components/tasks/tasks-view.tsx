"use client";

import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterChips } from "@/components/ui/filter-chips";
import { filterTasks, isOverdue, sortTasks, type PriorityFilter, type StatusFilter, type TaskFilters } from "@/lib/selectors";
import { useAppState } from "@/lib/store/app-store";
import { TaskList } from "./task-list";

export function TasksView() {
  const { tasks } = useAppState();
  const { openQuickAdd } = useShell();
  const [filters, setFilters] = useState<TaskFilters>({ status: "all", priority: "all", query: "" });

  const visible = sortTasks(filterTasks(tasks, filters));
  const count = (status: StatusFilter) => filterTasks(tasks, { ...filters, status }).length;

  const statusOptions = [
    { value: "all", label: "All", count: count("all") },
    { value: "todo", label: "To do", count: count("todo") },
    { value: "in_progress", label: "In progress", count: count("in_progress") },
    { value: "overdue", label: "Overdue", count: count("overdue") },
    { value: "done", label: "Done", count: count("done") },
  ] as const;

  const priorityOptions = [
    { value: "all", label: "Any priority" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ] as const;

  const hasFilters = filters.status !== "all" || filters.priority !== "all" || filters.query !== "";
  const overdueCount = tasks.filter((t) => isOverdue(t)).length;

  return (
    <>
      <PageHeader
        title="Tasks"
        description={`${tasks.filter((t) => t.status !== "done").length} open · ${overdueCount} overdue`}
        actions={
          <Button variant="primary" onClick={openQuickAdd}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New task
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <div className="relative max-w-sm">
          <label htmlFor="task-search" className="sr-only">
            Filter tasks by title
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <input
            id="task-search"
            type="search"
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            placeholder="Filter by title…"
            className="h-10 w-full rounded-lg border border-line bg-panel pl-9 pr-3 text-sm text-fg placeholder:text-subtle hover:border-line-strong focus-visible:border-accent"
          />
        </div>
        <FilterChips<StatusFilter> label="Filter by status" options={statusOptions} value={filters.status} onChange={(status) => setFilters((f) => ({ ...f, status }))} />
        <div className="flex flex-wrap items-center gap-3">
          <FilterChips<PriorityFilter>
            label="Filter by priority"
            options={priorityOptions}
            value={filters.priority}
            onChange={(priority) => setFilters((f) => ({ ...f, priority }))}
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => setFilters({ status: "all", priority: "all", query: "" })}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <Card aria-label="Task list">
        <p className="sr-only" aria-live="polite">
          Showing {visible.length} tasks
        </p>
        <TaskList tasks={visible} emptyTitle="No tasks match these filters" emptyDescription="Try a different status or priority." />
      </Card>
    </>
  );
}
