import { sendNotification } from "web-push";
import type { PushDevice } from "./types";
import { safePushEndpoint } from "./validation";

/** Server imports only. Never return provider errors (they may contain endpoints/keys). */
export function pushConfiguration() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) throw new Error("Push delivery needs its VAPID settings on the server. See docs/PUSH_REMINDERS.md.");
  if (!/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subject)) throw new Error("Configure VAPID_SUBJECT as a mailto contact address.");
  return { subject, publicKey, privateKey };
}

export async function sendPush(device: PushDevice, kind: "test" | "task" | "habit", tag: string): Promise<"accepted" | "failed" | "expired"> {
  const vapidDetails = pushConfiguration();
  safePushEndpoint(device.endpoint);
  if (device.expires_at && Date.parse(device.expires_at) <= Date.now()) return "expired";
  try {
    await sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
      JSON.stringify({ kind, tag }), { vapidDetails, TTL: 300, urgency: "normal", timeout: 8000 });
    return "accepted";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? "expired" : "failed";
  }
}
