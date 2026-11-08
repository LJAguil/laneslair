import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addGuess, dailyLock, emptyProgress, type PlayProgress } from "./rune-lock";
const mock=vi.hoisted(()=>({progress:null as PlayProgress|null,guess:vi.fn(),hint:vi.fn(),streak:vi.fn(),retry:vi.fn()}));
vi.mock("@/lib/store/app-store",()=>({useAppState:()=>({today:"2026-11-07"})}));
vi.mock("@/components/play/play-provider",()=>({usePlay:()=>({status:"ready",error:null,progress:mock.progress,store:{guess:mock.guess,hint:mock.hint,streak:mock.streak},retry:mock.retry})}));
import { RuneLockView } from "@/components/play/rune-lock-view";
import { PuzzleCard } from "@/components/play/puzzle-card";
import { navItems } from "@/components/shell/nav-items";

beforeEach(()=>{mock.progress=emptyProgress();vi.clearAllMocks();});
describe("Daily Play entry points and accessible markup (simulated)",()=>{
  it("offers a real protected destination without changing the four primary mobile destinations",()=>{
    expect(navItems.slice(0,4).map(item=>item.href)).toEqual(["/","/inbox","/tasks","/projects"]);
    expect(navItems.find(item=>item.href==="/play")?.label).toBe("Daily Play");
    expect(renderToStaticMarkup(createElement(PuzzleCard))).toContain('href="/play/rune-lock"');
  });
  it("explains repeats and local persistence, names every input, and starts streaks opted out",()=>{
    const html=renderToStaticMarkup(createElement(RuneLockView));
    expect(html).toContain("runes may repeat");expect(html).toContain("Show my puzzle streak");expect(html).not.toContain('checked=""');
    expect(html).toContain('aria-label="Add Key to combination"');expect(html).toContain('aria-label="Position 1, empty"');
    expect(html).toContain("don’t sync between devices yet");
    expect(mock.guess).not.toHaveBeenCalled();expect(mock.hint).not.toHaveBeenCalled();
  });
  it("renders clue names as well as color, and completion without an active guessing form",()=>{
    mock.progress=addGuess(emptyProgress(),"2026-11-07",dailyLock("2026-11-07"));
    const html=renderToStaticMarkup(createElement(RuneLockView));
    expect(html).toContain("Right rune, right position");expect(html).toContain("The lock opens");expect(html).toContain("Copy spoiler-free result");
    expect(html).not.toContain("Try combination");expect(renderToStaticMarkup(createElement(PuzzleCard))).toContain("View today’s lock");
  });
});
