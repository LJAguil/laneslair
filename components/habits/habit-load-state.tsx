"use client";
import { Button } from "@/components/ui/button";
import { useAppActions,useAppState } from "@/lib/store/app-store";
export function HabitLoadState() {
  const { habitsStatus,habitsError } = useAppState();
  const { loadHabits } = useAppActions();
  if (habitsStatus === "ready") return null;
  if (habitsStatus === "loading") return <p role="status" className="py-4 text-sm text-muted">Loading habits and progress…</p>;
  return <div role="alert" className="space-y-3 rounded-xl border border-danger/30 p-4"><p className="text-sm text-danger">{habitsError}</p><Button onClick={() => void loadHabits()}>Retry habits</Button></div>;
}
