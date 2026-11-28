"use client";
import { Plus, Trophy } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { FilterChips } from "@/components/ui/filter-chips";
import { useAppActions, useAppState } from "@/lib/store/app-store";
import type { Goal } from "@/lib/types";
import { GoalProgress } from "./goal-progress";
import { GoalFormDialog } from "./goal-form-dialog";
import { GoalLoadState } from "./goal-load-state";

export function GoalsSection() {
  const { goals, goalsStatus, pendingGoalIds } = useAppState();
  const { deleteGoal } = useAppActions();
  const [filter, setFilter] = useState("active");
  const [form, setForm] = useState<{ goal?: Goal; progressOnly?: boolean }>();
  const [deleting, setDeleting] = useState<Goal>();
  const [saving, setSaving] = useState(false), [error, setError] = useState<string | null>(null);
  const visible = goals.filter(g => (g.status ?? "active") === filter);
  return <Card id="goals" className="scroll-mt-24">
    <CardHeader title="Your goals" description="Milestones that matter to you. Update your progress whenever you make a little headway." icon={<Trophy className="h-5 w-5" />}
      action={<Button size="sm" variant="primary" disabled={goalsStatus !== "ready"} onClick={() => setForm({})}><Plus className="h-4 w-4" aria-hidden="true" />New goal</Button>} />
    <GoalLoadState />
    {goalsStatus === "ready" && <>
      <FilterChips label="Goal status" options={["active", "paused", "completed", "archived"].map(value => ({ value, label: value[0].toUpperCase()+value.slice(1), count: goals.filter(g => (g.status ?? "active") === value).length }))} value={filter} onChange={setFilter} />
      {!visible.length ? <EmptyState title={goals.length ? `No ${filter} goals` : "Give yourself something to work toward"} description={goals.length ? "Your goals will appear here when they have this status." : "Set a reading target, save for something special, or choose a milestone of your own."} /> :
        <div className="mt-5 grid gap-4 sm:grid-cols-2">{visible.map(goal => <article key={goal.id} className="min-w-0 space-y-3 rounded-xl border border-line p-4">
          <GoalProgress goal={goal} />
          {goal.description && <p className="whitespace-pre-wrap break-words text-sm text-muted">{goal.description}</p>}
          {(goal.target <= 0 || !goal.unit) && <p className="text-sm text-muted">Add a target and unit in Edit to start tracking progress.</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={pendingGoalIds.includes(goal.id) || goal.target <= 0 || !goal.unit} onClick={() => setForm({ goal, progressOnly: true })}>Update progress<span className="sr-only"> for {goal.title}</span></Button>
            <Button size="sm" variant="ghost" disabled={pendingGoalIds.includes(goal.id)} onClick={() => setForm({ goal })}>Edit<span className="sr-only"> {goal.title}</span></Button>
            <Button size="sm" variant="ghost" disabled={pendingGoalIds.includes(goal.id)} onClick={() => { setError(null); setDeleting(goal); }}>Delete<span className="sr-only"> {goal.title}</span></Button>
          </div>
        </article>)}</div>}
    </>}
    <GoalFormDialog open={!!form} goal={form?.goal} progressOnly={form?.progressOnly} onClose={() => setForm(undefined)} />
    <Dialog open={!!deleting} title="Delete goal?" description={`“${deleting?.title ?? ""}” and its progress will be permanently deleted.`} dismissible={!saving} onClose={() => setDeleting(undefined)}>
      {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2"><Button disabled={saving} onClick={() => setDeleting(undefined)}>Cancel</Button><Button variant="danger" disabled={saving} onClick={async () => {
        if (!deleting || saving) return;
        setSaving(true); setError(null);
        try { await deleteGoal(deleting.id); setDeleting(undefined); }
        catch (err) { setError(err instanceof Error ? err.message : "Couldn't delete this goal. Try again."); }
        finally { setSaving(false); }
      }}>{saving ? "Deleting…" : "Delete goal"}</Button></div>
    </Dialog>
  </Card>;
}
