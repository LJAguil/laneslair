import type { Metadata } from "next";
import { WeeklyReviewView } from "@/components/review/weekly-review-view";
export const metadata: Metadata = { title: "Weekly review" };
export default function ReviewPage() { return <WeeklyReviewView />; }
