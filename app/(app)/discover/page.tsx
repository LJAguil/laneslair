import type { Metadata } from "next";
import { Suspense } from "react";
import { DiscoverView } from "@/components/discover/discover-view";
import { publishedDiscoverCatalog } from "@/lib/discover/feeds/published";
import { candidateCurationNote } from "@/lib/discover/candidate";

export const metadata: Metadata = { title: "Discover" };

export default function DiscoverPage() {
  return <Suspense fallback={<section aria-label="Discover" aria-busy="true" className="space-y-3">
    <h1 className="text-2xl font-semibold">Discover</h1>
    <p className="text-sm text-muted">{candidateCurationNote}</p>
    <p role="status" className="text-sm text-muted">Loading Discover picks…</p>
  </section>}><PublishedDiscover /></Suspense>;
}

async function PublishedDiscover() {
  const catalog = await publishedDiscoverCatalog();
  return <DiscoverView items={catalog.items} feed={catalog.feed} curationNote={candidateCurationNote} />;
}
