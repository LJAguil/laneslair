import type { Metadata } from "next";
import { EventsCard, GoalsCard, HabitsCard, ProjectsCard } from "@/components/dashboard/dashboard-cards";
import { OverviewStats } from "@/components/dashboard/overview-stats";
import { ScheduleCard } from "@/components/dashboard/schedule-card";
import { WeeklyActivityCard } from "@/components/dashboard/weekly-activity-card";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Overview" };
/** Keep the original broader widgets available without crowding the daily home. */
export default function OverviewPage() {
  return (
    <>
      <PageHeader title="Overview" description="The broader picture, whenever you want it." />
      <div className="space-y-5">
        <OverviewStats />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="min-w-0 space-y-5 xl:col-span-2"><ProjectsCard /><WeeklyActivityCard /><GoalsCard /></div>
          <div className="min-w-0 space-y-5"><ScheduleCard /><HabitsCard /><EventsCard /></div>
        </div>
      </div>
    </>
  );
}
