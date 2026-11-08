"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { getVerifiedUserId } from "@/lib/data/tasks";
import { createPlayStore, type PlayStore } from "@/lib/games/play-store";
import { emptyProgress } from "@/lib/games/rune-lock";
import { createPlaySync, type PlaySync } from "@/lib/games/play-sync";
import { accountPlayAdapter } from "@/lib/data/play";
import { createClient } from "@/lib/supabase/client";

const fallback={progress:emptyProgress(),error:null};
const noSubscribe=()=>()=>{};
const getFallback=()=>fallback;
interface PlayContext {
  store:PlayStore|null;
  sync:PlaySync|null;
  progress:typeof fallback.progress;
  error:string|null;
  status:"loading"|"ready"|"error";
  retry:()=>void;
}
const Context=createContext<PlayContext|null>(null);
export function PlayProvider({children}:{children:ReactNode}) {
  const [store,setStore]=useState<PlayStore|null>(null),[error,setError]=useState<string|null>(null),[attempt,setAttempt]=useState(0);
  const [sync,setSync]=useState<PlaySync|null>(null);
  useEffect(()=>{
    let active=true,controller:PlaySync|null=null,accountId:string|null=null;
    const refresh=()=>{if(document.visibilityState!=="hidden"&&controller?.getSnapshot().enabled)controller.refresh();};
    window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);
    const {data:{subscription}}=createClient().auth.onAuthStateChange((_event,session)=>{
      if(accountId&&session?.user.id!==accountId){controller?.dispose();setStore(null);setSync(null);setError("Your account changed. Reload to load the correct puzzle history.");}
    });
    void getVerifiedUserId().then(id=>{
      // Access may throw on privacy-restricted devices; the adapter reports failures visibly.
      const storage={getItem:(key:string)=>localStorage.getItem(key),setItem:(key:string,value:string)=>localStorage.setItem(key,value)};
      if(active){accountId=id;const local=createPlayStore(id,storage);controller=createPlaySync(id,local,accountPlayAdapter(id),storage);setStore(local);setSync(controller);setError(null);controller.start();}
    }).catch(()=>{if(active)setError("Couldn’t verify your account for saved puzzle progress. Sign in again or retry.");});
    return()=>{active=false;controller?.dispose();subscription.unsubscribe();window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);};
  },[attempt]);
  const snapshot=useSyncExternalStore(store?.subscribe??noSubscribe,store?.getSnapshot??getFallback,getFallback);
  return <Context.Provider value={{store,sync,progress:snapshot.progress,error:error??snapshot.error,status:error?"error":store?"ready":"loading",retry:()=>{if(store)store.retry();else setAttempt(value=>value+1);}}}>{children}</Context.Provider>;
}
export function usePlay(){const context=useContext(Context);if(!context)throw new Error("Daily Play needs PlayProvider");return context;}
