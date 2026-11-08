"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { getVerifiedUserId } from "@/lib/data/tasks";
import { createPlayStore, type PlayStore } from "@/lib/games/play-store";
import { emptyProgress } from "@/lib/games/rune-lock";

const fallback={progress:emptyProgress(),error:null};
const noSubscribe=()=>()=>{};
const getFallback=()=>fallback;
interface PlayContext {
  store:PlayStore|null;
  progress:typeof fallback.progress;
  error:string|null;
  status:"loading"|"ready"|"error";
  retry:()=>void;
}
const Context=createContext<PlayContext|null>(null);
export function PlayProvider({children}:{children:ReactNode}) {
  const [store,setStore]=useState<PlayStore|null>(null),[error,setError]=useState<string|null>(null),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let active=true;
    void getVerifiedUserId().then(id=>{
      // Access may throw on privacy-restricted devices; the adapter reports failures visibly.
      const storage={getItem:(key:string)=>localStorage.getItem(key),setItem:(key:string,value:string)=>localStorage.setItem(key,value)};
      if(active){setStore(createPlayStore(id,storage));setError(null);}
    }).catch(()=>{if(active)setError("Couldn’t verify your account for saved puzzle progress. Sign in again or retry.");});
    return()=>{active=false;};
  },[attempt]);
  const snapshot=useSyncExternalStore(store?.subscribe??noSubscribe,store?.getSnapshot??getFallback,getFallback);
  return <Context.Provider value={{store,progress:snapshot.progress,error:error??snapshot.error,status:error?"error":store?"ready":"loading",retry:()=>{if(store)store.retry();else setAttempt(value=>value+1);}}}>{children}</Context.Provider>;
}
export function usePlay(){const context=useContext(Context);if(!context)throw new Error("Daily Play needs PlayProvider");return context;}
