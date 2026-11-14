import { permutations, randomFor, shuffled } from "./random";
export type Difficulty = "normal" | "hard";
export type Mark = 0 | 1 | 2; // unknown, excluded, matched
export interface Clue { kind: "same" | "different" | "before" | "adjacent"; a: number; b: number }
export interface CasePuzzle { id: string; title: string; story: string; groups: string[][]; clues: Clue[]; solution: number[]; difficulty: Difficulty }
const orders = permutations([0, 1, 2, 3]);
let possibilities: number[][] | undefined;
export function casePossibilities() {
  return possibilities ??= orders.flatMap(people => orders.flatMap(rooms => orders.map(items => [...people, ...rooms, ...items, 0, 1, 2, 3])));
}
export function fitsClue(solution: number[], clue: Clue) {
  const a = solution[clue.a], b = solution[clue.b];
  return clue.kind === "same" ? a === b : clue.kind === "different" ? a !== b : clue.kind === "before" ? a < b : Math.abs(a - b) === 1;
}
const cases = [
  ["The missing star chart", "A star chart vanished during the observatory's evening reception. Four visitors each entered a different room, carried a different object, and arrived at a different time. Reconstruct their movements; nobody shares a room, object, or arrival time."],
  ["The midnight message", "An unsigned message was left in the Lair. Four visitors were seen in different rooms with different objects at four distinct times. Work out who was where, with what, and when."],
  ["The cabinet of curiosities", "A locked cabinet was found open after a private exhibition. Four visitors, four rooms, four objects, four arrival times. Rebuild the timeline from the witnesses' clues."],
];
export function detectivePuzzle(identity: string, difficulty: Difficulty): CasePuzzle {
  const id = `detective/v1/${identity}/${difficulty}`, random = randomFor(id);
  const solution = [...shuffled([0, 1, 2, 3], random), ...shuffled([0, 1, 2, 3], random), ...shuffled([0, 1, 2, 3], random), 0, 1, 2, 3];
  const groups = [["Mara", "Felix", "Iris", "Theo"], ["Archive", "Gallery", "Study", "Tower"], ["Compass", "Lantern", "Silver key", "Sealed letter"], ["7:00 PM", "7:15 PM", "7:30 PM", "7:45 PM"]];
  let remaining = casePossibilities();
  const pool: Clue[] = [];
  for (let a = 0; a < 12; a++) for (let b = a + 1; b < 16; b++) {
    for (const kind of ["same", "different", "before", "adjacent"] as const) {
      if (Math.floor(a / 4) === Math.floor(b / 4) && (kind === "same" || kind === "different")) continue;
      if (difficulty === "hard" && kind === "same") continue;
      const clue = { kind, a, b };
      if (fitsClue(solution, clue)) pool.push(clue);
      if (kind === "before" && fitsClue(solution, { kind, a: b, b: a })) pool.push({ kind, a: b, b: a });
    }
  }
  const clues: Clue[] = [];
  // Choose from a seeded order, always require useful information. Final pruning
  // removes redundant clues while preserving exactly one complete assignment.
  for (const clue of shuffled(pool, random)) {
    const reduced = remaining.filter(candidate => fitsClue(candidate, clue));
    if (reduced.length < remaining.length) { clues.push(clue); remaining = reduced; }
    if (remaining.length === 1) break;
  }
  if (remaining.length !== 1) throw new Error("Case generation did not establish a unique solution.");
  for (let i = clues.length - 1; i >= 0; i--) {
    const rest = clues.filter((_, j) => j !== i);
    if (casePossibilities().filter(candidate => rest.every(clue => fitsClue(candidate, clue))).length === 1) clues.splice(i, 1);
  }
  const [title, story] = cases[Math.floor(random() * cases.length)];
  return { id, title, story, groups, clues, solution, difficulty };
}
function subject(puzzle: CasePuzzle, entity: number) {
  const group = Math.floor(entity / 4), name = puzzle.groups[group][entity % 4];
  return group === 0 ? name : group === 1 ? `the visitor in the ${name}` : group === 2 ? `the visitor carrying the ${name.toLowerCase()}` : `the visitor who arrived at ${name}`;
}
export function clueText(puzzle: CasePuzzle, clue: Clue) {
  const a = subject(puzzle, clue.a), b = subject(puzzle, clue.b);
  return `${a[0].toUpperCase()}${a.slice(1)} ${clue.kind === "same" ? "was" : clue.kind === "different" ? "was not" : clue.kind === "before" ? "arrived earlier than" : "arrived exactly 15 minutes before or after"} ${b}.`;
}
export const emptyMarks = () => Array<Mark>(48).fill(0);
export function markCase(marks: Mark[], index: number, mark: Mark): Mark[] {
  if (!Number.isInteger(index) || index < 0 || index >= 48) throw new Error("Invalid grid cell.");
  const next = [...marks], group = Math.floor(index / 16), row = Math.floor(index % 16 / 4), col = index % 4;
  if (mark === 2) for (let i = 0; i < 4; i++) { next[group * 16 + row * 4 + i] = 1; next[group * 16 + i * 4 + col] = 1; }
  next[index] = mark;
  return next;
}
export function caseSolved(puzzle: CasePuzzle, marks: Mark[]) {
  return marks.length === 48 && [1, 2, 3].every(group => [0, 1, 2, 3].every(person => {
    const expected = [0, 1, 2, 3].find(col => puzzle.solution[group * 4 + col] === puzzle.solution[person]);
    return [0, 1, 2, 3].every(col => marks[(group - 1) * 16 + person * 4 + col] === (col === expected ? 2 : 1));
  }));
}
export interface CaseProgress { marks: Mark[]; history: Mark[][]; crossed: number[]; hints: number; solved: boolean }
export const emptyCase = (): CaseProgress => ({ marks: emptyMarks(), history: [], crossed: [], hints: 0, solved: false });
export function validateCase(value: unknown): value is CaseProgress {
  const data = value as CaseProgress;
  const board = (marks: unknown): marks is Mark[] => Array.isArray(marks) && marks.length === 48 && marks.every(mark => [0, 1, 2].includes(mark));
  return !!data && board(data.marks) && Array.isArray(data.history) && data.history.length <= 100 && data.history.every(board) && Array.isArray(data.crossed) && data.crossed.length <= 100 && data.crossed.every(i => Number.isInteger(i) && i >= 0 && i < 100) && Number.isInteger(data.hints) && data.hints >= 0 && data.hints <= 10000 && typeof data.solved === "boolean";
}
