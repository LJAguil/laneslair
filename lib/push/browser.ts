export function pushSupport() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  if (ios && !standalone) return "On iPhone, open this site in Safari, use Share → Add to Home Screen, then open the Home Screen app. Push needs iOS 16.4 or later.";
  if (!window.isSecureContext) return "Notifications need HTTPS (or localhost for development).";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "This browser doesn’t support Web Push. On iPhone, use an up-to-date iOS Home Screen app.";
  return null;
}

export function deviceId() {
  const key = "lanes-lair-push-device";
  try {
    let id = localStorage.getItem(key);
    if (!id || !/^[a-f0-9-]{36}$/i.test(id)) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
    return id;
  } catch { throw new Error("Allow browser storage to manage this device’s notifications."); }
}

export function applicationKey(value: string): Uint8Array<ArrayBuffer> {
  const raw = atob(value.replace(/-/g,"+").replace(/_/g,"/"));
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

export async function pushRegistration() {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => { timeout=setTimeout(() => reject(new Error("The notification worker is not ready. Reload and try again.")), 12000); }),
    ]);
  } finally { clearTimeout(timeout); }
}
