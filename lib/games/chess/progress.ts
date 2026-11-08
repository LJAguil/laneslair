import type { ChessProgress,ChessDay } from "./rules";
import { parseChess,mergeChess,sameEvent } from "./rules";
import type { GamePreference } from "../catalog";
export interface ChessAccount {progress:ChessProgress;preference:GamePreference|null}
export interface ChessPreview {dates:string[];conflicts:string[];merged:ChessProgress|null;localDays:number;accountDays:number}
export interface ChessAccountAdapter {load:()=>Promise<ChessAccount>;submit:(key:string,state:ChessDay,operation:string)=>Promise<void>;preference:(show:boolean,revision:number|null,operation:string)=>Promise<void>}
export function previewChess(local:ChessProgress,account:ChessProgress):ChessPreview{
 parseChess(JSON.stringify(local));parseChess(JSON.stringify(account));const dates=[...new Set([...Object.keys(local.days),...Object.keys(account.days)])].sort();
 const conflicts=dates.filter(key=>{try{mergeChess({...account,days:account.days[key]?{[key]:account.days[key]}:{}},{...local,days:local.days[key]?{[key]:local.days[key]}:{}});return false;}catch{return true;}});
 return {dates,conflicts,merged:conflicts.length?null:mergeChess(account,local),localDays:Object.keys(local.days).length,accountDays:Object.keys(account.days).length};
}
export function sameChess(a:ChessProgress,b:ChessProgress){const keys=Object.keys(a.days);return a.version===b.version&&a.showStreak===b.showStreak&&keys.length===Object.keys(b.days).length&&keys.every(key=>{const x=a.days[key],y=b.days[key];return y&&x.puzzleId===y.puzzleId&&JSON.stringify(x.moves)===JSON.stringify(y.moves)&&x.events.length===y.events.length&&x.events.every(event=>{const other=y.events.find(e=>e.id===event.id);return other&&sameEvent(event,other);});});}
export function sameChessDay(a:ChessDay,b:ChessDay|undefined){return Boolean(b&&a.puzzleId===b.puzzleId&&JSON.stringify(a.moves)===JSON.stringify(b.moves)&&a.events.length===b.events.length&&a.events.every(event=>{const other=b.events.find(e=>e.id===event.id);return other&&sameEvent(event,other);}));}
