import type { PlayStorage } from "./play-store";
import type { GamePreference } from "./catalog";
export interface SyncAccount<P>{progress:P;preference:GamePreference|null}
export interface SyncPreview<P>{dates:string[];conflicts:string[];merged:P|null;localDays:number;accountDays:number}
export interface SyncStore<P>{key:string;getSnapshot:()=>{progress:P;error:string|null};subscribe:(fn:()=>void)=>()=>void;merge:(next:P)=>void}
export interface SyncAdapter<P,D>{load:()=>Promise<SyncAccount<P>>;submit:(key:string,state:D,id:string)=>Promise<void>;preference:(show:boolean,revision:number|null,id:string)=>Promise<void>}
export interface SyncCodec<P,D>{merge:(a:P,b:P)=>P;preview:(a:P,b:P)=>SyncPreview<P>;same:(a:P,b:P)=>boolean;sameEntry?:(a:D,b:D|undefined)=>boolean}
export interface GameSyncSnapshot<P>{enabled:boolean;busy:boolean;error:string|null;preview:SyncPreview<P>|null;account:SyncAccount<P>|null;lastSynced:string|null}
export function createGameSync<P extends {showStreak:boolean;days:Record<string,D>},D>(store:SyncStore<P>,adapter:SyncAdapter<P,D>,storage:PlayStorage,codec:SyncCodec<P,D>,keys:{key:string;backupKey:string}){
  const {key,backupKey}=keys;
  let state:GameSyncSnapshot<P>={enabled:false,busy:false,error:null,preview:null,account:null,lastSynced:null};
  let disposed=false,applying=false,running=false,pending=false,localAtPreview="";
  let knownPreference:SyncAccount<P>["preference"]=null,knownShowStreak=store.getSnapshot().progress.showStreak;
  function saveConfig(account:SyncAccount<P>){storage.setItem(key,JSON.stringify({enabled:true,showStreak:account.progress.showStreak,revision:account.preference?.revision??null}));}
  const listeners=new Set<()=>void>();
  function update(next:Partial<GameSyncSnapshot<P>>){if(!disposed){state={...state,...next};listeners.forEach(listener=>listener());}}
  function safeLocal(){const local=store.getSnapshot();if(local.error)throw new Error("Fix local saving before syncing. Your existing saved copy has not been replaced.");return local.progress;}
  const message=(error:unknown)=>error instanceof Error?error.message:"Couldn’t sync. Local history is preserved.";
  async function preview(){
    if(running||state.busy)return;
    update({busy:true,error:null,preview:null});
    try{const account=await adapter.load();if(disposed)return;const local=safeLocal();localAtPreview=JSON.stringify(local);update({account,preview:codec.preview(local,account.progress)});}
    catch(error){update({error:message(error)});}finally{update({busy:false});}
  }
  async function sync(){
    if(disposed||!state.enabled||state.preview||state.error)return;
    if(running){pending=true;return;}running=true;
    try{
      do{
        pending=false;update({busy:true});const local=safeLocal(),account=await adapter.load();if(disposed)return;
        const plan=codec.preview(local,account.progress);
        if(!plan.merged)throw new Error(`Different guesses on ${plan.conflicts.join(", ")}. Sync paused; both copies are preserved. Preview import to review.`);
        const changedPreference=local.showStreak!==knownShowStreak;
        const desired=changedPreference?local.showStreak:account.progress.showStreak;
        for(const date of plan.dates){
          if(disposed||!state.enabled)return;
          const equal=codec.sameEntry?codec.sameEntry(plan.merged.days[date],account.progress.days[date]):JSON.stringify(plan.merged.days[date])===JSON.stringify(account.progress.days[date]);
          if(!equal)await adapter.submit(date,plan.merged.days[date],crypto.randomUUID());
        }
        if(disposed||!state.enabled)return;
        if(changedPreference||!account.preference)await adapter.preference(desired,changedPreference?knownPreference?.revision??null:account.preference?.revision??null,crypto.randomUUID());
        const saved=await adapter.load();if(disposed||!state.enabled)return;
        const latest=safeLocal(),merged=codec.merge(saved.progress,latest);
        // A new local toggle while requests were in flight must remain pending.
        merged.showStreak=latest.showStreak===local.showStreak?saved.progress.showStreak:latest.showStreak;
        applying=true;try{store.merge(merged);}finally{applying=false;}
        safeLocal();saveConfig(saved);knownPreference=saved.preference;knownShowStreak=saved.progress.showStreak;
        if(!codec.same(store.getSnapshot().progress,saved.progress))pending=true;
        update({account:saved,lastSynced:new Date().toISOString(),error:null});
      }while(pending&&!disposed&&state.enabled);
    }catch(error){update({error:message(error)});}finally{running=false;update({busy:false});}
  }
  async function confirm(showStreak:boolean){
    if(state.busy||!state.preview?.merged||!state.account)return;
    const account=state.account;
    update({busy:true,error:null});
    try{
      const local=safeLocal();if(JSON.stringify(local)!==localAtPreview)throw new Error("Device progress changed after the preview. Preview again before importing.");const plan=codec.preview(local,account.progress);
      if(!plan.merged)throw new Error("Local guesses changed. Preview again; both copies are preserved.");
      // Preserve the original byte-for-byte device save once, before any import or merge.
      if(storage.getItem(backupKey)===null)storage.setItem(backupKey,storage.getItem(store.key)??JSON.stringify(local));
      for(const date of plan.dates){if(disposed)return;await adapter.submit(date,plan.merged.days[date],crypto.randomUUID());}
      if(disposed)return;
      await adapter.preference(showStreak,account.preference?.revision??null,crypto.randomUUID());
      const saved=await adapter.load();if(disposed)return;
      const latest=safeLocal(),merged=codec.merge(saved.progress,latest);merged.showStreak=latest.showStreak===local.showStreak?saved.progress.showStreak:latest.showStreak;
      applying=true;try{store.merge(merged);}finally{applying=false;}
      safeLocal();saveConfig(saved);knownPreference=saved.preference;knownShowStreak=saved.progress.showStreak;
      update({enabled:true,preview:null,account:saved,lastSynced:new Date().toISOString()});
    }catch(error){update({error:message(error),preview:null});}finally{update({busy:false});}
    if(state.enabled&&!state.error)void sync();
  }
  const unsubscribe=store.subscribe(()=>{if(!applying&&state.enabled&&!state.error)void sync();});
  return {
    getSnapshot:()=>state,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},preview,confirm,
    start:()=>{try{const raw=storage.getItem(key);if(raw&&raw!=="disabled"){const config=JSON.parse(raw);if(config.enabled!==true||typeof config.showStreak!=="boolean"||(config.revision!==null&&(!Number.isSafeInteger(config.revision)||config.revision<1)))throw new Error("Invalid sync preference");knownShowStreak=config.showStreak;knownPreference=config.revision===null?null:{showStreak:config.showStreak,revision:config.revision};update({enabled:true});void sync();}}catch{update({error:"Couldn’t read sync preference. Local play remains available."});}},
    refresh:()=>{update({error:null});if(state.enabled)void sync();else void preview();},
    cancel:()=>update({preview:null,error:null}),
    disable:()=>{try{storage.setItem(key,"disabled");update({enabled:false,preview:null,error:null});}catch{update({error:"Couldn’t save this device’s sync preference. Try again before leaving."});}},
    dispose:()=>{disposed=true;unsubscribe();listeners.clear();},
  };
}

