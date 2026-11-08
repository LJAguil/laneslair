import type { Metadata } from "next";
import { PlayHub } from "@/components/play/play-hub";
export const metadata:Metadata={title:"Daily Play"};
export default function PlayPage(){return <PlayHub />;}
