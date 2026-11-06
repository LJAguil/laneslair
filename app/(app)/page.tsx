import { EventsCard, GoalsCard, HabitsCard, PriorityTasksCard, ProjectsCard } from "@/components/dashboard/dashboard-cards";
import { OverviewStats } from "@/components/dashboard/overview-stats";
import { ScheduleCard } from "@/components/dashboard/schedule-card";
import { WeeklyActivityCard } from "@/components/dashboard/weekly-activity-card";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";

export default function DashboardPage() {
  return (
    <>
      <WelcomeHeader />
      <div className="space-y-5">
        <OverviewStats />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="min-w-0 space-y-5 xl:col-span-2">
            <PriorityTasksCard />
            <ProjectsCard />
            <WeeklyActivityCard />
          </div>
          <div className="min-w-0 space-y-5">
            <ScheduleCard />
            <HabitsCard />
            <GoalsCard />
            <EventsCard />
          </div>
        </div>
      </div>
    </>
  );
}
