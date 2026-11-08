import { mergeChess,parseChess,emptyChess,type ChessProgress } from "./rules";
import type { Difficulty } from "./pack";
import type { PlayStorage } from "../play-store";
export function createChessStore(accountId:string,storage:PlayStorage){
 const key=`lanes-lair-play-chess-v1:${accountId}`,listeners=new Set<()=>void>();
 let snapshot:{progress:ChessProgress;error:string|null}={progress:emptyChess(),error:null};
 try{snapshot={progress:parseChess(storage.getItem(key)),error:null};}catch{snapshot.error="Saved chess history couldn’t be read. Existing data is untouched; retry before leaving.";}
 function persist(next:ChessProgress){try{const progress=parseChess(JSON.stringify(mergeChess(parseChess(storage.getItem(key)),next)));storage.setItem(key,JSON.stringify(progress));snapshot={progress,error:null};}catch(error){snapshot={progress:next,error:error instanceof Error?error.message:"Chess progress could not be saved. Existing data is preserved."};}listeners.forEach(fn=>fn());}
 return {key,getSnapshot:()=>snapshot,subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};},save:persist,difficulty:(difficulty:Difficulty)=>persist({...snapshot.progress,difficulty}),streak:(showStreak:boolean)=>persist({...snapshot.progress,showStreak}),merge:(next:ChessProgress)=>persist(mergeChess(snapshot.progress,next)),retry:()=>persist(snapshot.progress)};
}
export type ChessStore=ReturnType<typeof createChessStore>;
