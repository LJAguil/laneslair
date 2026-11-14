import { describe, expect, it } from "vitest";
import { casePossibilities, caseSolved, detectivePuzzle, emptyMarks, fitsClue, markCase, validateCase, type Difficulty } from "./detective";
import { emptyMaze, extendMaze, labyrinthPuzzle, mazeSolved, solveMaze, validateMaze } from "./labyrinth";

describe("The Casebook", () => {
  it("generates deterministic, uniquely solvable daily and practice cases at both difficulties", () => {
    for (const difficulty of ["normal", "hard"] as Difficulty[]) for (let day = 1; day <= 20; day++) {
      const identity = `2026-11-${String(day).padStart(2, "0")}${day % 2 ? "/practice-2" : ""}`;
      const puzzle = detectivePuzzle(identity, difficulty);
      expect(puzzle.clues.every(clue => fitsClue(puzzle.solution, clue))).toBe(true);
      const solutions = casePossibilities().filter(candidate => puzzle.clues.every(clue => fitsClue(candidate, clue)));
      expect(solutions).toEqual([puzzle.solution]);
      if (difficulty === "hard") expect(puzzle.clues.some(clue => clue.kind === "same")).toBe(false);
      expect(detectivePuzzle(identity, difficulty)).toEqual(puzzle);
    }
  }, 30000);
  it("requires a complete correct assignment; row/column propagation and undo copies never mutate the input", () => {
    const puzzle = detectivePuzzle("2026-11-13", "hard");
    let marks = emptyMarks();
    expect(caseSolved(puzzle, marks)).toBe(false);
    for (let group = 1; group <= 3; group++) for (let row = 0; row < 4; row++) {
      const col = [0, 1, 2, 3].find(i => puzzle.solution[group * 4 + i] === puzzle.solution[row])!;
      const previous = [...marks]; const next = markCase(marks, (group - 1) * 16 + row * 4 + col, 2);
      expect(marks).toEqual(previous); marks = next;
    }
    expect(caseSolved(puzzle, marks)).toBe(true);
    expect(caseSolved(puzzle, markCase(marks, 0, marks[0] === 2 ? 1 : 2))).toBe(false);
    expect(validateCase({ marks, history: [], crossed: [], hints: 0, solved: true })).toBe(true);
    expect(validateCase({ marks: [3], history: [], crossed: [], hints: 0, solved: false })).toBe(false);
  });
});
describe("The Labyrinth", () => {
  it("verifies exactly one legal route without treating a solver budget limit as proof", () => {
    for (const difficulty of ["normal", "hard"] as Difficulty[]) for (let day = 1; day <= 30; day++) {
      const puzzle = labyrinthPuzzle(`2026-11-${String(day).padStart(2, "0")}`, difficulty);
      const result = solveMaze(puzzle);
      expect(result.exhausted).toBe(false);
      expect(result.solutions).toEqual([puzzle.solution]);
      expect(mazeSolved(puzzle, puzzle.solution)).toBe(true);
      expect(mazeSolved(puzzle, puzzle.solution.slice(0, -1))).toBe(false);
      expect(validateMaze(emptyMaze(puzzle), puzzle)).toBe(true);
    }
    const puzzle = labyrinthPuzzle("2026-11-13/practice-3", "hard");
    expect(solveMaze(puzzle, 2, 1).exhausted).toBe(true);
    expect(labyrinthPuzzle("2026-11-13/practice-3", "hard")).toEqual(puzzle);
  }, 30000);
  it("supports adjacent steps and backtracking, rejecting walls, jumps and forged completion", () => {
    const puzzle = labyrinthPuzzle("2026-11-13", "normal"), initial = [puzzle.start];
    const step = extendMaze(puzzle, initial, puzzle.solution[1]);
    expect(step).toEqual(puzzle.solution.slice(0, 2)); expect(initial).toEqual([puzzle.start]);
    expect(extendMaze(puzzle, step, puzzle.start)).toEqual(initial);
    expect(extendMaze(puzzle, step, -1)).toEqual(step);
    for (const wall of puzzle.walls) expect(extendMaze(puzzle, step, wall)).toEqual(step);
    expect(mazeSolved(puzzle, [...puzzle.solution, puzzle.start])).toBe(false);
    expect(validateMaze({ ...emptyMaze(puzzle), solved: true }, puzzle)).toBe(false);
  });
});
