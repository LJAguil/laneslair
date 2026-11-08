import { deliverReminders, workerAuthorized } from "@/lib/push/worker";

// POST only, bearer-authenticated, never cached. No browser session is accepted here.
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!workerAuthorized(request.headers.get("authorization"), process.env.PUSH_WORKER_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  }
  try { return Response.json(await deliverReminders(), { headers }); }
  catch { return Response.json({ error: "Reminder delivery failed. Check setup and delivery receipts; no private details are logged." }, { status: 503, headers }); }
}
