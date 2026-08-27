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

export type ReminderUpNext = {
  name: string;
  color: string;
  when: string;
  time: string;
};

const DAYS_STORAGE_KEY = "habitloop:reminder-days";
const GENERAL_STORAGE_KEY = "habitloop:reminder-general";
const CHANNELS_STORAGE_KEY = "habitloop:reminder-channels";

function defaultDaysForHabit(habit: ApiHabit): boolean[] {
  if (habit.frequency_type === "daily" || habit.frequency_type === "every_x_days") {
    return [true, true, true, true, true, true, true];
  }
  if (habit.frequency_type === "x_times_per_week") {
    const count = Math.max(1, Math.min(7, habit.frequency_count ?? 3));
    // Prefer Mon/Wed/Fri pattern, then fill remaining weekdays.
    const preferred = [1, 3, 5, 2, 4, 6, 0];
    const days = [false, false, false, false, false, false, false];
    for (let i = 0; i < count; i++) {
      days[preferred[i]!] = true;
    }
    return days;
  }
  // Monthly / other — default weekdays
  return [false, true, true, true, true, true, false];
}

function readDaysMap(): Record<string, boolean[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DAYS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean[]>;
  } catch {
    return {};
  }
}

export function writeDaysMap(map: Record<string, boolean[]>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DAYS_STORAGE_KEY, JSON.stringify(map));
}

export function defaultGeneral(): ReminderGeneral {
  return {
    streakRisk: true,
    quietHours: true,
    freezeSuggestions: false,
  };
}

export function readGeneral(): ReminderGeneral {
  if (typeof window === "undefined") return defaultGeneral();
  try {
    const raw = window.localStorage.getItem(GENERAL_STORAGE_KEY);
    if (!raw) return defaultGeneral();
    return { ...defaultGeneral(), ...(JSON.parse(raw) as ReminderGeneral) };
  } catch {
    return defaultGeneral();
  }
}

export function writeGeneral(value: ReminderGeneral) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GENERAL_STORAGE_KEY, JSON.stringify(value));
}

export function defaultChannels(emailHint = "your email"): ReminderChannel[] {
  return [
    { id: "push", name: "Push notifications", detail: "This device", on: true },
    { id: "email", name: "Email", detail: emailHint, on: false },
    {
      id: "weekly",
      name: "Weekly summary",
      detail: "Sundays · 6:00 PM",
      on: true,
    },
  ];
}

export function readChannels(emailHint?: string): ReminderChannel[] {
  const fallback = defaultChannels(emailHint);
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(CHANNELS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as ReminderChannel[];
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export function writeChannels(value: ReminderChannel[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(value));
}

export function buildReminderRows(habits: ApiHabit[]): ReminderRow[] {
  const daysMap = readDaysMap();
  return habits.map((habit) => {
    const stored = daysMap[String(habit.id)];
    const days =
      Array.isArray(stored) && stored.length === 7
        ? stored.map(Boolean)
        : defaultDaysForHabit(habit);
    return {
      habitId: habit.id,
      name: habit.name,
      color: habit.color,
      enabled: Boolean(habit.reminder_time),
      time: fromApiReminderTime(habit.reminder_time),
      days,
      dirty: false,
    };
  });
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

export async function updateHabitReminderTime(
  habitId: number,
  timeUi: string | null,
): Promise<ApiHabit> {
  const reminder_time = timeUi ? toApiReminderTime(timeUi) : null;
  const res = await fetch(`${API_URL}/api/habits/${habitId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ reminder_time }),
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
