import type { Metadata } from "next";
import { EchoesView } from "@/components/play/echoes-view";
export const metadata:Metadata={title:"Echoes"};
export default function EchoesPage(){return <EchoesView />;}
