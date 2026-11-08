import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe,it,expect } from "vitest";
import { Chess } from "chess.js";
import { ChessBoard } from "@/components/play/chess-board";
import { ChessGame } from "@/components/play/chess-view";
import { emptyChess,emptyDay,chessKey,puzzleFor } from "./rules";
import { createChessStore } from "./store";
const storage=()=>({getItem:()=>null,setItem:()=>{}});
describe('chess board markup (simulated, not a touch/browser test)',()=>{
 it('names every square/piece, exposes orientation and provides one tab stop plus arrow navigation instructions',()=>{const html=renderToStaticMarkup(createElement(ChessBoard,{board:new Chess(),orientation:'b',selected:null,onSquare:()=>{},complete:false}));expect((html.match(/role="gridcell"/g)??[])).toHaveLength(64);expect((html.match(/tabindex="0"/g)??[])).toHaveLength(1);expect(html).toContain('Black at bottom');expect(html).toContain('e1, White king');expect(html).toContain('a8, Black rook');expect(html).toContain('Arrow keys navigate');});
 it('distinguishes selected pieces and legal destinations with accessible names',()=>{const html=renderToStaticMarkup(createElement(ChessBoard,{board:new Chess(),orientation:'w',selected:'e2',onSquare:()=>{},complete:false}));expect(html).toContain('e2, White pawn, selected');expect(html).toContain('e4, empty, legal destination');expect(html).toContain('aria-selected="true"');});
 it('discloses repetition/source, supports hints and only reveals explanation on completion',()=>{const date='2026-11-09',p=puzzleFor(date,'beginner'),progress=emptyChess(),store=createChessStore('A',storage());let html=renderToStaticMarkup(createElement(ChessGame,{date,progress,store}));expect(html).toContain('Reveal a hint');expect(html).toContain('repeating every two days');expect(html).not.toContain('Why it works');progress.days[chessKey(date,'beginner')]={...emptyDay(p),moves:['a1h1']};html=renderToStaticMarkup(createElement(ChessGame,{date,progress,store}));expect(html).toContain('Why it works');expect(html).toContain('solved');expect(html).not.toContain('Reveal a hint');});
});
