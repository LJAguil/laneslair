import type { Metadata } from "next";
import { Suspense } from "react";
import { JournalView } from "@/components/journal/journal-view";
export const metadata:Metadata={title:"Journal"};
export default function JournalPage(){return <Suspense fallback={<p role="status">Opening journal…</p>}><JournalView /></Suspense>;}
