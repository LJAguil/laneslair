import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { EntertainmentView } from "@/components/entertainment/entertainment-view";
export default function EntertainmentPage() {
  return <Suspense fallback={<p role="status">Opening Entertainment…</p>}><OwnedEntertainment /></Suspense>;
}
async function OwnedEntertainment() {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect("/login");
  return <EntertainmentView key={data.user.id} userId={data.user.id} />;
}
