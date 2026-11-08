"use client";
import { useState, useSyncExternalStore } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePlay } from "./play-provider";
import type { SyncSnapshot } from "@/lib/games/play-sync";
const fallback:SyncSnapshot={enabled:false,busy:false,error:null,preview:null,account:null,lastSynced:null};
const noSubscribe=()=>()=>{};const getFallback=()=>fallback;
function downloadProgress(value:unknown,name:string){
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:"application/json"}));
  const link=document.createElement("a");link.href=url;link.download=name;link.click();URL.revokeObjectURL(url);
}
export function PlaySyncControls(){
  const {sync,status}=usePlay();const state=useSyncExternalStore(sync?.subscribe??noSubscribe,sync?.getSnapshot??getFallback,getFallback);
  const [preference,setPreference]=useState<"account"|"device">("account");const {progress}=usePlay();const preview=state.preview;
  return <Card className="space-y-3">
    <CardHeader title="Your progress" description={state.enabled?"Account sync enabled on this device":"Saved on this device · account sync is optional"} />
    <p className="text-sm text-muted">Preview before connecting. Compatible guesses combine and hints stay recorded. Different guesses for the same day never overwrite each other. Original device history is retained.</p>
    {state.busy&&<p role="status" className="text-sm text-muted">Checking and saving game progress…</p>}
    {state.error&&<p role="alert" className="text-sm text-warning">{state.error}</p>}
    {state.lastSynced&&<p className="text-xs text-muted">Last synced: {new Date(state.lastSynced).toLocaleString()}</p>}
    {preview&&<div className="space-y-3 rounded-xl border border-line p-3">
      <h3 className="text-sm font-medium">Import preview</h3>
      <p className="text-sm text-muted">{preview.localDays} device days · {preview.accountDays} account days · {preview.dates.length} combined days</p>
      <ul className="max-h-48 overflow-y-auto text-sm" aria-label="Days to merge">{preview.dates.map(date=><li key={date}>{date} · {preview.conflicts.includes(date)?"Conflict — import blocked":"Compatible"} · device {progress.days[date]?.guesses.length??0} guesses{progress.days[date]?.hintUsed?" (hint)":""} · account {state.account?.progress.days[date]?.guesses.length??0} guesses{state.account?.progress.days[date]?.hintUsed?" (hint)":""}</li>)}</ul>
      {!preview.dates.length&&<p className="text-sm text-muted">No guesses yet. You can connect and begin a fresh history.</p>}
      {preview.conflicts.length>0?<p role="alert" className="text-sm text-warning">Import is blocked for conflicting branches. Keep playing locally; no branch will be replaced. See Daily Play setup for exporting both copies.</p>:<>
        <label className="block text-sm">Streak preference<select className="mt-1 min-h-11 w-full rounded-lg border border-line bg-raised p-2" value={preference} onChange={event=>setPreference(event.target.value as "account"|"device")}><option value="account">Use account preference ({state.account?.progress.showStreak?"on":"off"})</option><option value="device">Use this device’s preference ({progress.showStreak?"on":"off"})</option></select></label>
        <Button disabled={state.busy} onClick={()=>void sync?.confirm(preference==="device"?progress.showStreak:state.account?.progress.showStreak??false)}>Confirm import and enable sync</Button>
      </>}
      <div className="flex flex-wrap gap-2"><Button disabled={state.busy} onClick={()=>downloadProgress(progress,"rune-lock-device-v1.json")}>Export device copy</Button><Button disabled={state.busy||!state.account} onClick={()=>downloadProgress(state.account!.progress,"rune-lock-account-v1.json")}>Export account copy</Button><Button disabled={state.busy} variant="ghost" onClick={()=>sync?.cancel()}>Cancel import</Button></div>
    </div>}
    <div className="flex flex-wrap gap-2">
      <Button disabled={!sync||status!=="ready"||state.busy} onClick={()=>void sync?.preview()}>Preview account import</Button>
      {state.enabled&&<><Button disabled={state.busy||Boolean(preview)} onClick={()=>sync?.refresh()}>Sync now / retry</Button><Button disabled={state.busy} variant="ghost" onClick={()=>sync?.disable()}>Stop sync on this device</Button></>}
    </div>
    <p className="text-xs text-subtle">Requires reviewed database migration 005. No setup is run by this button. Games are casual, not anti-cheat verified. Other devices connect independently.</p>
  </Card>;
}
