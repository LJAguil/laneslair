import type { Metadata } from "next";
import { RuneLockView } from "@/components/play/rune-lock-view";
export const metadata:Metadata={title:"Daily Play · Rune Lock"};
export default function PlayPage(){return <RuneLockView />;}
