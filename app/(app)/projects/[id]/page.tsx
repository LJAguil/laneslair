import { Suspense } from "react";
import type { Metadata } from "next";
import { ProjectDetailView } from "@/components/projects/project-detail-view";
export const metadata: Metadata = { title: "Project" };
async function ProjectContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetailView key={id} projectId={id} />;
}
export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<p role="status" className="text-sm text-muted">Opening project…</p>}><ProjectContent params={params} /></Suspense>;
}
