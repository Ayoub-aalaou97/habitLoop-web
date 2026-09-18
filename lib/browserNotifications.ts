import { toApiReminderTime } from "@/lib/habits";
import type { ReminderRow, ReminderSettings } from "@/lib/reminders";

const FIRED_PREFIX = "habitloop_push_fired:";
const SETTINGS_CACHE_KEY = "habitloop_reminder_settings_v1";
const SCHEDULE_KEY = "habitloop_reminder_schedule_v1";

export type LocalReminderSchedule = {
  rows: ReminderRow[];
  pushEnabled: boolean;
  questionsByHabitId: Record<number, string | null | undefined>;
  updatedAt: number;
};

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function ensureNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function cacheReminderSettings(settings: ReminderSettings) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function peekReminderSettings(): ReminderSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ReminderSettings;
  } catch {
    return null;
  }
}

/** Live schedule used by the notifier (includes unsaved Reminder page edits). */
export function writeLocalReminderSchedule(
  schedule: Omit<LocalReminderSchedule, "updatedAt">,
  opts?: { silent?: boolean },
) {
  if (typeof window === "undefined") return;
  try {
    const payload: LocalReminderSchedule = {
      ...schedule,
      updatedAt: Date.now(),
    };
    sessionStorage.setItem(SCHEDULE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
  if (!opts?.silent) notifyRemindersUpdated();
}

export function peekLocalReminderSchedule(): LocalReminderSchedule | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SCHEDULE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalReminderSchedule;
    if (!Array.isArray(parsed?.rows)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function notifyRemindersUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("habitloop:reminders-updated"));
}

function firedKey(habitId: number, at: Date) {
  const stamp = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}-${String(at.getHours()).padStart(2, "0")}-${String(at.getMinutes()).padStart(2, "0")}`;
  return `${FIRED_PREFIX}${habitId}:${stamp}`;
}

function alreadyFired(habitId: number, at: Date): boolean {
  try {
    return sessionStorage.getItem(firedKey(habitId, at)) === "1";
  } catch {
    return false;
  }
}

function markFired(habitId: number, at: Date) {
  try {
    sessionStorage.setItem(firedKey(habitId, at), "1");
  } catch {
    // ignore
  }
}

export type HabitNotifyPayload = {
  habitId: number;
  name: string;
  question?: string | null;
  isTest?: boolean;
};

export function showHabitNotification(payload: HabitNotifyPayload): boolean {
  if (!notificationsSupported() || Notification.permission !== "granted") {
    return false;
  }

  const title = payload.isTest
    ? `Test reminder · ${payload.name}`
    : `Reminder · ${payload.name}`;
  const body =
    payload.question?.trim() ||
    (payload.isTest
      ? "This is a test nudge from HabitLoop."
      : `Did you do ${payload.name} today?`);

  try {
    const notification = new Notification(title, {
      body,
      tag: `habitloop-habit-${payload.habitId}-${payload.isTest ? "test" : "due"}`,
    });
    notification.onclick = () => {
      window.focus();
      window.location.href = `/dashboard/habits/${payload.habitId}`;
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

/** Next Date the reminder should fire (strictly in the future). */
export function nextOccurrenceAt(
  days: boolean[],
  timeUi: string,
  now = new Date(),
): Date | null {
  const api = toApiReminderTime(timeUi);
  if (!api || !days.some(Boolean)) return null;
  const [hStr, mStr] = api.split(":");
  const hour = Number(hStr);
  const minute = Number(mStr);

  for (let offset = 0; offset < 8; offset++) {
    const candidate = new Date(now);
    candidate.setSeconds(0, 0);
    candidate.setMilliseconds(0);
    candidate.setDate(now.getDate() + offset);
    if (!days[candidate.getDay()]) continue;
    candidate.setHours(hour, minute, 0, 0);
    if (candidate.getTime() <= now.getTime()) continue;
    return candidate;
  }
  return null;
}

export function rowDueThisMinute(row: ReminderRow, now = new Date()): boolean {
  if (!row.enabled) return false;
  if (!row.days[now.getDay()]) return false;
  const api = toApiReminderTime(row.time);
  if (!api) return false;
  const [hStr, mStr] = api.split(":");
  return now.getHours() === Number(hStr) && now.getMinutes() === Number(mStr);
}

/**
 * Fire one browser notification per habit that is due this minute.
 */
export function tickHabitNotifications(opts: {
  rows: ReminderRow[];
  pushEnabled: boolean;
  questionsByHabitId?: Record<number, string | null | undefined>;
}): number {
  if (!opts.pushEnabled) return 0;
  if (!notificationsSupported() || Notification.permission !== "granted") {
    return 0;
  }

  const now = new Date();
  let fired = 0;
  for (const row of opts.rows) {
    if (!row.enabled) continue;
    if (!rowDueThisMinute(row, now)) continue;
    if (alreadyFired(row.habitId, now)) continue;
    const ok = showHabitNotification({
      habitId: row.habitId,
      name: row.name,
      question: opts.questionsByHabitId?.[row.habitId],
    });
    if (ok) {
      markFired(row.habitId, now);
      fired += 1;
    }
  }
  return fired;
}

export function pushChannelDetail(): string {
  const perm = notificationPermission();
  if (perm === "unsupported") return "Not supported in this browser";
  if (perm === "granted") return "This device · works minimized";
  if (perm === "denied") return "Blocked — enable in browser settings";
  return "This device · tap to allow";
}

export const TIME_PRESETS = [
  { label: "7:00 AM", value: "7:00 AM" },
  { label: "8:00 AM", value: "8:00 AM" },
  { label: "12:00 PM", value: "12:00 PM" },
  { label: "5:00 PM", value: "5:00 PM" },
  { label: "6:00 PM", value: "6:00 PM" },
  { label: "8:00 PM", value: "8:00 PM" },
  { label: "9:00 PM", value: "9:00 PM" },
] as const;
