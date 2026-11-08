import { mergeEcho,parseEcho,emptyEcho,type EchoProgress } from "./rules";
import type { PlayStorage } from "../play-store";
export function createEchoStore(accountId:string,storage:PlayStorage){
 const key=`lanes-lair-play-echoes-v1:${accountId}`,listeners=new Set<()=>void>();let snapshot:{progress:EchoProgress;error:string|null}={progress:emptyEcho(),error:null};
 try{snapshot={progress:parseEcho(storage.getItem(key)),error:null};}catch{snapshot.error="Saved Echoes history couldn’t be read. Existing data is untouched; retry before leaving.";}
 function persist(next:EchoProgress){try{const progress=parseEcho(JSON.stringify(mergeEcho(parseEcho(storage.getItem(key)),next)));storage.setItem(key,JSON.stringify(progress));snapshot={progress,error:null};}catch(error){snapshot={progress:next,error:error instanceof Error?error.message:"Echoes progress could not be saved. Existing data is preserved."};}listeners.forEach(fn=>fn());}
 return {key,getSnapshot:()=>snapshot,subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};},save:persist,streak:(showStreak:boolean)=>persist({...snapshot.progress,showStreak}),merge:(next:EchoProgress)=>persist(mergeEcho(snapshot.progress,next)),retry:()=>persist(snapshot.progress)};
}
export type EchoStore=ReturnType<typeof createEchoStore>;
