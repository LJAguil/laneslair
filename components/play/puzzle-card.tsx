"use client";
import { ArrowRight, KeyRound } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { useAppState } from "@/lib/store/app-store";
import { finished, MAX_GUESSES, solved } from "@/lib/games/rune-lock";
import { usePlay } from "./play-provider";

export function PuzzleCard(){
  const {today}=useAppState();const {progress,status,error}=usePlay();const day=progress.days[today];
  const complete=finished(today,day),won=solved(today,day);
  return <Card>
    <CardHeader title="A little play" description="Rune Lock · your daily puzzle" icon={<KeyRound className="h-[18px] w-[18px]" aria-hidden="true" />} />
    <p className="text-sm text-muted">{status==="loading"?"Loading your lock…":status==="error"?"Open Daily Play to retry loading your progress.":won?`Lock opened in ${day.guesses.length} ${day.guesses.length===1?"guess":"guesses"}. Nicely done.`:complete?"Today’s lock is finished. A fresh challenge arrives tomorrow.":day?.guesses.length?`${day.guesses.length} of ${MAX_GUESSES} guesses used. Pick up where you left off.`:"Four runes. Six guesses. A small mystery for a quiet moment."}</p>
    {error&&status==="ready"&&<p className="mt-2 text-xs text-warning">Puzzle progress isn’t saved right now.</p>}
    <Link href="/play" className={buttonClasses("secondary","sm","mt-4 min-h-11")}>{complete?"View today’s lock":day?.guesses.length?"Continue puzzle":"Play today’s lock"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
  </Card>;
}
