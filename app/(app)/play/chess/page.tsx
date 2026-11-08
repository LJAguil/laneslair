import type { Metadata } from "next";
import { ChessView } from "@/components/play/chess-view";
export const metadata:Metadata={title:"Daily chess"};
export default function ChessPage(){return <ChessView />;}
