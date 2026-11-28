"use client";
import { Button } from "@/components/ui/button";
import { useAppActions, useAppState } from "@/lib/store/app-store";
export function GoalLoadState() {
  const { goalsStatus, goalsError } = useAppState();
  const { loadGoals } = useAppActions();
  if (goalsStatus === "ready") return null;
  if (goalsStatus === "loading") return <p role="status" className="py-4 text-sm text-muted">Loading your goals…</p>;
  return <div role="alert" className="space-y-3 rounded-xl border border-danger/30 p-4"><p className="text-sm text-danger">{goalsError}</p><Button onClick={() => void loadGoals()}>Retry goals</Button></div>;
}
