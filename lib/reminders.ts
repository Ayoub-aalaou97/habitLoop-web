import type { ApiHabit } from "@/lib/habits";
import { fromApiReminderTime, toApiReminderTime } from "@/lib/habits";
import { API_URL, ApiErrorBody, getToken } from "@/lib/auth";

export const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
export const DAY_NAMES = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export type ReminderRow = {
  habitId: number;
  name: string;
  color: string;
  enabled: boolean;
  time: string; // "8:00 PM"
  days: boolean[]; // Sun–Sat
  dirty: boolean;
};

export type ReminderChannel = {
  id: string;
  name: string;
  detail: string;
  on: boolean;
};

export type ReminderGeneral = {
  streakRisk: boolean;
  quietHours: boolean;
  freezeSuggestions: boolean;
};

export type ReminderSettings = {
  timezone: string;
  email_enabled: boolean;
  push_enabled: boolean;
  weekly_summary: boolean;
  quiet_hours: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  streak_risk: boolean;
  freeze_suggestions: boolean;
  email: string;
};

export type ReminderUpNext = {
  name: string;
  color: string;
  when: string;
  time: string;
};

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function defaultDaysForHabit(habit: ApiHabit): boolean[] {
  if (habit.frequency_type === "daily" || habit.frequency_type === "every_x_days") {
    return [true, true, true, true, true, true, true];
  }
  if (habit.frequency_type === "x_times_per_week") {
    const count = Math.max(1, Math.min(7, habit.frequency_count ?? 3));
    const preferred = [1, 3, 5, 2, 4, 6, 0];
    const days = [false, false, false, false, false, false, false];
    for (let i = 0; i < count; i++) {
      days[preferred[i]!] = true;
    }
    return days;
  }
  return [false, true, true, true, true, true, false];
}

export function daysFromHabit(habit: ApiHabit): boolean[] {
  if (Array.isArray(habit.reminder_days) && habit.reminder_days.length === 7) {
    return habit.reminder_days.map(Boolean);
  }
  return defaultDaysForHabit(habit);
}

export function defaultGeneral(): ReminderGeneral {
  return {
    streakRisk: true,
    quietHours: true,
    freezeSuggestions: false,
  };
}

export function defaultChannels(_emailHint = "your email"): ReminderChannel[] {
  return [
    {
      id: "push",
      name: "Browser notifications",
      detail: "This device · works minimized",
      on: false,
    },
  ];
}

export function settingsToGeneral(settings: ReminderSettings): ReminderGeneral {
  return {
    streakRisk: settings.streak_risk,
    quietHours: settings.quiet_hours,
    freezeSuggestions: settings.freeze_suggestions,
  };
}

export function settingsToChannels(settings: ReminderSettings): ReminderChannel[] {
  return [
    {
      id: "push",
      name: "Browser notifications",
      detail: "This device · works minimized",
      on: settings.push_enabled,
    },
  ];
}

export function buildReminderRows(habits: ApiHabit[]): ReminderRow[] {
  return habits.map((habit) => ({
    habitId: habit.id,
    name: habit.name,
    color: habit.color,
    enabled: Boolean(habit.reminder_time),
    time: fromApiReminderTime(habit.reminder_time),
    days: daysFromHabit(habit),
    dirty: false,
  }));
}

export function formatDaysSubtitle(days: boolean[]): string {
  const active = days
    .map((on, i) => (on ? DAY_NAMES[i] : null))
    .filter(Boolean) as string[];
  if (active.length === 0) return "No days selected";
  if (active.length === 7) return "Every day";
  if (
    active.length === 5 &&
    days[1] &&
    days[2] &&
    days[3] &&
    days[4] &&
    days[5] &&
    !days[0] &&
    !days[6]
  ) {
    return "Weekdays";
  }
  if (active.length === 2 && days[0] && days[6]) return "Sat · Sun";
  return active.map((d) => d.slice(0, 3)).join(" · ");
}

export function formatQuietHoursLabel(start: string, end: string): string {
  const toUi = (hi: string) => {
    const [hStr, mStr] = hi.split(":");
    let h = Number(hStr);
    const m = Number(mStr);
    const mer = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, "0")} ${mer}`;
  };
  return `${toUi(start)} – ${toUi(end)}`;
}

export function shiftReminderTime(time: string, minutes: number): string {
  const api = toApiReminderTime(time);
  if (!api) return time;
  const [hStr, mStr] = api.split(":");
  let total = Number(hStr) * 60 + Number(mStr) + minutes;
  total = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return fromApiReminderTime(
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
  );
}

function authHeaders(): HeadersInit {
  const token = getToken();
  if (!token) throw new Error("You are not logged in.");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function readApiError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as ApiErrorBody;
  const fieldError = data.errors
    ? Object.values(data.errors).flat()[0]
    : undefined;
  return fieldError || data.message || `Request failed (${res.status}).`;
}

export async function fetchReminderSettings(): Promise<ReminderSettings> {
  const res = await fetch(`${API_URL}/api/reminders/settings`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json();
}

export async function updateReminderSettings(
  patch: Partial<{
    timezone: string;
    email_enabled: boolean;
    push_enabled: boolean;
    weekly_summary: boolean;
    quiet_hours: boolean;
    quiet_hours_start: string;
    quiet_hours_end: string;
    streak_risk: boolean;
    freeze_suggestions: boolean;
  }>,
): Promise<ReminderSettings> {
  const res = await fetch(`${API_URL}/api/reminders/settings`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json();
}

export async function updateHabitReminder(
  habitId: number,
  opts: { timeUi: string | null; days: boolean[] },
): Promise<ApiHabit> {
  const reminder_time = opts.timeUi ? toApiReminderTime(opts.timeUi) : null;
  const res = await fetch(`${API_URL}/api/habits/${habitId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({
      reminder_time,
      reminder_days: opts.days,
    }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json();
}

/** @deprecated use updateHabitReminder */
export async function updateHabitReminderTime(
  habitId: number,
  timeUi: string | null,
): Promise<ApiHabit> {
  return updateHabitReminder(habitId, {
    timeUi,
    days: [true, true, true, true, true, true, true],
  });
}

export type TestReminderResponse = {
  message: string;
  habit_id: number;
  habit_name: string;
  email: string;
  timezone?: string;
};

export async function sendTestReminder(
  habitId?: number | null,
): Promise<TestReminderResponse> {
  const res = await fetch(`${API_URL}/api/reminders/test`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(habitId != null ? { habit_id: habitId } : {}),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json();
}

function nextOccurrence(
  days: boolean[],
  timeUi: string,
  now = new Date(),
): { when: string; time: string } | null {
  const api = toApiReminderTime(timeUi);
  if (!api || !days.some(Boolean)) return null;
  const [hStr, mStr] = api.split(":");
  const hour = Number(hStr);
  const minute = Number(mStr);

  for (let offset = 0; offset < 8; offset++) {
    const candidate = new Date(now);
    candidate.setHours(0, 0, 0, 0);
    candidate.setDate(now.getDate() + offset);
    if (!days[candidate.getDay()]) continue;
    candidate.setHours(hour, minute, 0, 0);
    if (candidate.getTime() <= now.getTime()) continue;

    let when = "Today";
    if (offset === 1) when = "Tomorrow";
    else if (offset > 1) {
      when = DAY_NAMES[candidate.getDay()] ?? "Soon";
    }
    return { when, time: timeUi };
  }
  return null;
}

export function buildUpNext(rows: ReminderRow[]): ReminderUpNext[] {
  const items: Array<ReminderUpNext & { sort: number }> = [];
  const now = new Date();

  for (const row of rows) {
    if (!row.enabled) continue;
    const next = nextOccurrence(row.days, row.time, now);
    if (!next) continue;
    const api = toApiReminderTime(row.time);
    const [h, m] = (api ?? "00:00").split(":").map(Number);
    const dayIdx = DAY_NAMES.indexOf(
      next.when === "Today"
        ? (DAY_NAMES[now.getDay()] as (typeof DAY_NAMES)[number])
        : next.when === "Tomorrow"
          ? (DAY_NAMES[(now.getDay() + 1) % 7] as (typeof DAY_NAMES)[number])
          : (next.when as (typeof DAY_NAMES)[number]),
    );
    const sortBase =
      next.when === "Today" ? 0 : next.when === "Tomorrow" ? 1 : dayIdx + 2;
    items.push({
      name: row.name,
      color: row.color,
      when: next.when,
      time: next.time,
      sort: sortBase * 10000 + (h ?? 0) * 60 + (m ?? 0),
    });
  }

  return items
    .sort((a, b) => a.sort - b.sort)
    .slice(0, 5)
    .map(({ name, color, when, time }) => ({ name, color, when, time }));
}

export function hexToRgb(hex: string) {
  const clean = hex.replace("#", "").trim();
  return {
    r: parseInt(clean.slice(0, 2), 16) || 0,
    g: parseInt(clean.slice(2, 4), 16) || 0,
    b: parseInt(clean.slice(4, 6), 16) || 0,
  };
}
