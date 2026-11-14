import type { Metadata } from "next";
import { LabyrinthView } from "@/components/play/labyrinth-view";
export const metadata: Metadata = { title: "The Labyrinth" };
export default function LabyrinthPage() { return <LabyrinthView />; }
