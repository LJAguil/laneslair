export interface DeviceSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
}

export interface NotificationPreferences {
  paused: boolean;
  time_zone: string;
  quiet_start: string | null;
  quiet_end: string | null;
}

export interface ReminderRule {
  id: string;
  task_id: string | null;
  habit_id: string | null;
  enabled: boolean;
  local_date: string | null;
  local_time: string;
  time_zone: string;
}

export interface PushDevice {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  expires_at: string | null;
}

export interface DeliveryJob extends PushDevice {
  delivery_id: string;
  kind: "task" | "habit";
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
