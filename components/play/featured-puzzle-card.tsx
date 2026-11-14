import Link from "next/link";
import { ArrowRight, SearchCheck } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
export function FeaturedPuzzleCard() {
  return <Card className="border-accent/30"><CardHeader title="Your daily case" description="The Casebook · a deduction puzzle" icon={<SearchCheck className="h-5 w-5" />} />
    <p className="text-sm leading-relaxed text-muted">Four visitors. Conflicting possibilities. Match each person to a room, an object, and an arrival time using the witness statements.</p>
    <div className="mt-4 flex flex-wrap gap-2"><Link href="/play/detective" className={buttonClasses("primary", "sm", "min-h-11")}>Open today’s case<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link><Link href="/play/labyrinth" className={buttonClasses("ghost", "sm", "min-h-11")}>Draw a labyrinth route</Link></div>
  </Card>;
}
