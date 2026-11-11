"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { captureTaskDefaults } from "@/lib/data/inbox";
import { TaskDataError } from "@/lib/data/tasks";
import { addDays } from "@/lib/dates";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import type { InboxNote, Priority, Task, TaskStatus } from "@/lib/types";
import { useReminderDraft } from "@/components/reminders/use-reminder-draft";
import { ReminderFields } from "@/components/reminders/reminder-fields";

interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** When set, the dialog edits this task instead of creating a new one. */
  task?: Task | null;
  capture?: InboxNote;
  /** Called after a new task is created (edits show their own success message). */
  onCreated?: (title: string) => void;
}

/** Create-or-edit dialog. Nothing is written until "Add task" / "Save changes" succeeds. */
export function TaskFormDialog({ open, onClose, task, capture, onCreated }: TaskFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const editing = !!task;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      // Can't be dismissed mid-save, so a failure message is never hidden.
      dismissible={!saving}
      title={editing ? "Edit task" : capture ? "Make this a task" : "New task"}
      description={editing ? "Update the details and save." : capture ? "Your original capture stays in Inbox." : "Choose the details for this task."}
    >
      {/* The form remounts each time the dialog opens (and per task), so it always
          starts from the task's current values or empty fields. */}
      <TaskForm
        key={task?.id ?? capture?.id ?? "new"}
        task={task ?? undefined}
        capture={capture}
        onCancel={onClose}
        onSavingChange={setSaving}
        onDone={(title, created) => {
          if (created && !capture) onCreated?.(title);
          onClose();
        }}
      />
    </Dialog>
  );
}

interface TaskFormProps {
  task?: Task;
  capture?: InboxNote;
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

function TaskForm({ task, capture, onCancel, onDone, onSavingChange }: TaskFormProps) {
  const { today, tasks, projects, projectsStatus, projectsError } = useAppState();
  const { addTask, editTask, loadProjects, convertCapture } = useAppActions();
  const id = useId();
  const editing = !!task;
  const captureDefaults = capture ? captureTaskDefaults(capture) : undefined;

  // Prefilled from the task when editing; these are local copies, so cancelling
  // simply discards them and the task in the store is untouched.
  const [title, setTitle] = useState(task?.title ?? captureDefaults?.title ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState<string>(task ? (task.dueDate ?? "") : capture ? "" : today);
  const [dueTime, setDueTime] = useState(task?.dueTime ?? "");
  const [projectId, setProjectId] = useState(task?.projectId ?? "");
  const [notes, setNotes] = useState(task?.notes ?? captureDefaults?.notes ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const createdTask = useRef<Task | null>(null);
  const reminder = useReminderDraft("task",task?.id);
  const [partiallySaved,setPartiallySaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Give the task a title.");
      return;
    }
    submitting.current = true;
    setSaving(true);
    onSavingChange(true);
    setSaveError(null);
    try {
      reminder.validate();
      // Notes are optional: an empty or whitespace-only value is saved as "".
      const fields = { title: trimmed, priority, dueDate: dueDate || undefined, dueTime: dueDate && dueTime ? dueTime : undefined, notes, projectId: projectId || undefined };
      const previous = task ?? (createdTask.current ? tasks.find(t=>t.id===createdTask.current!.id)??createdTask.current : null);
      let saved = previous;
      if (previous) {
        await editTask(previous, { ...fields, status });
      } else if (capture) {
        saved=await convertCapture(capture, fields);
      } else {
        saved=await addTask(fields);
      }
      if(saved){
        createdTask.current=saved;
        setPartiallySaved(true);
        try { await reminder.saveDraft(saved.id); }
        catch(error){throw new TaskDataError(`Task saved, but its reminder wasn’t saved. ${error instanceof Error?error.message:"Try again."} Retrying will update this task, not create another.`);}
      } else if(reminder.value.enabled) {
        throw new TaskDataError("This capture’s task was already removed. Its reminder cannot be saved.");
      }
      onSavingChange(false);
      onDone(trimmed, !task);
    } catch (err) {
      // Keep the dialog open with everything the user typed, so nothing is lost.
      setSaveError(err instanceof TaskDataError ? err.message : "Couldn't save the task. Please try again.");
      setSaving(false);
      onSavingChange(false);
    } finally {
      submitting.current = false;
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

      <fieldset disabled={saving} className="space-y-4">
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
        ) : null}
      </div>

      <Field label="Project" htmlFor={`${id}-project`} hint={projectsStatus === "loading" ? "Loading projects…" : projectsStatus === "ready" && projects.length === 0 ? "Create a project on the Projects page, or leave this task unassigned." : undefined}>
        <Select id={`${id}-project`} value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={projectsStatus !== "ready" || saving}>
          <option value="">No project</option>
          {projectId && !projects.some((p) => p.id === projectId) && <option value={projectId}>Current project (unavailable)</option>}
          {projects.filter((p) => p.status !== "archived" || p.id === projectId).map((p) => <option key={p.id} value={p.id}>{p.name}{p.status === "archived" ? " (archived)" : ""}</option>)}
        </Select>
        {projectsStatus === "error" && <div role="alert" className="space-y-2 text-sm text-danger"><p>{projectsError ?? "Couldn't load projects. Your existing link will be kept."}</p><Button size="sm" disabled={saving} onClick={() => void loadProjects()}>Retry projects</Button></div>}
      </Field>

      <Field label="Due date" htmlFor={`${id}-due`}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input id={`${id}-due`} type="date" value={dueDate} onChange={(e) => { setDueDate(e.target.value); if (!e.target.value) setDueTime(""); }} className="sm:w-44" />
          <div className="flex flex-wrap gap-1.5">
            {quickDates.map((d) => (
              <Button key={d.label} size="sm" variant={dueDate === d.value ? "primary" : "secondary"} onClick={() => { setDueDate(d.value); if (!d.value) setDueTime(""); }} className="h-10">
                {d.label}
              </Button>
            ))}
          </div>
        </div>
      </Field>

      <Field label="Due time (optional)" htmlFor={`${id}-due-time`} hint="No time: due through the end of that day. With a time: overdue at that deadline. Uses this device’s time zone; push reminders are set separately.">
        <div className="flex items-center gap-2">
          <Input id={`${id}-due-time`} type="time" step="60" value={dueDate ? dueTime : ""} disabled={!dueDate} onChange={(event) => setDueTime(event.target.value)} />
          {dueTime && <Button onClick={() => setDueTime("")}>Clear time</Button>}
        </div>
      </Field>

      <Field label="Notes" htmlFor={`${id}-notes`} hint="Optional">
        <Textarea id={`${id}-notes`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional details" />
      </Field>
      <ReminderFields kind="task" value={reminder.value} onChange={reminder.onChange} status={reminder.status} error={reminder.error}
        onRetry={()=>void reminder.reload()} preferences={reminder.preferences} />

      </fieldset>
      <div className="task-form-actions flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          {partiallySaved ? "Close" : "Cancel"}
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {saving ? "Saving…" : editing || partiallySaved ? "Save changes" : "Add task"}
        </Button>
      </div>
    </form>
  );
}
