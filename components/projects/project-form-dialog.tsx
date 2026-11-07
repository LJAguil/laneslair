"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { PROJECT_LABELS, PROJECT_STATUSES } from "@/lib/data/projects";
import { TaskDataError } from "@/lib/data/tasks";
import { useAppActions } from "@/lib/store/app-store";
import type { Project, ProjectStatus } from "@/lib/types";

export function ProjectFormDialog({ open, project, onClose }: { open: boolean; project?: Project; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  return (
    <Dialog open={open} onClose={onClose} dismissible={!saving}
      title={project ? "Edit project" : "New project"}
      description="Keep the details together and track progress through linked tasks.">
      <ProjectForm key={project?.id ?? "new"} project={project} onClose={onClose} onSaving={setSaving} />
    </Dialog>
  );
}

function ProjectForm({ project, onClose, onSaving }: { project?: Project; onClose: () => void; onSaving: (saving: boolean) => void }) {
  const { addProject, editProject } = useAppActions();
  const id = useId();
  const submitting = useRef(false);
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "active");
  const [dueDate, setDueDate] = useState(project?.dueDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    if (!name.trim()) { setError("Give the project a name."); return; }
    submitting.current = true;
    setSaving(true);
    onSaving(true);
    setError(null);
    try {
      const input = { name, description, status, dueDate: dueDate || undefined };
      if (project) await editProject(project, input);
      else await addProject(input);
      onSaving(false);
      onClose();
    } catch (err) {
      setError(err instanceof TaskDataError ? err.message : "Couldn't save the project. Please try again.");
      setSaving(false);
      onSaving(false);
    } finally {
      submitting.current = false;
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-busy={saving}>
      {error && <p role="alert" className="flex gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>}
      <fieldset disabled={saving} className="space-y-4">
        <Field label="Name" htmlFor={`${id}-name`}>
          <Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <Field label="Description" htmlFor={`${id}-description`} hint="Optional">
          <Textarea id={`${id}-description`} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor={`${id}-status`}>
            <Select id={`${id}-status`} value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{PROJECT_LABELS[s]}</option>)}
            </Select>
          </Field>
          <Field label="Due date" htmlFor={`${id}-due`} hint="Optional">
            <Input id={`${id}-due`} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>
        {status === "archived" && <p className="text-xs text-muted">Archived projects keep their tasks and can be restored by changing the status. They won’t appear as choices for new task links.</p>}
      </fieldset>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {saving ? "Saving…" : project ? "Save changes" : "Create project"}
        </Button>
      </div>
    </form>
  );
}
