import type { Metadata } from "next";
import { HabitsView } from "@/components/habits/habits-view";

export const metadata: Metadata = { title: "Habits & Goals" };

export default function HabitsPage() {
  return <HabitsView />;
}
