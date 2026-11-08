"use client";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card,CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { ECHO_PACK,ROUNDS_PER_DAY,type EchoRound } from "@/lib/games/echoes/pack";
import { daySolved,echoKey,echoStreak,echoSummary,emptyEchoDay,emptyRound,guessEcho,hintEcho,roundsFor,roundSolved,type EchoProgress,type EchoRoundProgress } from "@/lib/games/echoes/rules";
import type { EchoStore } from "@/lib/games/echoes/store";
import { useEchoProgress } from "./use-echo-progress";
import { EchoSyncControls } from "./echo-sync-controls";
export function EchoesView(){
 const {today}=useAppState(),{progress,error,bundle,retry}=useEchoProgress();
 return <div className="mx-auto max-w-2xl space-y-5"><Link href="/play" className="text-sm text-accent-strong underline">All games</Link><PageHeader title="Echoes" description="A small scene. A hidden connection. Three images to ponder each day." />
 {!bundle&&!error&&<Card><p role="status" className="text-sm text-muted">Loading your Echoes history…</p></Card>}
 {error&&<Card><p role="alert" className="text-sm text-warning">{error}</p><Button className="mt-3" onClick={retry}>Retry saving / loading</Button></Card>}
 {bundle&&<><EchoGame key={echoKey(today)} date={today} progress={progress} store={bundle.store} />
 <Card className="space-y-3"><label className="flex min-h-11 items-center gap-3 text-sm"><input className="h-5 w-5" type="checkbox" checked={progress.showStreak} onChange={event=>bundle.store.streak(event.target.checked)} />Show my Echoes streak</label>{progress.showStreak&&<p className="text-sm text-muted">{echoStreak(progress,today)} consecutive days with all three images matched</p>}<p className="text-xs text-subtle">Hints and retries are welcome. A full set counts once per local day, with or without hints. Streaks are optional.</p></Card>
 <EchoSyncControls sync={bundle.sync} progress={progress} /></>}
 </div>;
}
export function EchoGame({date,progress,store}:{date:string;progress:EchoProgress;store:EchoStore}){
 const day=progress.days[echoKey(date)]??emptyEchoDay(),rounds=roundsFor(date),summary=echoSummary(date,day);
 const [active,setActive]=useState(()=>Math.max(0,rounds.findIndex(round=>!roundSolved(round,day.rounds[round.id])))),[error,setError]=useState('');const round=rounds[active];
 function answer(choice:string){try{const current=store.getSnapshot().progress,next=guessEcho(date,current.days[echoKey(date)]??emptyEchoDay(),round.id,choice);store.save({...current,days:{...current.days,[echoKey(date)]:next}});setError('');}catch(error){setError(error instanceof Error?error.message:'Couldn’t save that answer.');}}
 function reveal(){try{const current=store.getSnapshot().progress;store.save({...current,days:{...current.days,[echoKey(date)]:hintEcho(date,current.days[echoKey(date)]??emptyEchoDay(),round.id)}});setError('');}catch(error){setError(error instanceof Error?error.message:'Couldn’t save that hint.');}}
 return <div className="space-y-4"><Card className="space-y-3"><CardHeader title={`${summary.matched}/${summary.total} images matched`} description={`${date} · original pack v1`} />
 {daySolved(date,day)&&<p role="status" className="text-sm font-medium text-success">Today’s echoes are connected. Come back tomorrow for another set.</p>}
 <p className="text-xs text-muted">{summary.firstTry} matched on the first answer · {summary.hints} hints used · {summary.misses} other tries</p>
 <nav aria-label="Today’s Echoes rounds" className="grid grid-cols-3 gap-2">{rounds.map((r,index)=><Button key={r.id} variant={active===index?'primary':'secondary'} className="h-auto min-h-11 flex-col px-2 py-2" aria-current={active===index?'step':undefined} onClick={()=>{setActive(index);setError('');}}><span>Image {index+1}</span><span className="text-[11px]">{roundSolved(r,day.rounds[r.id])?'Matched':day.rounds[r.id]?.guesses.length?'In progress':'Unmatched'}</span></Button>)}</nav>
 </Card><EchoRoundView round={round} state={day.rounds[round.id]??emptyRound()} onAnswer={answer} onHint={reveal} />
 {error&&<p role="alert" className="text-sm text-warning">{error}</p>}
 {roundSolved(round,day.rounds[round.id])&&active<rounds.length-1&&<Button variant="primary" className="min-h-11 w-full" onClick={()=>{setActive(index=>index+1);setError('');}}>Next image</Button>}
 <p className="text-xs leading-relaxed text-subtle">{ECHO_PACK.length} original scenes · {ROUNDS_PER_DAY} per day · this finite pack repeats every {ECHO_PACK.length/ROUNDS_PER_DAY} days. The word bank uses curated meanings; it doesn’t judge free-text interpretations. First-answer matches include hinted answers. No time limit or runtime AI.</p></div>;
}
export function EchoRoundView({round,state,onAnswer,onHint}:{round:EchoRound;state:EchoRoundProgress;onAnswer:(choice:string)=>void;onHint:()=>void}){
 const solved=roundSolved(round,state),last=state.guesses.at(-1);
 return <Card className="space-y-5"><CardHeader title={round.title} description="Which idea does the emphasized image evoke?" />
 <blockquote className="whitespace-pre-wrap text-base leading-8 text-fg sm:text-lg">{round.before}<strong className="font-semibold underline decoration-accent decoration-2 underline-offset-4"><span className="sr-only">Key image: </span>{round.image}</strong>{round.after}</blockquote>
 <fieldset><legend className="mb-3 text-sm font-medium">Match the image to a meaning</legend><div className="grid gap-2 sm:grid-cols-2">{round.choices.map(choice=>{const tried=state.guesses.includes(choice.id),correct=round.answers.includes(choice.id);return <Button key={choice.id} disabled={solved||tried} className={cn('h-auto min-h-12 justify-between whitespace-normal px-3 py-3 text-left',tried&&correct?'border-success/60':tried?'border-warning/50':'')} onClick={()=>onAnswer(choice.id)}><span>{choice.label}</span>{tried&&<span className="ml-3 shrink-0 text-xs">{correct?'Matched':'Try another'}</span>}</Button>;})}</div></fieldset>
 <p role="status" aria-live="polite" className="text-sm text-muted">{solved?'Connection found.':last?'That wasn’t the intended link. Try another word, or reveal a hint.':'Choose a word when you’re ready. There’s no timer.'}</p>
 {solved?<section aria-label="The connection" className="space-y-2 rounded-xl border border-success/40 p-4"><h3 className="font-medium">The connection</h3><p className="text-sm leading-relaxed text-muted">{round.explanation}</p>{round.answers.length>1&&<p className="text-sm text-muted">Both accepted: {round.choices.filter(c=>round.answers.includes(c.id)).map(c=>c.label).join(' / ')}.</p>}<p className="text-xs text-subtle">{state.guesses.length} {state.guesses.length===1?'answer':'answers'} · {state.hintUsed?'hint used':'no hint used'}</p></section>:state.hintUsed?<aside aria-label="Hint" className="rounded-xl border border-line p-3 text-sm leading-relaxed text-muted"><strong className="text-fg">Hint: </strong>{round.hint}</aside>:<Button variant="ghost" className="min-h-11" onClick={onHint}>Reveal a hint</Button>}
 </Card>;
}
