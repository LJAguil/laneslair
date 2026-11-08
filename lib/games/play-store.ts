import { addGuess, emptyProgress, parseProgress, revealHint, type PlayProgress, type Rune } from "./rune-lock";

export interface PlayStorage {getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void}
interface Snapshot {progress:PlayProgress;error:string|null}
export function mergePlayProgress(saved:PlayProgress,next:PlayProgress):PlayProgress {
  const days={...saved.days};
  for(const [day,entry] of Object.entries(next.days)){
    const previous=days[day];
    if(!previous){days[day]=entry;continue;}
    const shared=Math.min(previous.guesses.length,entry.guesses.length);
    if(Array.from({length:shared},(_,index)=>index).some(index=>previous.guesses[index].join(",")!==entry.guesses[index].join(",")))throw new Error("conflict");
    days[day]={guesses:previous.guesses.length>entry.guesses.length?previous.guesses:entry.guesses,hintUsed:previous.hintUsed||entry.hintUsed};
  }
  return {...next,days};
}
/** Device-local adapter. Replace this boundary later for account-synced game progress. */
export function createPlayStore(accountId:string,storage:PlayStorage) {
  const key=`lanes-lair-play-rune-lock-v1:${accountId}`;
  const listeners=new Set<()=>void>();
  let snapshot:Snapshot={progress:emptyProgress(),error:null};
  try {snapshot={progress:parseProgress(storage.getItem(key)),error:null};}
  catch {snapshot={...snapshot,error:"Saved puzzle progress couldn’t be read. You can play this visit; the saved copy will be left untouched."};}
  function emit(){listeners.forEach(listener=>listener());}
  function persist(progress:PlayProgress){
    try {
      const merged=mergePlayProgress(parseProgress(storage.getItem(key)),progress);
      storage.setItem(key,JSON.stringify(merged));snapshot={progress:merged,error:null};
    }catch(error){
      snapshot={progress,error:error instanceof Error&&error.message==="conflict"?"Another tab has different guesses for this lock. This tab’s changes aren’t saved; the existing saved game was left untouched.":"Progress is only saved for this visit. Saved data couldn’t be read or written; retry saving before leaving. Existing data was left untouched."};
    }
    emit();
  }
  return {
    key,
    getSnapshot:()=>snapshot,
    subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},
    guess:(day:string,guess:readonly Rune[])=>persist(addGuess(snapshot.progress,day,guess)),
    hint:(day:string)=>persist(revealHint(snapshot.progress,day)),
    streak:(showStreak:boolean)=>persist({...snapshot.progress,showStreak}),
    retry:()=>persist(snapshot.progress),
  };
}
export type PlayStore=ReturnType<typeof createPlayStore>;
