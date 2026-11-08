"use client";
import Link from "next/link";
import { useState } from "react";
import type { Square } from "chess.js";
import { PageHeader } from "@/components/page-header";
import { Card,CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/store/app-store";
import { DIFFICULTIES,type Difficulty } from "@/lib/games/chess/pack";
import { chessKey,chessStreak,emptyDay,hint,playMove,puzzleFor,replay,type ChessProgress } from "@/lib/games/chess/rules";
import type { ChessStore } from "@/lib/games/chess/store";
import { ChessBoard } from "./chess-board";
import { useChessProgress } from "./use-chess-progress";
import { ChessSyncControls } from "./chess-sync-controls";
export function ChessView(){
 const {today}=useAppState(),{progress,error,bundle,retry}=useChessProgress();
 return <div className="mx-auto max-w-2xl space-y-5"><Link href="/play" className="text-sm text-accent-strong underline">All games</Link><PageHeader title="Daily chess" description="Find the tactic. One puzzle per difficulty, each local day." />
 {!bundle&&!error&&<Card><p role="status" className="text-sm text-muted">Loading your chess history…</p></Card>}
 {error&&<Card><p role="alert" className="text-sm text-warning">{error}</p><Button className="mt-3" onClick={retry}>Retry saving / loading</Button></Card>}
 {bundle&&<><label className="block text-sm font-medium">Difficulty<select value={progress.difficulty} onChange={event=>bundle.store.difficulty(event.target.value as Difficulty)} className="mt-2 min-h-11 w-full rounded-lg border border-line bg-raised p-3">{DIFFICULTIES.map(d=><option value={d} key={d}>{d[0].toUpperCase()+d.slice(1)}</option>)}</select></label>
 <ChessGame key={chessKey(today,progress.difficulty)} date={today} progress={progress} store={bundle.store} />
 <Card className="space-y-3"><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={progress.showStreak} onChange={event=>bundle.store.streak(event.target.checked)} />Show my chess streak</label>{progress.showStreak&&<p className="text-sm text-muted">{chessStreak(progress,today)} consecutive days solved · any difficulty, counted once per day</p>}<p className="text-xs text-subtle">Hints and retries are welcome and recorded. Difficulty choice stays on this device; optional sync shares supported results and streak preference for this account.</p></Card>
 <ChessSyncControls sync={bundle.sync} progress={progress} /></>}
 </div>;
}
export function ChessGame({date,progress,store}:{date:string;progress:ChessProgress;store:ChessStore}){
 const puzzle=puzzleFor(date,progress.difficulty),key=chessKey(date,progress.difficulty),day=progress.days[key]??emptyDay(puzzle),position=replay(puzzle,day.moves);
 const [selected,setSelected]=useState<Square|null>(null),[flipped,setFlipped]=useState(false),[message,setMessage]=useState(''),[promotion,setPromotion]=useState<{from:Square;to:Square}|null>(null);
 const assisted=day.events.some(event=>event.kind==='hint'),mistakes=day.events.filter(event=>event.kind==='mistake').length,shownHint=day.events.some(event=>event.kind==='hint'&&event.ply===day.moves.length);
 function submit(move:string){try{const result=playMove(puzzle,day,move);store.save({...progress,days:{...progress.days,[key]:result.day}});setMessage(result.message);}catch(error){setMessage(error instanceof Error?error.message:'Couldn’t play that move.');}setSelected(null);setPromotion(null);}
 function square(square:Square){if(position.complete)return;const piece=position.board.get(square);if(piece?.color===position.player){setSelected(selected===square?null:square);setMessage('');return;}if(!selected){setMessage('Select one of your pieces first.');return;}const candidates=position.board.moves({square:selected,verbose:true}).filter(move=>move.to===square);if(candidates.some(move=>move.promotion)){setPromotion({from:selected,to:square});return;}submit(selected+square);}
 const orientation=flipped?(position.player==='w'?'b':'w'):position.player;
 return <Card className="space-y-4"><CardHeader title={`${position.player==='w'?'White':'Black'} to move${position.complete?' · solved':''}`} description={`${date} · ${progress.difficulty} · ${puzzle.source.rating?`source rating ${puzzle.source.rating}`:'composed tactic'}`} />
 <p className="text-sm text-muted">{position.complete?'Puzzle complete. Your result is saved without resetting the board.':'Tap a piece, then its destination. Find the curated tactical line; other legal moves are not automatically correct.'}</p>
 {position.setup&&<p className="text-sm text-muted">Opponent setup (already played): <strong>{position.setup.san}</strong></p>}
 <ChessBoard board={position.board} orientation={orientation} selected={selected} onSquare={square} complete={position.complete} />
 <div className="flex flex-wrap gap-2"><Button onClick={()=>setFlipped(value=>!value)}>Flip board</Button>{!position.complete&&<Button disabled={shownHint} onClick={()=>{store.save({...progress,days:{...progress.days,[key]:hint(puzzle,day)}});setMessage('Hint recorded.');}}>Reveal a hint</Button>}</div>
 {promotion&&<fieldset className="rounded-xl border border-line p-3"><legend className="px-1 text-sm font-medium">Choose promotion for {promotion.from} → {promotion.to}</legend><div className="flex flex-wrap gap-2">{([['q','Queen'],['r','Rook'],['b','Bishop'],['n','Knight']] as const).map(([piece,label])=><Button key={piece} onClick={()=>submit(promotion.from+promotion.to+piece)}>{label}</Button>)}<Button onClick={()=>setPromotion(null)}>Cancel promotion</Button></div></fieldset>}
 {shownHint&&!position.complete&&<p className="text-sm text-accent-strong">Hint: move the piece on <strong>{puzzle.line[day.moves.length*2].slice(0,2)}</strong>. Look for a forcing check, capture or threat.</p>}
 <p role="status" aria-live="polite" className="min-h-5 text-sm text-muted">{message|| (position.complete?'Solved.':`Select a ${position.player==='w'?'White':'Black'} piece.`)}</p>
 <p className="text-xs text-muted">{day.moves.length} correct player moves · {mistakes} legal misses · {assisted?'hint used':'no hints'}</p>
 <details><summary className="cursor-pointer text-sm font-medium">Move history</summary>{position.history.length?<ol className="mt-2 space-y-1 text-sm text-muted">{position.history.map((move,index)=><li key={index}>{index+1}. {move.role==='you'?'You':'Opponent'}: {move.san}</li>)}</ol>:<p className="mt-2 text-sm text-muted">No player moves yet.</p>}</details>
 {position.complete&&<div className="rounded-xl border border-success/40 p-3"><h3 className="font-medium">Why it works</h3><p className="mt-2 text-sm text-muted">{puzzle.explanation}</p><p className="mt-2 text-xs text-subtle">A mating alternative is accepted whenever chess.js confirms checkmate. Other unlisted nonmating lines are not engine-evaluated.</p></div>}
 <p className="text-xs text-subtle">Source: <a href={puzzle.source.url} target={puzzle.source.url.startsWith('https:')?'_blank':undefined} rel="noreferrer" className="text-accent-strong underline">{puzzle.source.name}</a> · {puzzle.source.license}. Starter pack: two puzzles per difficulty, repeating every two days. Difficulty bands are approximate; no live engine or paid feed. <a href="/chess-credits.txt" target="_blank" rel="noreferrer" className="text-accent-strong underline">Chess.js credits and licenses</a>.</p>
 </Card>;
}
