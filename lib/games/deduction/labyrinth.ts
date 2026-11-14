import { randomFor, shuffled } from "./random";
import type { Difficulty } from "./detective";
export interface MazePuzzle { id: string; size: number; start: number; end: number; checkpoints: number[]; walls: number[]; rows: number[]; cols: number[]; solution: number[] }
export function neighbours(cell: number, size: number) {
  const row = Math.floor(cell / size), col = cell % size;
  return [row > 0 ? cell - size : -1, col < size - 1 ? cell + 1 : -1, row < size - 1 ? cell + size : -1, col > 0 ? cell - 1 : -1].filter(n => n >= 0);
}
export function mazeCounts(path: number[], size: number) {
  const rows = Array<number>(size).fill(0), cols = Array<number>(size).fill(0);
  for (const cell of path) { rows[Math.floor(cell / size)]++; cols[cell % size]++; }
  return { rows, cols };
}
/** Enumerate actual routes; budget exhaustion is never accepted as uniqueness. */
export function solveMaze(puzzle: MazePuzzle, limit = 2, budget = 150000) {
  const solutions: number[][] = [], visited = new Set<number>(), path: number[] = [];
  const rows = Array<number>(puzzle.size).fill(0), cols = [...rows], walls = new Set(puzzle.walls);
  const length = puzzle.rows.reduce((a, b) => a + b, 0); let nodes = 0, exhausted = false;
  function visit(cell: number, checkpoint: number) {
    if (solutions.length >= limit || exhausted) return;
    if (++nodes > budget) { exhausted = true; return; }
    const row = Math.floor(cell / puzzle.size), col = cell % puzzle.size;
    if (visited.has(cell) || walls.has(cell) || rows[row] >= puzzle.rows[row] || cols[col] >= puzzle.cols[col]) return;
    const numbered = puzzle.checkpoints.indexOf(cell);
    if (numbered >= 0 && numbered !== checkpoint) return;
    const nextCheckpoint = numbered >= 0 ? checkpoint + 1 : checkpoint;
    path.push(cell); visited.add(cell); rows[row]++; cols[col]++;
    if (cell === puzzle.end) {
      if (path.length === length && nextCheckpoint === puzzle.checkpoints.length && rows.every((n, i) => n === puzzle.rows[i]) && cols.every((n, i) => n === puzzle.cols[i])) solutions.push([...path]);
    } else if (path.length < length && Math.abs(row - Math.floor(puzzle.end / puzzle.size)) + Math.abs(col - puzzle.end % puzzle.size) <= length - path.length) {
      for (const next of neighbours(cell, puzzle.size)) visit(next, nextCheckpoint);
    }
    path.pop(); visited.delete(cell); rows[row]--; cols[col]--;
  }
  visit(puzzle.start, 0);
  return { solutions, exhausted, nodes };
}
export function labyrinthPuzzle(identity: string, difficulty: Difficulty): MazePuzzle {
  const id = `labyrinth/v1/${identity}/${difficulty}`, random = randomFor(id), size = difficulty === "hard" ? 6 : 5;
  const length = difficulty === "hard" ? 22 : 15;
  for (let candidate = 0; candidate < 128; candidate++) {
    let route: number[] = [];
    for (let attempt = 0; attempt < 256 && route.length < length; attempt++) {
      route = [Math.floor(random() * size)];
      while (route.length < length) {
        const options = shuffled(neighbours(route[route.length - 1], size).filter(cell => !route.includes(cell)), random);
        if (!options.length) break;
        route.push(options[0]);
      }
    }
    if (route.length < length) continue;
    const checkpoints = [Math.floor(length / 3), Math.floor(length * 2 / 3)].map(index => route[index]);
    const puzzle: MazePuzzle = { id, size, start: route[0], end: route[route.length - 1], checkpoints, walls: [], ...mazeCounts(route, size), solution: route };
    const unused = shuffled(Array.from({ length: size * size }, (_, i) => i).filter(cell => !route.includes(cell)), random);
    for (let i = 0; i <= unused.length; i++) {
      const result = solveMaze(puzzle);
      if (!result.exhausted && result.solutions.length === 1) return puzzle;
      const alternative = result.solutions.find(path => path.join() !== route.join());
      // A different ordering of exactly the same cells cannot be fixed by
      // blocking unused cells. Discard that board instead of claiming uniqueness.
      if (alternative && alternative.every(cell => route.includes(cell))) break;
      const wall = alternative?.find(cell => !route.includes(cell)) ?? unused.find(cell => !puzzle.walls.includes(cell));
      if (wall === undefined) break;
      puzzle.walls.push(wall);
    }
  }
  // Guaranteed simple corridor fallback: alternating open rows joined at their
  // ends. No cell has a shortcut to a non-consecutive route cell.
  const route: number[] = [];
  for (let row = 0; row < size; row += 2) {
    const cols = Array.from({ length: size }, (_, col) => col);
    if ((row / 2) % 2) cols.reverse();
    if (row > 0) route.push((row - 1) * size + cols[0]);
    route.push(...cols.map(col => row * size + col));
  }
  const fallback: MazePuzzle = { id, size, start: route[0], end: route[route.length - 1], checkpoints: [route[Math.floor(route.length / 3)], route[Math.floor(route.length * 2 / 3)]], walls: Array.from({ length: size * size }, (_, cell) => cell).filter(cell => !route.includes(cell)), ...mazeCounts(route, size), solution: route };
  if (solveMaze(fallback).solutions.length !== 1) throw new Error("Invalid fallback labyrinth.");
  return fallback;
}
export function extendMaze(puzzle: MazePuzzle, path: number[], cell: number): number[] {
  if (!Number.isInteger(cell) || cell < 0 || cell >= puzzle.size * puzzle.size || puzzle.walls.includes(cell)) return path;
  const earlier = path.indexOf(cell);
  if (earlier >= 0) return path.slice(0, earlier + 1);
  if (!path.length) return cell === puzzle.start ? [cell] : path;
  return neighbours(path[path.length - 1], puzzle.size).includes(cell) ? [...path, cell] : path;
}
export function mazeSolved(puzzle: MazePuzzle, path: number[]) {
  if (!path.length || path[0] !== puzzle.start || path[path.length - 1] !== puzzle.end || new Set(path).size !== path.length || path.some((cell, i) => puzzle.walls.includes(cell) || !Number.isInteger(cell) || cell < 0 || cell >= puzzle.size * puzzle.size || (i > 0 && !neighbours(path[i - 1], puzzle.size).includes(cell)))) return false;
  let last = -1;
  for (const cell of puzzle.checkpoints) { const index = path.indexOf(cell); if (index <= last) return false; last = index; }
  const counts = mazeCounts(path, puzzle.size);
  return counts.rows.every((n, i) => n === puzzle.rows[i]) && counts.cols.every((n, i) => n === puzzle.cols[i]);
}
export interface MazeProgress { path: number[]; history: number[][]; hints: number; solved: boolean }
export const emptyMaze = (puzzle: MazePuzzle): MazeProgress => ({ path: [puzzle.start], history: [], hints: 0, solved: false });
export function validateMaze(value: unknown, puzzle: MazePuzzle): value is MazeProgress {
  const data = value as MazeProgress;
  const validPath = (path: unknown): path is number[] => Array.isArray(path) && path.length > 0 && path.length <= puzzle.size ** 2 && path[0] === puzzle.start && new Set(path).size === path.length && path.every((cell, i) => Number.isInteger(cell) && cell >= 0 && cell < puzzle.size ** 2 && !puzzle.walls.includes(cell) && (i === 0 || neighbours(path[i - 1], puzzle.size).includes(cell)));
  return !!data && validPath(data.path) && Array.isArray(data.history) && data.history.length <= 100 && data.history.every(validPath) && Number.isInteger(data.hints) && data.hints >= 0 && data.hints <= 10000 && typeof data.solved === "boolean" && (!data.solved || mazeSolved(puzzle, data.path));
}
