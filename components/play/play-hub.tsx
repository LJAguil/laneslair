"use client";
import { PageHeader } from "@/components/page-header";
import { gameCatalog } from "@/lib/games/catalog";
import Link from "next/link";
import { Card,CardHeader } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { PuzzleCard } from "./puzzle-card";
import { PlaySyncControls } from "./play-sync-controls";
export function PlayHub(){return <div className="mx-auto max-w-2xl space-y-5">
  <PageHeader title="Daily Play" description="A quiet moment for a little mystery." />
  {gameCatalog.map(game=><section key={game.id} aria-label={game.name}>{game.id==="rune-lock"?<PuzzleCard />:<Card><CardHeader title={game.name} description={game.description} /><Link href={game.href} className={buttonClasses("secondary","md","min-h-11")}>Play daily chess</Link></Card>}</section>)}
  <p className="text-sm text-muted">Echoes is planned. It will appear here when it’s ready to play.</p>
  <PlaySyncControls />
</div>;}
