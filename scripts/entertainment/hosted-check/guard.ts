export const TEST_PREFIX = "[Entertainment test] ";
export type Fault = "none" | "fail_save" | "lose_response";
export interface GuardState { ids: string[]; fault: Fault; }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Test-harness guard only. Supabase RLS remains the actual authorization boundary. */
export function guardedFetch(origin: string, state: GuardState, persist: () => void, transport: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (url.origin !== origin) throw new Error("Hosted acceptance blocks other destinations.");
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    if ((url.pathname === "/auth/v1/user" && method === "GET") || (["/auth/v1/token", "/auth/v1/logout"].includes(url.pathname) && method === "POST")) return transport(input, init);
    if (url.pathname !== "/rest/v1/entertainment_items") throw new Error("Hosted acceptance blocks other tables, RPCs and account-management endpoints.");
    if (method === "GET" || method === "HEAD") {
      if (!state.ids.length || state.ids.some(id => !uuid.test(id))) throw new Error("Synthetic IDs are not initialized.");
      url.searchParams.set("id", `in.(${state.ids.join(",")})`);
      return transport(url.href, init);
    }
    if (method === "DELETE") {
      const id = url.searchParams.get("id")?.replace(/^eq\./, "");
      if (!id || !state.ids.includes(id)) throw new Error("Only this run's synthetic records can be deleted.");
      return transport(input, init);
    }
    if (method !== "POST" || typeof init?.body !== "string") throw new Error("Unsupported acceptance write.");
    const row = JSON.parse(init.body);
    if (Array.isArray(row) || typeof row.title !== "string" || !row.title.startsWith(TEST_PREFIX) || !uuid.test(row.id)) throw new Error(`Use a synthetic title starting with ${TEST_PREFIX}`);
    if (!state.ids.includes(row.id)) { state.ids.push(row.id); persist(); }
    const fault = state.fault; state.fault = "none";
    if (fault === "fail_save") return new Response(JSON.stringify({ message: "Synthetic connection failure before write" }), { status: 503 });
    const response = await transport(input, init);
    if (fault === "lose_response" && response.ok) return new Response(JSON.stringify({ message: "Synthetic lost response after write" }), { status: 503 });
    return response;
  };
}
