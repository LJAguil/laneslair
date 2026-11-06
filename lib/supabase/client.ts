import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/**
 * Supabase client for Client Components. It reads and writes the auth
 * cookies through `document.cookie`, so it shares the session the server set.
 * Use it for UI conveniences only; never treat its session as proof of identity
 * on the server.
 */
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient(url, publishableKey);
}
