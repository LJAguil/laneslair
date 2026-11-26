import type { Metadata } from "next";
import { Suspense } from "react";
import { DiscoverView } from "@/components/discover/discover-view";
import { publishedDiscoverCatalog } from "@/lib/discover/feeds/published";
import { candidateCurationNote } from "@/lib/discover/candidate";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Discover" };

export default function DiscoverPage() {
  return <Suspense fallback={<section aria-label="Discover" aria-busy="true" className="space-y-3">
    <h1 className="text-2xl font-semibold">Discover</h1>
    <p className="text-sm text-muted">{candidateCurationNote}</p>
    <p role="status" className="text-sm text-muted">Loading Discover picks…</p>
  </section>}><PublishedDiscover /></Suspense>;
}

async function PublishedDiscover() {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect("/login?next=%2Fdiscover");
  const catalog = await publishedDiscoverCatalog();
  return <DiscoverView key={data.user.id} userId={data.user.id} items={catalog.items} feed={catalog.feed} updates={catalog.updates} curationNote={candidateCurationNote} />;
}
