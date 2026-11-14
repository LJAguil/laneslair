"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import type { Difficulty } from "@/lib/games/deduction/detective";
import type { PuzzleStore } from "@/lib/games/deduction/storage";
export function PuzzleChoices({ difficulty, onDifficulty, practice, onPractice, onDaily }: { difficulty: Difficulty; onDifficulty: (value: Difficulty) => void; practice: number; onPractice: () => void; onDaily: () => void }) {
  return <div className="flex flex-wrap items-end gap-3">
    <label className="min-w-32 flex-1 text-sm">Difficulty<Select className="mt-1 min-h-11" value={difficulty} onChange={event => onDifficulty(event.target.value as Difficulty)}><option value="normal">Normal</option><option value="hard">Hard</option></Select></label>
    {practice > 0 && <Button onClick={onDaily}>Daily puzzle</Button>}
    <Button onClick={onPractice}>{practice ? "Next practice puzzle" : "Play a practice puzzle"}</Button>
    <p className="w-full text-xs text-subtle">{practice ? `Practice ${practice} · daily progress is kept separately` : "Daily puzzle · a new puzzle each local day"}</p>
  </div>;
}
export function PuzzleSaveState<T>({ error, store, accountError, retryAccount }: { error: string | null; store: PuzzleStore<T> | null; accountError: string | null; retryAccount: () => void }) {
  if (!store && !accountError) return <Card><p role="status" className="text-sm text-muted">Loading your puzzle…</p></Card>;
  if (accountError) return <Card><p role="alert" className="text-sm text-warning">{accountError}</p><Button className="mt-3" onClick={retryAccount}>Retry account check</Button></Card>;
  return <div className="space-y-2">
    {error ? <div role="alert" className="space-y-2 rounded-xl border border-warning/40 p-3 text-sm text-warning"><p>{error}</p><div className="flex flex-wrap gap-2"><Button onClick={() => store?.retry()}>Retry saving</Button><Button onClick={() => { if (window.confirm("Replace this tab's unsaved moves with the saved puzzle?")) store?.reload(); }}>Reload saved copy</Button></div></div> : <p role="status" className="text-xs text-subtle">Saved on this device for your account.</p>}
    <p className="text-xs text-subtle">These new games do not sync across devices. Clearing site data removes their progress. Use one active tab per puzzle.</p>
  </div>;
}
export function GamesLink() { return <Link href="/play" className="inline-block min-h-11 py-2 text-sm text-accent-strong underline">All games</Link>; }
