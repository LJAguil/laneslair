import "server-only";
import { cacheLife } from "next/cache";
import { DAILY_DATA_URL, DAILY_SNAPSHOT_BYTES } from "./policy";
import { boundedBody } from "./transport";

/** Public data cache only. GitHub holds the durable last-successful snapshots. */
export async function readDailyData(): Promise<string | null> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });
  const response = await fetch(DAILY_DATA_URL, { credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw Error("daily-data-unavailable");
  return boundedBody(response, DAILY_SNAPSHOT_BYTES);
}
