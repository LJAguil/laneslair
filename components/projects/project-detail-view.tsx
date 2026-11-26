"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectStatusBadge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { TaskList } from "@/components/tasks/task-list";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import { formatShortDate, formatTaskDue } from "@/lib/dates";
import { isOpen, projectProgress, sortTasks } from "@/lib/selectors";
import { ProjectFormDialog } from "./project-form-dialog";
import { ProjectLoadState } from "./project-load-state";
export function ProjectDetailView({ projectId }: { projectId: string }) {
  const { projects, projectsStatus, tasks, tasksStatus, today, pendingProjectIds } = useAppState();
  const { notify, loadProjects } = useAppActions();
  const [editing, setEditing] = useState(false), [adding, setAdding] = useState(false);
  const project = projects.find(item => item.id === projectId);
  const linked = sortTasks(tasks.filter(task => task.projectId === projectId));
  const next = linked.find(isOpen), progress = project ? projectProgress(project, linked) : null;
  return <div className="mx-auto max-w-5xl space-y-5">
    <Link href="/projects" className="inline-flex min-h-11 items-center gap-2 text-sm text-accent-strong hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />All projects</Link>
    <ProjectLoadState />
    {projectsStatus === "ready" && !project && <Card><h1 className="text-xl font-semibold">Project unavailable</h1><p className="mt-2 text-sm text-muted">This project is not in your current account’s loaded projects. It may have been removed or the link may be incorrect.</p><Button className="mt-4" onClick={() => void loadProjects()}>Refresh projects</Button></Card>}
    {projectsStatus === "ready" && project && <>
      <PageHeader title={project.name} description={project.dueDate ? `Due ${formatShortDate(project.dueDate)}` : "No project due date"} actions={<div className="flex flex-wrap gap-2"><Button disabled={pendingProjectIds.includes(project.id)} onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit project</Button><Button variant="primary" disabled={project.status === "archived" || pendingProjectIds.includes(project.id)} onClick={() => setAdding(true)}><Plus className="h-4 w-4" aria-hidden="true" />New task</Button></div>} />
      <div className="flex flex-wrap items-center gap-3"><ProjectStatusBadge status={project.status} />{project.status === "archived" && <p className="text-sm text-muted">Archived projects keep their tasks and notes. Restore this project before adding new tasks.</p>}</div>
      <div className="grid items-start gap-5 md:grid-cols-2">
        <Card><CardHeader title="Project notes" description="Edit project to update these notes." /><p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{project.description || "No notes yet."}</p></Card>
        <Card><CardHeader title="Progress & next action" />
          {tasksStatus === "ready" && progress ? <><p className="mb-3 text-sm text-muted">{progress.done} of {progress.total} tasks complete · cancelled tasks excluded</p><ProgressBar value={progress.percent} label={`${project.name} progress`} />
            {next ? <div className="mt-4"><p className="text-xs text-subtle">Next open task · priority, then due date</p><a href="#project-tasks" className="mt-1 block break-words text-sm font-medium text-accent-strong hover:underline">{next.title}</a><p className="mt-1 text-xs text-subtle">{formatTaskDue(next, today)}</p></div> : <p className="mt-4 text-sm text-muted">{progress.total ? "No open tasks left in this project." : "Add a task to choose a next action."}</p>}</> : <p className="text-sm text-muted">{tasksStatus === "error" ? "Task progress is unavailable. Retry loading tasks below." : "Loading task progress…"}</p>}
        </Card>
      </div>
      <Card id="project-tasks"><CardHeader title="Project tasks" description="Linked tasks stay here when completed. Move their due dates or edit them below." /><TaskList tasks={linked} allowDelete emptyTitle="No linked tasks yet" emptyDescription="Use New task to add one directly to this project." /></Card>
      <ProjectFormDialog open={editing} project={project} onClose={() => setEditing(false)} />
      <TaskFormDialog open={adding} defaultProjectId={project.id} onClose={() => setAdding(false)} onCreated={title => notify("success", `Added “${title}” to this project`)} />
    </>}
  </div>;
}
