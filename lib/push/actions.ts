"use server";

import { createClient } from "@/lib/supabase/server";
import { pushConfiguration, sendPush } from "./send";
import { uuid, validateSubscription, validatePreferences, validateReminder } from "./validation";
import type { ActionResult, DeviceSubscription, NotificationPreferences, PushDevice, ReminderRule } from "./types";

async function account() {
  const db = await createClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new Error("Sign in again to manage notifications.");
  return { db, userId: data.user.id };
}
function databaseError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (["42P01", "42883", "PGRST202", "PGRST205"].includes(error.code ?? "")) throw new Error("Notification setup is not applied yet. Review migration 003 in docs/PUSH_REMINDERS.md.");
  if (error.code === "23505") throw new Error("This device or reminder is already registered. Reload settings and try again.");
  if (error.code === "23503") throw new Error("That task or habit is no longer available. Refresh settings and choose another item.");
  if (error.code === "P0001" && error.message === "This reminder time does not exist because the clocks change. Choose another time.") throw new Error(error.message);
  throw new Error("Couldn’t save notification settings. Check your connection and try again; your input has been kept.");
}
async function result<T>(work: () => Promise<T>): Promise<ActionResult<T>> {
  try { return { ok: true, data: await work() }; }
  catch (error) { return { ok: false, error: error instanceof Error && !error.message.includes("fetch failed") ? error.message : "Couldn’t reach notification settings. Try again." }; }
}

export async function loadNotificationSettings(deviceId: string | null) {
  return result(async () => {
    const { db, userId } = await account();
    if (deviceId) uuid(deviceId);
    const [prefs, rules, devices] = await Promise.all([
      db.from("notification_preferences").select("paused,time_zone,quiet_start,quiet_end").eq("user_id", userId).maybeSingle(),
      db.from("reminder_rules").select("id,task_id,habit_id,enabled,local_date,local_time,time_zone").eq("user_id", userId),
      db.from("push_devices").select("id,endpoint,expires_at").eq("user_id", userId).eq("id", deviceId ?? "00000000-0000-4000-8000-000000000000").maybeSingle(),
    ]);
    databaseError(prefs.error); databaseError(rules.error); databaseError(devices.error);
    return {
      preferences: prefs.data as NotificationPreferences | null,
      rules: (rules.data ?? []) as ReminderRule[],
      device: devices.data as Pick<PushDevice,"id"|"endpoint"|"expires_at"> | null,
    };
  });
}

export async function registerPushDevice(deviceId: string, subscription: DeviceSubscription) {
  return result(async () => {
    uuid(deviceId); validateSubscription(subscription); pushConfiguration();
    const { db, userId } = await account();
    const values = { endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth,
      expires_at: subscription.expirationTime ? new Date(subscription.expirationTime).toISOString() : null };
    const current = await db.from("push_devices").select("id").eq("id", deviceId).eq("user_id", userId).maybeSingle();
    databaseError(current.error);
    const query = current.data
      ? db.from("push_devices").update(values).eq("id", deviceId).eq("user_id", userId)
      : db.from("push_devices").insert({ id: deviceId, user_id: userId, ...values });
    const saved = await query.select("id").single(); databaseError(saved.error);
    return null;
  });
}
export async function removePushDevice(deviceId: string) {
  return result(async () => {
    uuid(deviceId); const { db, userId } = await account();
    const saved = await db.from("push_devices").delete().eq("id", deviceId).eq("user_id", userId);
    databaseError(saved.error); return null;
  });
}
export async function testPushDevice(deviceId: string, endpoint: string) {
  return result(async () => {
    uuid(deviceId); const { db, userId } = await account(); pushConfiguration();
    // RPC enforces ownership, endpoint equality, expiry and a 30-second per-device throttle atomically.
    const claimed = await db.rpc("claim_push_test", { device: deviceId, device_endpoint: endpoint });
    databaseError(claimed.error);
    const device = (claimed.data as PushDevice[] | null)?.[0];
    if (!device) throw new Error("Enable notifications on this device first, or wait 30 seconds before testing again.");
    const outcome = await sendPush(device, "test", `test-${deviceId}`);
    if (outcome === "expired") {
      const removed = await db.from("push_devices").delete().eq("id", deviceId).eq("user_id", userId);
      databaseError(removed.error);
      throw new Error("This subscription expired. Disable notifications, then enable them again.");
    }
    if (outcome === "failed") throw new Error("The push provider didn’t accept the test. Check the server’s VAPID configuration and try again.");
    return null;
  });
}
export async function saveNotificationPreferences(preferences: NotificationPreferences) {
  return result(async () => {
    validatePreferences(preferences); const { db, userId } = await account();
    const saved = await db.from("notification_preferences").upsert({ user_id: userId, paused: preferences.paused,
      time_zone: preferences.time_zone, quiet_start: preferences.quiet_start, quiet_end: preferences.quiet_end });
    databaseError(saved.error); return null;
  });
}
export async function saveReminder(id: string | null, rule: Omit<ReminderRule,"id">) {
  return result(async () => {
    validateReminder(rule); if (id) uuid(id);
    const { db, userId } = await account();
    const itemColumn = rule.task_id ? "task_id" : "habit_id";
    const itemId = rule.task_id ?? rule.habit_id;
    async function findExisting() {
      const found=await db.from("reminder_rules").select("id").eq("user_id",userId).eq(itemColumn,itemId).maybeSingle();
      databaseError(found.error);return found.data?.id as string|undefined;
    }
    // An earlier insert may have succeeded even if its response never reached the form.
    let ruleId=id??await findExisting();
    const values = { enabled: rule.enabled, local_date: rule.local_date, local_time: rule.local_time, time_zone: rule.time_zone };
    async function write() {
      const query = ruleId ? db.from("reminder_rules").update(values).eq("id", ruleId).eq("user_id", userId).eq(itemColumn,itemId)
        : db.from("reminder_rules").insert({ user_id: userId, task_id: rule.task_id, habit_id: rule.habit_id, ...values });
      return query.select("id,task_id,habit_id,enabled,local_date,local_time,time_zone").single();
    }
    let saved=await write();
    if(saved.error?.code==="23505"&&!ruleId){ruleId=await findExisting();if(ruleId)saved=await write();}
    databaseError(saved.error); return saved.data as ReminderRule;
  });
}
export async function deleteReminder(id: string) {
  return result(async () => {
    uuid(id); const { db, userId } = await account();
    const removed = await db.from("reminder_rules").delete().eq("id",id).eq("user_id",userId);
    databaseError(removed.error); return null;
  });
}
