import { Compass, Flame, KeyRound, Leaf, Moon, Waves } from "lucide-react";
import type { Rune } from "@/lib/games/rune-lock";
const icons={key:KeyRound,flame:Flame,leaf:Leaf,moon:Moon,wave:Waves,compass:Compass};
export const runeName=(rune:Rune)=>rune[0].toUpperCase()+rune.slice(1);
export function RuneIcon({rune,className="h-6 w-6"}:{rune:Rune;className?:string}){const Icon=icons[rune];return <Icon className={className} aria-hidden="true" />;}
