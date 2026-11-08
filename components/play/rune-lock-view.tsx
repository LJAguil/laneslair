"use client";

import { Check, Circle, Delete, Flame, Lightbulb, RotateCcw } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/store/app-store";
import { clueFor, dailyLock, finished, LOCK_SIZE, MAX_GUESSES, puzzleStreak, RUNES, shareLock, solved, type Clue, type Rune } from "@/lib/games/rune-lock";
import { cn } from "@/lib/utils";
import { usePlay } from "./play-provider";
import { RuneIcon, runeName } from "./runes";

const clueText:Record<Clue,string>={exact:"Right rune, right position",present:"In the lock, different position",absent:"No remaining match"};
const clueStyle:Record<Clue,string>={exact:"border-success/60 bg-success/10 text-success",present:"border-warning/60 bg-warning/10 text-warning",absent:"border-line bg-raised text-subtle"};
export function RuneLockView(){
  const {today}=useAppState();const {status,error,retry}=usePlay();
  return <div className="mx-auto max-w-2xl space-y-5">
    <PageHeader title="Rune Lock" description="A little mystery in your Lair. One lock each day, at your pace." />
    {status==="loading"&&<Card><p role="status" className="text-sm text-muted">Loading today’s puzzle…</p></Card>}
    {error&&<div role="alert" className="space-y-2 rounded-xl border border-warning/40 bg-panel p-4"><p className="text-sm text-warning">{error}</p><Button onClick={retry}><RotateCcw className="h-4 w-4" aria-hidden="true" />Retry {status==="ready"?"saving":"loading"}</Button></div>}
    {status==="ready"&&<LockGame key={today} day={today} />}
  </div>;
}
function LockGame({day}:{day:string}){
  const {progress,store}=usePlay();
  const [draft,setDraft]=useState<Rune[]>([]),[error,setError]=useState(""),[copied,setCopied]=useState(false),[shareFallback,setShareFallback]=useState("");
  const entry=progress.days[day]??{guesses:[],hintUsed:false};
  const answer=dailyLock(day),won=solved(day,entry),complete=finished(day,entry);
  function submit(event:FormEvent){
    event.preventDefault();setError("");
    try{store!.guess(day,draft);setDraft([]);}catch(error){setError(error instanceof Error?error.message:"Couldn’t submit that guess.");}
  }
  async function copy(){
    const text=shareLock(day,entry);setCopied(false);
    try{await navigator.clipboard.writeText(text);setCopied(true);setShareFallback("");}
    catch{setShareFallback(text);}
  }
  return <>
    <Card>
      <CardHeader title="Open today’s lock" description={`${day} · ${MAX_GUESSES} guesses · runes may repeat`} />
      <p className="mb-5 text-sm leading-relaxed text-muted">Choose four runes in order. Each clue tells you whether a rune is in the right place, belongs elsewhere, or has no remaining match. Each copy of a rune can match only once.</p>
      <ol className="space-y-2" aria-label="Submitted guesses">
        {entry.guesses.map((guess,row)=><li key={row}><p className="sr-only">Guess {row+1}</p><div className="grid grid-cols-4 gap-2">{clueFor(guess,answer).map((clue,index)=><div key={index} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border p-2",clueStyle[clue])}>
          <RuneIcon rune={guess[index]} /><span className="text-[11px] font-medium">{runeName(guess[index])}</span><span className="sr-only">Position {index+1}: {clueText[clue]}</span>
          {clue==="exact"?<Check className="h-3 w-3" aria-hidden="true" />:clue==="present"?<Circle className="h-3 w-3" aria-hidden="true" />:<span aria-hidden="true" className="text-xs leading-3">—</span>}
        </div>)}</div></li>)}
      </ol>
      {complete?<div className="mt-5 space-y-3" role="status">
        <p className={cn("font-medium",won?"text-success":"text-muted")}>{won?`The lock opens. ${entry.guesses.length}/${MAX_GUESSES}${entry.hintUsed?" · hint used":""}`:"The lock stays closed this time. Another chance tomorrow."}</p>
        {!won&&<p className="text-sm text-muted">Today’s combination: {answer.map(runeName).join(" · ")}</p>}
        <Button onClick={()=>void copy()}>{copied?"Copied!":"Copy spoiler-free result"}</Button>
        {shareFallback&&<label className="block text-sm text-muted">Copy your result manually<textarea readOnly value={shareFallback} onFocus={event=>event.target.select()} className="mt-2 min-h-36 w-full rounded-lg border border-line bg-raised p-3 text-base" /></label>}
      </div>:<form onSubmit={submit} className="mt-5 space-y-4">
        <fieldset><legend className="mb-2 text-sm font-medium">Your next guess · {MAX_GUESSES-entry.guesses.length} left</legend>
          <div className="grid grid-cols-4 gap-2" aria-label="Current combination">
            {Array.from({length:LOCK_SIZE},(_,index)=><button key={index} type="button" disabled={!draft[index]} onClick={()=>{setDraft(previous=>previous.filter((_,slot)=>slot!==index));setError("");}} aria-label={draft[index]?`Remove ${runeName(draft[index])} from position ${index+1}`:`Position ${index+1}, empty`}
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line-strong bg-raised text-accent-strong hover:bg-hover disabled:text-subtle">
              {draft[index]?<><RuneIcon rune={draft[index]} /><span className="text-[11px]">{runeName(draft[index])}</span></>:<span className="text-sm">{index+1}</span>}
            </button>)}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">{RUNES.map(rune=><Button key={rune} className="h-auto min-h-16 flex-col gap-1 px-2 py-2" disabled={draft.length===LOCK_SIZE} aria-label={`Add ${runeName(rune)} to combination`} onClick={()=>{setDraft(previous=>previous.length<LOCK_SIZE?[...previous,rune]:previous);setError("");}}><RuneIcon rune={rune} className="h-5 w-5" /><span className="text-xs">{runeName(rune)}</span></Button>)}</div>
        </fieldset>
        {error&&<p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex flex-wrap gap-2"><Button type="submit" variant="primary" className="min-h-11 flex-1" disabled={draft.length!==LOCK_SIZE}>Try combination</Button><Button disabled={!draft.length} onClick={()=>setDraft(previous=>previous.slice(0,-1))} aria-label="Remove last rune"><Delete className="h-4 w-4" aria-hidden="true" />Undo</Button></div>
        <div className="border-t border-line pt-3">{entry.hintUsed?<p className="text-sm text-muted">Hint: the first rune is <strong className="text-fg">{runeName(answer[0])}</strong>.</p>:<Button variant="ghost" size="sm" onClick={()=>store!.hint(day)}><Lightbulb className="h-4 w-4" aria-hidden="true" />Reveal the first rune</Button>}</div>
      </form>}
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4 text-xs text-muted" aria-label="Clue legend"><span className="flex items-center gap-1"><Check className="h-3 w-3 text-success" aria-hidden="true" />Right place</span><span className="flex items-center gap-1"><Circle className="h-3 w-3 text-warning" aria-hidden="true" />Elsewhere</span><span>— No remaining match</span></div>
    </Card>
    <Card className="space-y-3">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input className="h-5 w-5 accent-[var(--color-accent)]" type="checkbox" checked={progress.showStreak} onChange={event=>store!.streak(event.target.checked)} /><span>Show my puzzle streak</span></label>
      {progress.showStreak&&<p className="flex items-center gap-2 text-sm text-muted"><Flame className="h-4 w-4 text-warning" aria-hidden="true" />{puzzleStreak(progress,day)} consecutive {puzzleStreak(progress,day)===1?"day":"days"} solved</p>}
      <p className="text-xs leading-relaxed text-subtle">Submitted guesses and your streak preference save on this device for your account. They don’t sync between devices yet. A fresh lock arrives at your device’s local midnight. Clearing site data clears this history. Hints still count as a solve.</p>
    </Card>
  </>;
}
