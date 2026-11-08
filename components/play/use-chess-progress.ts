"use client";
import { useEffect,useState,useSyncExternalStore } from "react";
import { getVerifiedUserId } from "@/lib/data/tasks";
import { createClient } from "@/lib/supabase/client";
import { chessAccountAdapter } from "@/lib/data/chess";
import { createChessStore,type ChessStore } from "@/lib/games/chess/store";
import { createChessSync,type ChessSync } from "@/lib/games/chess/sync";
import { emptyChess } from "@/lib/games/chess/rules";
const fallback={progress:emptyChess(),error:null},getFallback=()=>fallback,noSubscribe=()=>()=>{};
export function useChessProgress(){
 const [bundle,setBundle]=useState<{store:ChessStore;sync:ChessSync}|null>(null),[error,setError]=useState<string|null>(null),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true,account:string|null=null,sync:ChessSync|null=null;const {data:{subscription}}=createClient().auth.onAuthStateChange((_event,session)=>{if(account&&session?.user.id!==account){sync?.dispose();setBundle(null);setError('Your account changed. Reload to load the correct chess history.');}});
 const focus=()=>{if(document.visibilityState!=="hidden"&&sync?.getSnapshot().enabled)sync.refresh();};window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
 void getVerifiedUserId().then(id=>{if(!active)return;account=id;const storage={getItem:(key:string)=>localStorage.getItem(key),setItem:(key:string,value:string)=>localStorage.setItem(key,value)};const store=createChessStore(id,storage);sync=createChessSync(id,store,chessAccountAdapter(id),storage);setBundle({store,sync});setError(null);sync.start();}).catch(()=>{if(active)setError('Couldn’t verify your account. Retry or sign in again before loading chess history.');});
 return()=>{active=false;sync?.dispose();subscription.unsubscribe();window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};},[attempt]);
 const snapshot=useSyncExternalStore(bundle?.store.subscribe??noSubscribe,bundle?.store.getSnapshot??getFallback,getFallback);
 return {...snapshot,error:error??snapshot.error,bundle,retry:()=>{if(bundle)bundle.store.retry();else setAttempt(value=>value+1);}};
}
