"use client";
import { PageHeader } from "@/components/page-header";
import { gameCatalog } from "@/lib/games/catalog";
import Link from "next/link";
import { Card,CardHeader } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { PuzzleCard } from "./puzzle-card";
import { PlaySyncControls } from "./play-sync-controls";
import { FeaturedPuzzleCard } from "./featured-puzzle-card";
export function PlayHub(){return <div className="mx-auto max-w-2xl space-y-5">
  <PageHeader title="Daily Play" description="A quiet moment for a little mystery." />
  {gameCatalog.map(game=><section key={game.id} aria-label={game.name}>{game.id==="detective"?<FeaturedPuzzleCard />:game.id==="rune-lock"?<PuzzleCard />:<Card><CardHeader title={game.name} description={game.description} /><Link href={game.href} className={buttonClasses("secondary","md","min-h-11")}>Play {game.name}</Link></Card>}</section>)}
  <div className="space-y-2"><p className="text-xs text-subtle">The Casebook and Labyrinth save on this device only. The controls below apply to Rune Lock; chess and Echoes have their own sync controls.</p><PlaySyncControls /></div>
</div>;}
