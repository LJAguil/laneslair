"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { applicationKey, deviceId, pushRegistration, pushSupport } from "@/lib/push/browser";
import { loadNotificationSettings, registerPushDevice, removePushDevice, testPushDevice } from "@/lib/push/actions";
import type { DeviceSubscription } from "@/lib/push/types";
import { ReminderSettings } from "./reminder-settings";

type Settings = Extract<Awaited<ReturnType<typeof loadNotificationSettings>>, { ok: true }>["data"];

export function PushSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [support, setSupport] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [checkedAt, setCheckedAt] = useState(0);
  const running = useRef(false);

  const load = useCallback(async () => {
    // Read external browser state after mount, without a synchronous effect update.
    await Promise.resolve();
    try {
      setCheckedAt(Date.now());
      const unsupported = pushSupport(); setSupport(unsupported);
      if ("Notification" in window) setPermission(Notification.permission);
      const loaded = await loadNotificationSettings(deviceId());
      if (!loaded.ok) throw new Error(loaded.error);
      setSettings(loaded.data); setProblem(null);
      if (!unsupported) {
        const registration = await pushRegistration();
        setSubscription(await registration.pushManager.getSubscription());
      }
    } catch (error) { setProblem(error instanceof Error ? error.message : "Couldn’t load notifications. Try again."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(load);
    const refresh = () => { if (!running.current) void load(); };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [load]);

  async function run(work: () => Promise<void>) {
    if (running.current) return;
    running.current = true; setBusy(true); setProblem(null); setNotice("");
    try { await work(); }
    catch (error) { setProblem(error instanceof Error ? error.message : "Notification request failed. Try again."); }
    finally { running.current = false; setBusy(false); }
  }

  function enable() {
    if (running.current || support) return;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) { setProblem("Push keys are not configured yet. See docs/PUSH_REMINDERS.md."); return; }
    // Called directly in the click gesture, before any awaited registration or server request.
    const requested = Notification.requestPermission();
    void run(async () => {
      const granted = await requested; setPermission(granted);
      if (granted !== "granted") throw new Error(granted === "denied" ? "Permission was denied. Change notifications in iPhone/browser settings, then return here." : "Permission wasn’t granted. You can enable notifications whenever you’re ready.");
      const registration = await pushRegistration();
      let sub = await registration.pushManager.getSubscription();
      const expectedKey = applicationKey(publicKey);
      const currentKey = sub?.options.applicationServerKey;
      const differentKey = currentKey && new Uint8Array(currentKey).some((byte,index) => byte !== expectedKey[index]);
      if (sub && ((sub.expirationTime && sub.expirationTime <= Date.now()) || differentKey || settings?.device?.endpoint !== sub.endpoint)) {
        if (!await sub.unsubscribe()) throw new Error("Couldn’t renew this subscription. Try disabling it first.");
        sub = null;
      }
      sub ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: expectedKey });
      setSubscription(sub);
      const saved = await registerPushDevice(deviceId(), sub.toJSON() as DeviceSubscription);
      if (!saved.ok) throw new Error(saved.error);
      await load(); setNotice("Notifications enabled on this device.");
    });
  }

  const enabled = permission === "granted" && subscription && settings?.device?.endpoint === subscription.endpoint &&
    (!settings.device.expires_at || Date.parse(settings.device.expires_at) > checkedAt);

  return <Card id="notifications" className="scroll-mt-24 space-y-4">
    <CardHeader title="Notifications" description="Optional, private reminders on each device you enable." icon={<Bell className="h-[18px] w-[18px]" />} />
    {loading && <p role="status" className="text-sm text-muted">Loading notification settings…</p>}
    {support && <p className="text-sm text-muted">{support}</p>}
    {permission === "denied" && <p className="text-sm text-muted">Permission is blocked. Allow notifications in this app’s iPhone or browser settings, then return here.</p>}
    <p className="text-sm text-muted">{enabled ? "Enabled on this device." : "Not enabled on this device."} Other devices are managed independently. Messages don’t include task or habit titles.</p>
    <div className="flex flex-wrap gap-2">
      <Button variant="primary" disabled={loading || busy || Boolean(support) || permission === "denied" || Boolean(enabled) || !settings} onClick={enable}>Enable notifications</Button>
      <Button disabled={loading || busy || (!subscription && !settings?.device)} onClick={() => void run(async () => {
        const removed = await removePushDevice(deviceId()); if (!removed.ok) throw new Error(removed.error);
        setSettings(current => current ? { ...current, device: null } : current);
        if (subscription && !await subscription.unsubscribe()) throw new Error("Delivery is disabled, but browser cleanup failed. Tap Disable again to retry.");
        setSubscription(null); setNotice("Notifications disabled on this device.");
      })}>Disable notifications</Button>
      <Button disabled={busy || !enabled} onClick={() => void run(async () => {
        const sent = await testPushDevice(deviceId(), subscription!.endpoint); if (!sent.ok) { await load(); throw new Error(sent.error); }
        setNotice("Test accepted by the push provider. Check this device; Focus settings may silence it.");
      })}>Send test notification</Button>
      <Button variant="ghost" disabled={busy || loading} onClick={() => void load()}>Refresh status</Button>
    </div>
    {problem && <p role="alert" className="text-sm text-danger">{problem}</p>}
    {notice && <p role="status" className="text-sm text-success">{notice}</p>}
    <p className="text-xs text-subtle">Disable before sharing this device. Browser permission stays granted after disabling. Expired subscriptions need Enable again. Reminders require the separate server scheduler setup; an open app is not required.</p>
    {settings && <ReminderSettings initial={settings.preferences} rules={settings.rules} onSaved={load} />}
  </Card>;
}
