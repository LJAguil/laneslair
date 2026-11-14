import type { Metadata } from "next";
import { DetectiveView } from "@/components/play/detective-view";
export const metadata: Metadata = { title: "The Casebook" };
export default function DetectivePage() { return <DetectiveView />; }
