"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { addDays, PROTOTYPE_TODAY } from "@/lib/dates";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import type { Priority } from "@/lib/types";

interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (title: string) => void;
}

export function TaskFormDialog({ open, onClose, onCreated }: TaskFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="New task" description="Capture it now, sort it out later.">
      {/* The form remounts each time the dialog opens, so fields start empty. */}
      <TaskForm onCancel={onClose} onCreated={(title) => { onCreated?.(title); onClose(); }} />
    </Dialog>
  );
}

function TaskForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (title: string) => void }) {
  const { projects } = useAppState();
  const { addTask } = useAppActions();
  const id = useId();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState<string>(PROTOTYPE_TODAY);
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Give the task a title.");
      return;
    }
    addTask({
      title: trimmed,
      priority,
      dueDate: dueDate || undefined,
      projectId: projectId || undefined,
      notes: notes.trim() || undefined,
    });
    onCreated(trimmed);
  }

  const quickDates = [
    { label: "Today", value: PROTOTYPE_TODAY },
    { label: "Tomorrow", value: addDays(PROTOTYPE_TODAY, 1) },
    { label: "Next week", value: addDays(PROTOTYPE_TODAY, 7) },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field label="Title" htmlFor={`${id}-title`}>
        <Input
          id={`${id}-title`}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError(null);
          }}
          placeholder="e.g. Email advisor about spring schedule"
          autoFocus
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {error && (
          <p id={`${id}-error`} className="text-sm text-danger">
            {error}
          </p>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Priority" htmlFor={`${id}-priority`}>
          <Select id={`${id}-priority`} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </Field>
        <Field label="Project" htmlFor={`${id}-project`}>
          <Select id={`${id}-project`} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Due date" htmlFor={`${id}-due`}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input id={`${id}-due`} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="sm:w-44" />
          <div className="flex gap-1.5">
            {quickDates.map((d) => (
              <Button key={d.label} size="sm" variant={dueDate === d.value ? "primary" : "secondary"} onClick={() => setDueDate(d.value)} className="h-10">
                {d.label}
              </Button>
            ))}
          </div>
        </div>
      </Field>

      <Field label="Notes" htmlFor={`${id}-notes`}>
        <Textarea id={`${id}-notes`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional details" />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Add task
        </Button>
      </div>
    </form>
  );
}
