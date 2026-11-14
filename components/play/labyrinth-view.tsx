"use client";
import { useMemo, useRef, useState, type PointerEvent } from "react";
import { Route } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useAppState } from "@/lib/store/app-store";
import { emptyMaze, extendMaze, labyrinthPuzzle, mazeCounts, mazeSolved, validateMaze, type MazeProgress, type MazePuzzle } from "@/lib/games/deduction/labyrinth";
import type { Difficulty } from "@/lib/games/deduction/detective";
import type { PuzzleStore } from "@/lib/games/deduction/storage";
import { cn } from "@/lib/utils";
import { GamesLink, PuzzleChoices, PuzzleSaveState } from "./deduction-controls";
import { useLocalPuzzle } from "./use-local-puzzle";

export function LabyrinthView() {
  const { today } = useAppState();
  const [difficulty, setDifficulty] = useState<Difficulty>("normal"), [practice, setPractice] = useState(0);
  const identity = practice ? `${today}/practice-${practice}` : today;
  const puzzle = useMemo(() => labyrinthPuzzle(identity, difficulty), [identity, difficulty]);
  return <div className="mx-auto max-w-2xl space-y-5"><GamesLink /><PageHeader title="The Labyrinth" description="Draw the only route that satisfies every clue." />
    <PuzzleChoices difficulty={difficulty} onDifficulty={setDifficulty} practice={practice} onPractice={() => setPractice(value => value + 1)} onDaily={() => setPractice(0)} />
    <MazeSession key={puzzle.id} puzzle={puzzle} />
  </div>;
}
function MazeSession({ puzzle }: { puzzle: MazePuzzle }) {
  const initial = useMemo(() => emptyMaze(puzzle), [puzzle]);
  const validate = useMemo(() => (value: unknown): value is MazeProgress => validateMaze(value, puzzle), [puzzle]);
  const saved = useLocalPuzzle(puzzle.id, initial, validate);
  return <><PuzzleSaveState {...saved} />{saved.store && <LabyrinthBoard puzzle={puzzle} progress={saved.data} store={saved.store} />}</>;
}
export function LabyrinthBoard({ puzzle, progress, store }: { puzzle: MazePuzzle; progress: MazeProgress; store: PuzzleStore<MazeProgress> }) {
  const [message, setMessage] = useState("");
  const dragging = useRef(false), lastCell = useRef<number | null>(null);
  const counts = mazeCounts(progress.path, puzzle.size);
  function commit(path: number[], hint = false) {
    const current = store.getSnapshot().data;
    if (current.solved || path.join() === current.path.join()) return;
    const solved = mazeSolved(puzzle, path);
    store.save({ path, history: [...current.history, current.path].slice(-100), hints: current.hints + Number(hint), solved });
    setMessage(solved ? "Route complete. Every checkpoint and row/column clue fits." : hint ? "Next step revealed. A wrong turn may have been replaced; Undo keeps your previous route." : "Route updated. Check the counts and numbered checkpoints.");
  }
  function choose(cell: number) {
    const current = store.getSnapshot().data;
    const next = extendMaze(puzzle, current.path, cell);
    if (next.join() === current.path.join() && cell !== current.path[current.path.length - 1]) setMessage("Choose an adjacent open square, or tap an earlier route square to backtrack.");
    commit(next);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-maze-cell]");
    if (!element || !event.currentTarget.contains(element)) return;
    const cell = Number(element.dataset.mazeCell);
    if (cell !== lastCell.current) { lastCell.current = cell; choose(cell); }
  }
  return <Card className="space-y-4" style={{ padding: 12 }}><CardHeader title={progress.solved ? "A path through the Lair" : "Trace your route"} description={`${puzzle.size} × ${puzzle.size} · exactly one verified route`} icon={<Route className="h-5 w-5" />} />
    <p className="text-sm leading-relaxed text-muted">Start at S and reach E. Pass through 1, then 2. Each number beside the board is the exact number of route squares in that row or column, including S, E, and checkpoints. Move horizontally or vertically; never revisit a square.</p>
    <p className="text-xs text-subtle">Tap adjacent squares or drag from the route. Tap an earlier route square to backtrack. Counts show used / required; ! means too many. Dragging is optional. The board scrolls sideways on very narrow screens to keep touch targets large.</p>
    <div className="overflow-x-auto pb-2" role="region" aria-label="Labyrinth board; scroll horizontally if needed" tabIndex={0}>
      <div className="mx-auto grid max-w-md gap-1" style={{ gridTemplateColumns: `1.7rem repeat(${puzzle.size}, minmax(44px, 1fr))`, minWidth: puzzle.size * 48 + 28 }} onPointerMove={move} onPointerUp={() => { dragging.current = false; lastCell.current = null; }} onPointerCancel={() => { dragging.current = false; lastCell.current = null; }}>
        <span aria-hidden="true" />{puzzle.cols.map((target, col) => <span key={`col-${col}`} aria-label={`Column ${col + 1}: ${counts.cols[col]} of ${target}`} className={cn("py-2 text-center text-xs", counts.cols[col] > target ? "font-semibold text-danger" : counts.cols[col] === target ? "text-success" : "text-muted")}>{counts.cols[col]}/{target}{counts.cols[col] > target ? "!" : ""}</span>)}
        {Array.from({ length: puzzle.size }, (_, row) => <MazeRow key={row} row={row} puzzle={puzzle} path={progress.path} count={counts.rows[row]} complete={progress.solved} choose={choose} pointerDown={(event, cell) => {
          if (event.button !== 0 || progress.solved) return;
          event.preventDefault(); dragging.current = true; lastCell.current = cell; event.currentTarget.setPointerCapture(event.pointerId); choose(cell);
        }} />)}
      </div>
    </div>
    <div className="flex flex-wrap gap-2"><Button disabled={progress.solved || !progress.history.length} onClick={() => { const current = store.getSnapshot().data; store.save({ ...current, path: current.history[current.history.length - 1], history: current.history.slice(0, -1) }); setMessage("Last route edit undone."); }}>Undo</Button>
      <Button disabled={progress.solved || progress.path.length === 1} onClick={() => { const current = store.getSnapshot().data; commit(current.path.slice(0, -1)); }}>Back one square</Button>
      <Button disabled={progress.solved || progress.path.length === 1} onClick={() => { if (window.confirm("Clear this route? Hint use stays recorded.")) commit([puzzle.start]); }}>Clear route</Button>
      <Button disabled={progress.solved} onClick={() => { const current = store.getSnapshot().data; let shared = 0; while (shared < current.path.length && current.path[shared] === puzzle.solution[shared]) shared++; commit(puzzle.solution.slice(0, Math.min(shared + 1, puzzle.solution.length)), true); }}>Reveal next step</Button>
    </div>
    <p role="status" aria-live="polite" className={cn("min-h-10 text-sm", progress.solved ? "text-success" : "text-muted")}>{message || (progress.solved ? "Labyrinth solved. Every clue fits." : "S is marked. Choose your first step.")}</p>
    <p className="text-xs text-subtle">{progress.path.length} route squares · {progress.hints} revealed steps · last 100 edits available to undo</p>
  </Card>;
}
function MazeRow({ row, puzzle, path, count, complete, choose, pointerDown }: { row: number; puzzle: MazePuzzle; path: number[]; count: number; complete: boolean; choose: (cell: number) => void; pointerDown: (event: PointerEvent<HTMLButtonElement>, cell: number) => void }) {
  return <><span aria-label={`Row ${row + 1}: ${count} of ${puzzle.rows[row]}`} className={cn("self-center text-center text-xs", count > puzzle.rows[row] ? "font-semibold text-danger" : count === puzzle.rows[row] ? "text-success" : "text-muted")}>{count}/{puzzle.rows[row]}{count > puzzle.rows[row] ? "!" : ""}</span>
    {Array.from({ length: puzzle.size }, (_, col) => {
      const cell = row * puzzle.size + col, index = path.indexOf(cell), wall = puzzle.walls.includes(cell), checkpoint = puzzle.checkpoints.indexOf(cell);
      const symbol = wall ? "■" : cell === puzzle.start ? "S" : cell === puzzle.end ? "E" : checkpoint >= 0 ? String(checkpoint + 1) : index >= 0 ? "•" : "";
      const directions = index < 0 ? [] : [path[index - 1], path[index + 1]].filter((n): n is number => n !== undefined).map(next => next === cell - 1 ? "left" : next === cell + 1 ? "right" : next < cell ? "up" : "down");
      return <button key={cell} type="button" data-maze-cell={cell} disabled={wall || complete} aria-label={`Row ${row + 1}, column ${col + 1}${wall ? ", blocked" : cell === puzzle.start ? ", start" : cell === puzzle.end ? ", exit" : checkpoint >= 0 ? `, checkpoint ${checkpoint + 1}` : ""}${index >= 0 ? `, route step ${index + 1}` : ", unused"}`} aria-pressed={index >= 0}
        className={cn("relative aspect-square min-h-11 touch-none select-none overflow-hidden rounded-lg border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent", wall ? "border-line bg-raised text-subtle" : index >= 0 ? "border-accent bg-accent-soft text-accent-strong" : "border-line bg-raised text-muted")}
        onPointerDown={event => pointerDown(event, cell)} onClick={event => { if (event.detail === 0) choose(cell); }}>
        {directions.map(direction => <span key={direction} aria-hidden="true" className={cn("absolute bg-accent/60", direction === "left" ? "left-0 top-[calc(50%-2px)] h-1 w-1/2" : direction === "right" ? "right-0 top-[calc(50%-2px)] h-1 w-1/2" : direction === "up" ? "left-[calc(50%-2px)] top-0 h-1/2 w-1" : "bottom-0 left-[calc(50%-2px)] h-1/2 w-1")} />)}
        <span className={cn("relative z-10 rounded px-1 font-semibold", symbol && index >= 0 && "bg-panel")}>{symbol}</span>
      </button>;
    })}</>;
}
