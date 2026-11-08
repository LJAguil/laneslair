import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { pushConfiguration, sendPush } from "./send";
import type { DeliveryJob } from "./types";

export function workerAuthorized(header: string | null, secret: string | undefined) {
  if (!secret || !/^[a-f0-9]{64}$/.test(secret) || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`), supplied = Buffer.from(header);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function deliverReminders() {
  pushConfiguration(); // Do not consume delivery claims when keys are missing.
  const secret = process.env.PUSH_WORKER_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/.test(secret)) throw new Error("Worker not configured");
  const { url, publishableKey } = getSupabaseEnv();
  // No session, privileged Supabase key, cookies or cross-request cache.
  const db = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const claimed = await db.rpc("claim_push_reminders", { worker_secret: secret });
  if (claimed.error) throw new Error("Could not claim reminders");
  const jobs = claimed.data as DeliveryJob[];
  const counts = { accepted: 0, failed: 0, expired: 0, skipped: 0 };
  // Bounded parallelism, well within Vercel's function duration for a personal account.
  for (let index = 0; index < jobs.length; index += 10) {
    await Promise.all(jobs.slice(index,index+10).map(async job => {
      const begin = await db.rpc("begin_push_delivery", { worker_secret: secret, delivery: job.delivery_id });
      if (begin.error) throw new Error("Could not verify reminder");
      if (!begin.data) { counts.skipped++; return; }
      let outcome: "accepted" | "failed" | "expired" = "failed";
      try { outcome = await sendPush(job, job.kind, job.delivery_id); } catch { /* Invalid/unsupported subscription is never fetched. */ }
      const finished = await db.rpc("finish_push_delivery", { worker_secret: secret, delivery: job.delivery_id, result: outcome });
      if (finished.error) throw new Error("Could not record delivery result");
      counts[outcome]++;
    }));
  }
  return counts;
}
