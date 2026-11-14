"use client";
import { useMemo, useState } from "react";
import { SearchCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useAppState } from "@/lib/store/app-store";
import { caseSolved, clueText, detectivePuzzle, emptyCase, markCase, validateCase, type CaseProgress, type CasePuzzle, type Difficulty, type Mark } from "@/lib/games/deduction/detective";
import type { PuzzleStore } from "@/lib/games/deduction/storage";
import { cn } from "@/lib/utils";
import { useLocalPuzzle } from "./use-local-puzzle";
import { GamesLink, PuzzleChoices, PuzzleSaveState } from "./deduction-controls";

export function DetectiveView() {
  const { today } = useAppState();
  const [difficulty, setDifficulty] = useState<Difficulty>("normal"), [practice, setPractice] = useState(0);
  const identity = practice ? `${today}/practice-${practice}` : today;
  const puzzle = useMemo(() => detectivePuzzle(identity, difficulty), [identity, difficulty]);
  return <div className="mx-auto max-w-3xl space-y-5"><GamesLink /><PageHeader title="The Casebook" description="Follow the clues. Cross out the impossible. Reconstruct the whole story." />
    <PuzzleChoices difficulty={difficulty} onDifficulty={setDifficulty} practice={practice} onPractice={() => setPractice(value => value + 1)} onDaily={() => setPractice(0)} />
    <DetectiveSession key={puzzle.id} puzzle={puzzle} />
  </div>;
}
function DetectiveSession({ puzzle }: { puzzle: CasePuzzle }) {
  const initial = useMemo(() => emptyCase(), []);
  const validate = useMemo(() => (value: unknown): value is CaseProgress => validateCase(value) && value.crossed.every(index => index < puzzle.clues.length) && (!value.solved || caseSolved(puzzle, value.marks)), [puzzle]);
  const saved = useLocalPuzzle(puzzle.id, initial, validate);
  return <><PuzzleSaveState {...saved} />{saved.store && <DetectiveBoard puzzle={puzzle} progress={saved.data} store={saved.store} />}</>;
}
export function DetectiveBoard({ puzzle, progress, store }: { puzzle: CasePuzzle; progress: CaseProgress; store: PuzzleStore<CaseProgress> }) {
  const [group, setGroup] = useState(0), [mode, setMode] = useState<Mark>(1), [message, setMessage] = useState("");
  function commit(marks: Mark[], hinted = false) {
    const current = store.getSnapshot().data;
    store.save({ ...current, marks, history: [...current.history, current.marks].slice(-100), hints: current.hints + Number(hinted) });
    setMessage(hinted ? "One match revealed. Its row and column exclusions were filled in; hint use is recorded." : "Notes updated. Matching a cell excludes the other cells in its row and column.");
  }
  function reveal() {
    const current = store.getSnapshot().data;
    for (let g = 0; g < 3; g++) for (let row = 0; row < 4; row++) {
      const col = [0, 1, 2, 3].find(i => puzzle.solution[(g + 1) * 4 + i] === puzzle.solution[row])!;
      const index = g * 16 + row * 4 + col;
      if (current.marks[index] !== 2) { setGroup(g); commit(markCase(current.marks, index, 2), true); return; }
    }
    setMessage("All matches are marked. Use Check case to finish.");
  }
  return <>
    <Card><CardHeader title={puzzle.title} description={`${puzzle.difficulty === "hard" ? "Hard · no direct identity clues" : "Normal"} · one verified solution`} icon={<SearchCheck className="h-5 w-5" />} /><p className="text-sm leading-relaxed text-muted">{puzzle.story}</p>
      <details className="mt-4 text-sm"><summary className="min-h-11 cursor-pointer py-2 font-medium">How to investigate</summary><p className="mt-2 leading-relaxed text-muted">Use the three grids to match each person to one room, one object, and one arrival time. Choose Exclude, Match, or Erase, then tap a cell. A match fills the rest of its row and column with ×. Clues apply across all three grids. “Before” means any earlier time; “15 minutes before or after” means neighbouring arrival slots. Cross off a clue when you are done with it. Check case verifies the full assignment without revealing which guesses are wrong. Undo keeps your last 100 grid edits.</p></details>
    </Card>
    {progress.solved && <Card className="border-success/40"><h2 className="font-semibold text-success">Case closed</h2><p role="status" className="mt-2 text-sm text-muted">Every match fits every clue. {progress.hints ? `${progress.hints} match reveals used.` : "Solved without revealing a match."}</p><ul className="mt-3 space-y-2 text-sm">{puzzle.groups[0].map((name, row) => <li key={name}><strong>{name}</strong> · {[1, 2, 3].map(g => puzzle.groups[g].find((_, col) => puzzle.solution[g * 4 + col] === puzzle.solution[row])).join(" · ")}</li>)}</ul></Card>}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card id="case-grid" className="min-w-0" style={{ padding: 12 }}><div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold">Your deduction grid</h2><a href="#case-clues" className="inline-flex min-h-11 items-center text-sm text-accent-strong underline lg:hidden">Read clues ↓</a></div>
        <div className="mb-4 flex flex-wrap gap-2" aria-label="Choose deduction grid">{["Rooms", "Objects", "Arrival times"].map((name, i) => <Button key={name} size="sm" className="min-h-11" variant={group === i ? "primary" : "secondary"} aria-pressed={group === i} onClick={() => setGroup(i)}>{name}</Button>)}</div>
        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Cell marking mode">{([[1, "× Exclude"], [2, "✓ Match"], [0, "· Erase"]] as const).map(([value, label]) => <Button key={value} size="sm" className="min-h-11" disabled={progress.solved} aria-pressed={mode === value} variant={mode === value ? "primary" : "ghost"} onClick={() => setMode(value)}>{label}</Button>)}</div>
        <table className="w-full table-fixed border-separate border-spacing-1 text-center text-xs"><caption className="sr-only">People and {group === 0 ? "rooms" : group === 1 ? "objects" : "arrival times"}. Cells are unknown, excluded, or matched.</caption><thead><tr><th scope="col" className="w-14"><span className="sr-only">Person</span></th>{puzzle.groups[group + 1].map(name => <th scope="col" key={name} className="break-words pb-2 align-bottom text-[11px] font-medium leading-tight text-muted">{name}</th>)}</tr></thead>
          <tbody>{puzzle.groups[0].map((person, row) => <tr key={person}><th scope="row" className="text-left text-xs font-medium">{person}</th>{puzzle.groups[group + 1].map((name, col) => {
            const index = group * 16 + row * 4 + col, mark = progress.marks[index];
            return <td key={name}><button type="button" disabled={progress.solved} aria-label={`${person}, ${name}: ${mark === 2 ? "matched" : mark === 1 ? "excluded" : "unknown"}. ${mode === 2 ? "Match" : mode === 1 ? "Exclude" : "Erase"} on tap.`}
              className={cn("min-h-11 w-full rounded-lg border text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent", mark === 2 ? "border-accent bg-accent-soft text-accent-strong" : "border-line bg-raised text-muted")}
              onClick={() => { const marks = store.getSnapshot().data.marks; commit(markCase(marks, index, marks[index] === mode ? 0 : mode)); }}>{mark === 2 ? "✓" : mark === 1 ? "×" : "·"}</button></td>;
          })}</tr>)}</tbody>
        </table>
        <div className="mt-4 flex flex-wrap gap-2"><Button disabled={progress.solved || !progress.history.length} onClick={() => { const current = store.getSnapshot().data; store.save({ ...current, marks: current.history[current.history.length - 1], history: current.history.slice(0, -1) }); setMessage("Last grid edit undone."); }}>Undo</Button>
          <Button disabled={progress.solved} onClick={() => { if (window.confirm("Clear this case's grid notes and crossed-off clues? Revealed-match count stays recorded.")) { const current = store.getSnapshot().data; store.save({ ...emptyCase(), hints: current.hints, history: [...current.history, current.marks].slice(-100) }); setMessage("Grid cleared."); } }}>Clear notes</Button>
          <Button disabled={progress.solved} onClick={reveal}>Reveal a match</Button>
          <Button variant="primary" disabled={progress.solved} onClick={() => { const current = store.getSnapshot().data; const solved = caseSolved(puzzle, current.marks); if (solved) store.save({ ...current, solved: true }); setMessage(solved ? "Case closed. Every clue fits." : "The case is not resolved yet. Each grid needs one match per row and column, and all clues must agree. Your notes are kept."); }}>Check case</Button>
        </div><p className="mt-3 text-xs text-subtle">{progress.marks.filter(mark => mark === 2).length}/12 matches marked · {progress.hints} match reveals</p><p role="status" aria-live="polite" className="mt-3 min-h-10 text-sm text-muted">{message || "Start with a clue that rules out a room, object, or time."}</p>
      </Card>
      <Card id="case-clues"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold">Witness statements</h2><a href="#case-grid" className="inline-flex min-h-11 items-center text-sm text-accent-strong underline lg:hidden">Back to grid ↑</a></div><ol className="space-y-3">{puzzle.clues.map((clue, index) => <li key={index}><label className="flex min-h-11 cursor-pointer items-start gap-3"><input className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-accent)]" type="checkbox" checked={progress.crossed.includes(index)} disabled={progress.solved} onChange={() => { const current = store.getSnapshot().data; store.save({ ...current, crossed: current.crossed.includes(index) ? current.crossed.filter(i => i !== index) : [...current.crossed, index] }); }} /><span className={cn("text-sm leading-relaxed", progress.crossed.includes(index) && "text-subtle line-through")}><span className="text-subtle">{index + 1}. </span>{clueText(puzzle, clue)}</span></label></li>)}</ol></Card>
    </div>
  </>;
}
