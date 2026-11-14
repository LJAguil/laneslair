import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe,it,expect,vi } from "vitest";
import { emptyProgress } from "./rune-lock";
vi.mock("@/lib/store/app-store",()=>({useAppState:()=>({today:'2026-11-08'})}));
vi.mock("@/components/play/play-provider",()=>({usePlay:()=>({progress:emptyProgress(),status:'ready',error:null,sync:null})}));
import { PlayHub } from "@/components/play/play-hub";
import { RuneLockView } from "@/components/play/rune-lock-view";
import { gameCatalog } from "./catalog";
describe('Daily Play hub (simulated markup)',()=>{
 it('features the Casebook and labyrinth while preserving existing games and sync activation',()=>{const html=renderToStaticMarkup(createElement(PlayHub));expect(gameCatalog.map(game=>game.id)).toEqual(['detective','labyrinth','rune-lock','chess','echoes']);expect(html).toContain('href="/play/detective"');expect(html).toContain('href="/play/labyrinth"');expect(html).toContain('href="/play/rune-lock"');expect(html).toContain('href="/play/chess"');expect(html).toContain('href="/play/echoes"');expect(html).toContain('Preview account import');expect(html).toContain('Saved on this device');expect(html).not.toContain('Confirm import and enable sync');});
 it('keeps the working game separate, names controls and preserves local-only disclosure',()=>{const html=renderToStaticMarkup(createElement(RuneLockView));expect(html).toContain('Try combination');expect(html).toContain('Account sync is optional');expect(html).toContain('Show my puzzle streak');expect(html).toContain('aria-label="Add Key to combination"');});
});
