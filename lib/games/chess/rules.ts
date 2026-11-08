import { Chess,type Square } from "chess.js";
import { CHESS_PACK,DIFFICULTIES,type ChessPuzzle,type Difficulty } from "./pack";
import { validDay } from "../rune-lock";
import { addDays } from "@/lib/dates";
import { puzzleKey } from "../catalog";
export interface ChessEvent {id:string;kind:"hint"|"mistake";ply:number;move?:string}
export interface ChessDay {puzzleId:string;moves:string[];events:ChessEvent[]}
export const sameEvent=(a:ChessEvent,b:ChessEvent)=>a.id===b.id&&a.kind===b.kind&&a.ply===b.ply&&a.move===b.move;
export interface ChessProgress {version:1;showStreak:boolean;difficulty:Difficulty;days:Record<string,ChessDay>}
export const emptyChess=():ChessProgress=>({version:1,showStreak:false,difficulty:"beginner",days:{}});
export const chessKey=(date:string,difficulty:Difficulty)=>puzzleKey({game:"chess",version:1,date,difficulty});
export function puzzleFor(date:string,difficulty:Difficulty){
 if(!validDay(date)||!DIFFICULTIES.includes(difficulty))throw new Error("Choose a valid date and difficulty.");
 const pool=CHESS_PACK.filter(p=>p.difficulty===difficulty);return pool[((Math.floor(Date.parse(`${date}T00:00:00Z`)/86400000)%pool.length)+pool.length)%pool.length];
}
export const uci=(move:string)=>{if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move))throw new Error("Choose a legal move, including a promotion piece if needed.");return {from:move.slice(0,2) as Square,to:move.slice(2,4) as Square,...(move[4]?{promotion:move[4]}:{})};};
export function startPuzzle(puzzle:ChessPuzzle){const board=new Chess(puzzle.fen);const setup=puzzle.setup?board.move(uci(puzzle.setup)):null;return {board,setup};}
export function replay(puzzle:ChessPuzzle,moves:readonly string[]){
 const {board,setup}=startPuzzle(puzzle),player=board.turn();const history:{san:string;role:"you"|"opponent"}[]=[];let complete=false;
 for(let index=0;index<moves.length;index++){
   if(complete)throw new Error("This puzzle is already solved.");
   const expected=puzzle.line[index*2];if(!expected)throw new Error("Invalid solution history.");
   const move=board.move(uci(moves[index]));
   if(moves[index]!==expected&&!board.isCheckmate())throw new Error("That move is legal, but is not the tactical solution. Try again.");
   history.push({san:move.san,role:"you"});complete=board.isCheckmate()||index*2===puzzle.line.length-1;
   if(!complete){const reply=board.move(uci(puzzle.line[index*2+1]));history.push({san:reply.san,role:"opponent"});}
 }
 return {board,setup,player,history,complete};
}
export function validatePuzzle(puzzle:ChessPuzzle){
 if(!puzzle.line.length||puzzle.line.length%2!==1)throw new Error("A solution must finish with a player move.");
 const result=replay(puzzle,puzzle.line.filter((_,index)=>index%2===0));if(!result.complete)throw new Error("Incomplete puzzle");return result;
}
export function emptyDay(puzzle:ChessPuzzle):ChessDay{return {puzzleId:puzzle.id,moves:[],events:[]};}
export function playMove(puzzle:ChessPuzzle,day:ChessDay,move:string,id=crypto.randomUUID()):{day:ChessDay;message:string}{
 const position=replay(puzzle,day.moves);if(position.complete)throw new Error("Already solved. A fresh puzzle arrives on another date.");
 // Chess.js handles legality. Illegal moves leave both board and attempts unchanged.
 try{position.board.move(uci(move));}catch{throw new Error("That move is illegal in this position. Choose another square.");}
 try{replay(puzzle,[...day.moves,move]);return {day:{...day,moves:[...day.moves,move]},message:"Correct move."};}
 catch{return {day:{...day,events:[...day.events,{id,kind:"mistake",ply:day.moves.length,move}]},message:"Legal move, but not this tactic. The board is unchanged; try again."};}
}
export function hint(puzzle:ChessPuzzle,day:ChessDay,id=crypto.randomUUID()):ChessDay{
 if(replay(puzzle,day.moves).complete||day.events.some(e=>e.kind==="hint"&&e.ply===day.moves.length))return day;
 return {...day,events:[...day.events,{id,kind:"hint",ply:day.moves.length}]};
}
export function mergeChess(a:ChessProgress,b:ChessProgress):ChessProgress{
 const days={...a.days};for(const [key,next] of Object.entries(b.days)){
   const old=days[key];if(!old){days[key]=next;continue;}
   if(old.puzzleId!==next.puzzleId||old.moves.slice(0,Math.min(old.moves.length,next.moves.length)).some((m,i)=>m!==next.moves[i]))throw new Error(`Different chess branches for ${key}. Both copies are preserved.`);
   const events=new Map(old.events.map(e=>[e.id,e]));for(const event of next.events){const saved=events.get(event.id);if(saved&&!sameEvent(saved,event))throw new Error("Conflicting chess event. Both copies are preserved.");events.set(event.id,event);}
   days[key]={puzzleId:old.puzzleId,moves:old.moves.length>next.moves.length?old.moves:next.moves,events:[...events.values()].sort((x,y)=>x.id.localeCompare(y.id))};
 }return {...b,days};
}
export function parseChess(raw:string|null):ChessProgress{
 if(!raw)return emptyChess();if(raw.length>2000000)throw new Error("Chess history is too large; existing data is preserved.");
 const data=JSON.parse(raw) as ChessProgress;
 if(!data||data.version!==1||typeof data.showStreak!=="boolean"||!DIFFICULTIES.includes(data.difficulty)||!data.days||Array.isArray(data.days)||typeof data.days!=="object")throw new Error("Invalid chess history; existing data is preserved.");
 for(const [key,day] of Object.entries(data.days)){
   const match=/^chess\/v1\/(\d{4}-\d{2}-\d{2})\/(beginner|intermediate|advanced)$/.exec(key);if(!match)throw new Error("Unknown chess identity; existing data is preserved.");
   const puzzle=puzzleFor(match[1],match[2] as Difficulty);
   if(!day||day.puzzleId!==puzzle.id||!Array.isArray(day.moves)||!Array.isArray(day.events)||day.events.length>2000)throw new Error("Invalid chess day");
   replay(puzzle,day.moves);const ids=new Set<string>();
   for(const event of day.events){if(!event||! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(event.id)||ids.has(event.id)||!["hint","mistake"].includes(event.kind)||!Number.isInteger(event.ply)||event.ply<0||event.ply>day.moves.length||replay(puzzle,day.moves.slice(0,event.ply)).complete)throw new Error("Invalid chess event");ids.add(event.id);if(event.kind==="mistake"){if(!event.move)throw new Error("Missing attempted move");const before=replay(puzzle,day.moves.slice(0,event.ply));before.board.move(uci(event.move));let correct=false;try{replay(puzzle,[...day.moves.slice(0,event.ply),event.move]);correct=true;}catch{}if(correct)throw new Error("A correct move cannot be a mistake");}}
 }return data;
}
export function chessStreak(progress:ChessProgress,today:string){if(!progress.showStreak)return 0;const solvedDates=new Set(Object.keys(progress.days).filter(key=>{const [, ,date,difficulty]=key.split('/');return replay(puzzleFor(date,difficulty as Difficulty),progress.days[key].moves).complete;}).map(key=>key.split('/')[2]));let cursor=solvedDates.has(today)?today:addDays(today,-1),count=0;while(solvedDates.has(cursor)){count++;cursor=addDays(cursor,-1);}return count;}
