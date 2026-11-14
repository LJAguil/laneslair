import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DetectiveBoard } from "@/components/play/detective-view";
import { LabyrinthBoard } from "@/components/play/labyrinth-view";
import { FeaturedPuzzleCard } from "@/components/play/featured-puzzle-card";
import { detectivePuzzle, emptyCase, validateCase } from "./detective";
import { emptyMaze, labyrinthPuzzle, validateMaze } from "./labyrinth";
import { createPuzzleStore } from "./storage";
const disk = { getItem: () => null, setItem: () => {} };
describe("new puzzle boards (simulated markup, not iPhone acceptance)", () => {
  it("exposes named grid cells, witness clues and non-destructive checking controls", () => {
    const puzzle = detectivePuzzle("2026-11-13", "normal"), progress = emptyCase();
    const store = createPuzzleStore("case", progress, validateCase, disk);
    const html = renderToStaticMarkup(createElement(DetectiveBoard, { puzzle, progress, store }));
    expect(html).toContain("Your deduction grid"); expect(html).toContain("Witness statements");
    expect(html).toContain("Mara, Archive: unknown"); expect(html).toContain("Check case"); expect(html).toContain("Reveal a match");
    expect(html).toContain('type="button"'); expect(html).toContain('aria-live="polite"'); expect(html).toContain('scope="row"');
  });
  it("labels route coordinates, checkpoint order and used/required counts, with tap and undo alternatives", () => {
    const puzzle = labyrinthPuzzle("2026-11-13", "hard"), progress = emptyMaze(puzzle);
    const store = createPuzzleStore("maze", progress, (value): value is typeof progress => validateMaze(value, puzzle), disk);
    const html = renderToStaticMarkup(createElement(LabyrinthBoard, { puzzle, progress, store }));
    expect(html).toContain("Row 1, column 1"); expect(html).toContain("checkpoint 1"); expect(html).toContain("checkpoint 2");
    expect(html).toContain("Back one square"); expect(html).toContain("Reveal next step"); expect(html).toContain("used / required");
    expect(html).toContain("minmax(44px, 1fr)"); expect(html).toContain('aria-pressed="true"');
  });
  it("features detective play and links to the labyrinth", () => {
    const html = renderToStaticMarkup(createElement(FeaturedPuzzleCard));
    expect(html).toContain('href="/play/detective"'); expect(html).toContain('href="/play/labyrinth"');
    expect(html).not.toContain('href="/play/rune-lock"');
  });
});
