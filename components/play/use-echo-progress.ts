"use client";
import { useEffect,useState,useSyncExternalStore } from "react";
import { getVerifiedUserId } from "@/lib/data/tasks";
import { createClient } from "@/lib/supabase/client";
import { echoesAccountAdapter } from "@/lib/data/echoes";
import { createEchoStore,type EchoStore } from "@/lib/games/echoes/store";
import { createEchoSync,type EchoSync } from "@/lib/games/echoes/sync";
import { emptyEcho } from "@/lib/games/echoes/rules";
const fallback={progress:emptyEcho(),error:null},getFallback=()=>fallback,noSubscribe=()=>()=>{};
export function useEchoProgress(){
 const [bundle,setBundle]=useState<{store:EchoStore;sync:EchoSync}|null>(null),[error,setError]=useState<string|null>(null),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true,account:string|null=null,sync:EchoSync|null=null;const {data:{subscription}}=createClient().auth.onAuthStateChange((_event,session)=>{if(account&&session?.user.id!==account){sync?.dispose();setBundle(null);setError('Your account changed. Reload to load the correct Echoes history.');}});
 const focus=()=>{if(document.visibilityState!=="hidden"&&sync?.getSnapshot().enabled)sync.refresh();};window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
 void getVerifiedUserId().then(id=>{if(!active)return;account=id;const storage={getItem:(key:string)=>localStorage.getItem(key),setItem:(key:string,value:string)=>localStorage.setItem(key,value)};const store=createEchoStore(id,storage);sync=createEchoSync(id,store,echoesAccountAdapter(id),storage);setBundle({store,sync});setError(null);sync.start();}).catch(()=>{if(active)setError('Couldn’t verify your account. Retry or sign in again before loading Echoes history.');});
 return()=>{active=false;sync?.dispose();subscription.unsubscribe();window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};},[attempt]);
 const snapshot=useSyncExternalStore(bundle?.store.subscribe??noSubscribe,bundle?.store.getSnapshot??getFallback,getFallback);
 return {...snapshot,error:error??snapshot.error,bundle,retry:()=>{if(bundle)bundle.store.retry();else setAttempt(value=>value+1);}};
}
