import type { Metadata } from "next";
import { RuneLockView } from "@/components/play/rune-lock-view";
import Link from "next/link";
export const metadata:Metadata={title:"Rune Lock"};
export default function RuneLockPage(){return <><Link href="/play" className="mb-4 inline-block text-sm text-accent-strong underline">All games</Link><RuneLockView /></>;}
