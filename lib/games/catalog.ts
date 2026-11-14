import { parseProgress, type LockDay, type PlayProgress } from "./rune-lock";
import { mergePlayProgress } from "./play-store";

export type GameId="rune-lock"|"chess"|"echoes";
export interface PuzzleIdentity {game:GameId;version:number;date:string;difficulty:string}
// The two device-local games deliberately do not extend the cloud-sync GameId contract.
export const gameCatalog=[{id:"detective",name:"The Casebook",version:1,href:"/play/detective",description:"Reconstruct a case using an interactive deduction grid."},{id:"labyrinth",name:"The Labyrinth",version:1,href:"/play/labyrinth",description:"Draw a route that satisfies every row, column, and checkpoint."},{id:"rune-lock",name:"Rune Lock",version:1,href:"/play/rune-lock",description:"Four runes. Six guesses. A new lock each day."},{id:"chess",name:"Daily chess",version:1,href:"/play/chess",description:"Find a tactic at your chosen difficulty."},{id:"echoes",name:"Echoes",version:1,href:"/play/echoes",description:"Three original scenes. Find the ideas within their images."}] as const;
export const runeIdentity=(date:string):PuzzleIdentity=>({game:"rune-lock",version:1,date,difficulty:"standard"});
export const puzzleKey=(identity:PuzzleIdentity)=>`${identity.game}/v${identity.version}/${identity.date}/${identity.difficulty}`;
export interface GameProgressRecord<State> {identity:PuzzleIdentity;state:State;revision:number}
export interface GamePreference {showStreak:boolean;revision:number}
export interface AccountPlay {progress:PlayProgress;preference:GamePreference|null}
export interface ImportPreview {dates:string[];conflicts:string[];merged:PlayProgress|null;localDays:number;accountDays:number}
export function sameProgress(a:PlayProgress,b:PlayProgress):boolean {
  const dates=Object.keys(a.days);
  return a.version===b.version&&a.showStreak===b.showStreak&&dates.length===Object.keys(b.days).length&&dates.every(date=>{
    const left=a.days[date],right=b.days[date];
    return right&&left.hintUsed===right.hintUsed&&JSON.stringify(left.guesses)===JSON.stringify(right.guesses);
  });
}
/** Prefixes may extend each other; divergent branches are never silently preferred. */
export function previewImport(local:PlayProgress,account:PlayProgress):ImportPreview {
  const left=parseProgress(JSON.stringify(local)),right=parseProgress(JSON.stringify(account));
  const dates=[...new Set([...Object.keys(left.days),...Object.keys(right.days)])].sort();
  const conflicts=dates.filter(date=>{try{mergePlayProgress({...right,days:right.days[date]?{[date]:right.days[date]}:{}},{...left,days:left.days[date]?{[date]:left.days[date]}:{}});return false;}catch{return true;}});
  return {dates,conflicts,merged:conflicts.length?null:mergePlayProgress(right,left),localDays:Object.keys(left.days).length,accountDays:Object.keys(right.days).length};
}
export interface PlayAccountAdapter {
  load:()=>Promise<AccountPlay>;
  submit:(date:string,state:LockDay,operationId:string)=>Promise<void>;
  preference:(showStreak:boolean,revision:number|null,operationId:string)=>Promise<void>;
}
/** Each day is an idempotent transaction. Interrupted imports can be previewed/retried. */
export async function importProgress(adapter:PlayAccountAdapter,preview:ImportPreview,showStreak:boolean,revision:number|null){
  if(!preview.merged||preview.conflicts.length)throw new Error("Resolve conflicting days before importing. Both copies are preserved.");
  for(const date of preview.dates)await adapter.submit(date,preview.merged.days[date],crypto.randomUUID());
  await adapter.preference(showStreak,revision,crypto.randomUUID());
  return adapter.load();
}
