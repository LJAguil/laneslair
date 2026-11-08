"use client";
import { useState,useSyncExternalStore } from "react";
import { Card,CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { EchoSync } from "@/lib/games/echoes/sync";
import { emptyEcho,type EchoProgress } from "@/lib/games/echoes/rules";
import type { GameSyncSnapshot } from "@/lib/games/game-sync";
const fallback:GameSyncSnapshot<EchoProgress>={enabled:false,busy:false,error:null,preview:null,account:null,lastSynced:null};const noSubscribe=()=>()=>{},getFallback=()=>fallback;
export function EchoSyncControls({sync,progress}:{sync:EchoSync;progress:EchoProgress}){
 const state=useSyncExternalStore(sync?.subscribe??noSubscribe,sync?.getSnapshot??getFallback,getFallback),[localPreference,setLocalPreference]=useState(false);
 function download(value:EchoProgress,name:string){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=name;link.click();URL.revokeObjectURL(url);}
 return <Card className="space-y-3"><CardHeader title="Echoes progress" description={state.enabled?'Account sync enabled on this device':'Saved locally for this account · sync is optional'} />
 <p className="text-sm text-muted">Echo sync needs reviewed migration 007. Rune Lock and chess sync are separate. Preview first; no history is uploaded until you confirm.</p>
 {state.busy&&<p role="status" className="text-sm text-muted">Syncing echoes progress…</p>}{state.error&&<p role="alert" className="text-sm text-warning">{state.error}</p>}
 {state.lastSynced&&<p className="text-xs text-muted">Last synced: {new Date(state.lastSynced).toLocaleString()}</p>}
 {state.preview&&<div className="space-y-3 rounded-xl border border-line p-3"><h3 className="font-medium">Echoes import preview</h3><p className="text-sm text-muted">{state.preview.localDays} device puzzles · {state.preview.accountDays} account puzzles</p>
 <ul aria-label="Echo puzzles to merge" className="max-h-40 overflow-auto text-xs text-muted">{state.preview.dates.map(key=><li key={key}>{key} · {state.preview!.conflicts.includes(key)?'Conflict — blocked':'Compatible'}</li>)}</ul>
 {state.preview.conflicts.length>0?<p role="alert" className="text-sm text-warning">Different answer branches. Both copies are preserved. Export them; keep playing locally until separately reviewed.</p>:<><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={localPreference} onChange={event=>setLocalPreference(event.target.checked)} />Use this device’s streak preference ({progress.showStreak?'on':'off'}) instead of account ({state.account?.progress.showStreak?'on':'off'})</label><Button disabled={state.busy} onClick={()=>void sync.confirm(localPreference?progress.showStreak:state.account?.progress.showStreak??false)}>Confirm Echoes import and enable sync</Button></>}
 <div className="flex flex-wrap gap-2"><Button disabled={state.busy} onClick={()=>download(progress,'echoes-device-v1.json')}>Export device copy</Button><Button disabled={state.busy||!state.account} onClick={()=>download(state.account?.progress??emptyEcho(),'echoes-account-v1.json')}>Export account copy</Button><Button disabled={state.busy} onClick={()=>sync.cancel()}>Cancel import</Button></div></div>}
 <div className="flex flex-wrap gap-2"><Button disabled={state.busy} onClick={()=>void sync.preview()}>Preview Echoes sync</Button>{state.enabled&&<><Button disabled={state.busy||Boolean(state.preview)} onClick={()=>sync.refresh()}>Sync now / retry</Button><Button disabled={state.busy} onClick={()=>sync.disable()}>Stop Echoes sync here</Button></>}</div></Card>;
}
