"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { TaskDataError } from "@/lib/data/tasks";
import { addDays } from "@/lib/dates";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import type { Priority, Task, TaskStatus } from "@/lib/types";

interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** When set, the dialog edits this task instead of creating a new one. */
  task?: Task | null;
  /** Called after a new task is created (edits show their own success message). */
  onCreated?: (title: string) => void;
}

/** Create-or-edit dialog. Nothing is written until "Add task" / "Save changes" succeeds. */
export function TaskFormDialog({ open, onClose, task, onCreated }: TaskFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const editing = !!task;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      // Can't be dismissed mid-save, so a failure message is never hidden.
      dismissible={!saving}
      title={editing ? "Edit task" : "New task"}
      description={editing ? "Update the details and save." : "Capture it now, sort it out later."}
    >
      {/* The form remounts each time the dialog opens (and per task), so it always
          starts from the task's current values or empty fields. */}
      <TaskForm
        key={task?.id ?? "new"}
        task={task ?? undefined}
        onCancel={onClose}
        onSavingChange={setSaving}
        onDone={(title, created) => {
          if (created) onCreated?.(title);
          onClose();
        }}
      />
    </Dialog>
  );
}

interface TaskFormProps {
  task?: Task;
  onCancel: () => void;
  onDone: (title: string, created: boolean) => void;
  onSavingChange: (saving: boolean) => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

function TaskForm({ task, onCancel, onDone, onSavingChange }: TaskFormProps) {
  const { today } = useAppState();
  const { addTask, editTask } = useAppActions();
  const id = useId();
  const editing = !!task;

  // Prefilled from the task when editing; these are local copies, so cancelling
  // simply discards them and the task in the store is untouched.
  const [title, setTitle] = useState(task?.title ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState<string>(task ? (task.dueDate ?? "") : today);
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Give the task a title.");
      return;
    }
    setSaving(true);
    onSavingChange(true);
    setSaveError(null);
    try {
      // Notes are optional: an empty or whitespace-only value is saved as "".
      const fields = { title: trimmed, priority, dueDate: dueDate || undefined, notes };
      if (task) {
        await editTask(task, { ...fields, status });
      } else {
        await addTask(fields);
      }
      onSavingChange(false);
      onDone(trimmed, !task);
    } catch (err) {
      // Keep the dialog open with everything the user typed, so nothing is lost.
      setSaveError(err instanceof TaskDataError ? err.message : "Couldn't save the task. Please try again.");
      setSaving(false);
      onSavingChange(false);
    }
  }

  const quickDates = [
    { label: "Today", value: today },
    { label: "Tomorrow", value: addDays(today, 1) },
    { label: "Next week", value: addDays(today, 7) },
    { label: "No date", value: "" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-busy={saving}>
      {saveError && (
        <div role="alert" className="flex gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {saveError}
        </div>
      )}

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
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </Field>
        {editing ? (
          <Field label="Status" htmlFor={`${id}-status`}>
            <Select id={`${id}-status`} value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          // Projects still live in local sample data, so their ids don't exist in
          // the database yet. Linking is disabled until projects are stored too.
          <Field label="Project" htmlFor={`${id}-project`} hint="Linking tasks to projects comes once projects are saved to your account.">
            <Select id={`${id}-project`} value="" disabled>
              <option value="">No project</option>
            </Select>
          </Field>
        )}
      </div>

      <Field label="Due date" htmlFor={`${id}-due`}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input id={`${id}-due`} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="sm:w-44" />
          <div className="flex flex-wrap gap-1.5">
            {quickDates.map((d) => (
              <Button key={d.label} size="sm" variant={dueDate === d.value ? "primary" : "secondary"} onClick={() => setDueDate(d.value)} className="h-10">
                {d.label}
              </Button>
            ))}
          </div>
        </div>
      </Field>

      <Field label="Notes" htmlFor={`${id}-notes`} hint="Optional">
        <Textarea id={`${id}-notes`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional details" />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {saving ? "Saving…" : editing ? "Save changes" : "Add task"}
        </Button>
      </div>
    </form>
  );
}
