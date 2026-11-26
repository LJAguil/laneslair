import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { guardedFetch, type GuardState } from "./guard";
const key = "lanes-lair.entertainment.hosted-check.ids.v1";
const saved = sessionStorage.getItem(key);
export const guardState: GuardState = { ids: saved ? JSON.parse(saved) : [crypto.randomUUID()], fault: "none" };
function persist() { sessionStorage.setItem(key, JSON.stringify(guardState.ids)); }
persist();
const env = getSupabaseEnv();
if (new URL(env.url).hostname !== "wbkeczowdtdysdytbhfx.supabase.co") throw new Error("Unexpected hosted acceptance project.");
const client = createBrowserClient(env.url, env.publishableKey, { global: { fetch: guardedFetch(new URL(env.url).origin, guardState, persist) } });
export function createClient() { return client; }
