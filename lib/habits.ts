import { API_URL, ApiErrorBody, getToken } from "@/lib/auth";
import { DashboardHobby, MiniHeatCell } from "@/lib/dashboardMock";
import type { CreateHabitDraft } from "@/components/dashboard/CreateHabitModal";
import type { ApiCheckIn } from "@/lib/checkInsApi";
import { normalizeCheckInDate } from "@/lib/checkInsApi";

export type ApiHabit = {
  id: number;
  user_id: number;
  name: string;
  question: string | null;
  color: string;
  note: string | null;
  type: "build" | "quit";
  frequency_type:
    | "daily"
    | "every_x_days"
    | "x_times_per_week"
    | "x_times_in_y_days";
  frequency_count: number | null;
  frequency_period_days: number | null;
  reminder_time: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateHabitPayload = {
  name: string;
  question?: string | null;
  color: string;
  note?: string | null;
  type: "build" | "quit";
  frequency_type: ApiHabit["frequency_type"];
  frequency_count?: number | null;
  frequency_period_days?: number | null;
  reminder_time?: string | null;
};

function authHeaders(): HeadersInit {
  const token = getToken();
  if (!token) {
    throw new Error("You are not logged in.");
  }

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

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "").trim();
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return startOfDay(new Date(y!, (m ?? 1) - 1, d ?? 1));
}

function startOfWeekSunday(date: Date) {
  const next = startOfDay(date);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function moodToAlpha(mood: number): number {
  if (mood >= 5) return 0.95;
  if (mood >= 4) return 0.68;
  if (mood >= 3) return 0.42;
  return 0.2;
}

function checkInsByDateMap(checkIns: ApiCheckIn[]) {
  const map = new Map<string, ApiCheckIn>();
  for (const item of checkIns) {
    const key = normalizeCheckInDate(item.date);
    const existing = map.get(key);
    if (!existing || item.id > existing.id) {
      map.set(key, item);
    }
  }
  return map;
}

function computeStreak(loggedKeys: Set<string>): number {
  if (loggedKeys.size === 0) return 0;

  const today = startOfDay(new Date());
  const yesterday = startOfDay(new Date(today));
  yesterday.setDate(yesterday.getDate() - 1);

  let cursor = loggedKeys.has(toDateKey(today))
    ? today
    : loggedKeys.has(toDateKey(yesterday))
      ? yesterday
      : null;

  if (!cursor) return 0;

  let streak = 0;
  while (loggedKeys.has(toDateKey(cursor))) {
    streak += 1;
    cursor = startOfDay(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function buildMiniFromCheckIns(
  colorHex: string,
  byDate: Map<string, ApiCheckIn>,
): MiniHeatCell[][] {
  const { r, g, b } = hexToRgb(colorHex);
  const off = `rgba(${r},${g},${b},0.08)`;
  const today = startOfDay(new Date());
  const weekStart = startOfWeekSunday(today);

  const week: MiniHeatCell[] = [];
  for (let d = 0; d < 7; d++) {
    const day = startOfDay(new Date(weekStart));
    day.setDate(weekStart.getDate() + d);
    const dateKey = toDateKey(day);

    if (day.getTime() > today.getTime()) {
      week.push({ color: off, dateKey, checked: false });
      continue;
    }

    const checkIn = byDate.get(dateKey);
    week.push(
      checkIn
        ? {
            color: `rgba(${r},${g},${b},${moodToAlpha(checkIn.mood)})`,
            dateKey,
            checked: true,
          }
        : { color: off, dateKey, checked: false },
    );
  }

  return [week];
}

function countInCurrentWeek(byDate: Map<string, ApiCheckIn>): number {
  const today = startOfDay(new Date());
  const weekStart = startOfWeekSunday(today);
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    if (day.getTime() > today.getTime()) break;
    if (byDate.has(toDateKey(day))) count += 1;
  }
  return count;
}

function countInCurrentMonth(byDate: Map<string, ApiCheckIn>): number {
  const today = startOfDay(new Date());
  const y = today.getFullYear();
  const m = today.getMonth();
  let count = 0;
  for (const key of byDate.keys()) {
    const date = parseDateKey(key);
    if (date.getFullYear() === y && date.getMonth() === m) count += 1;
  }
  return count;
}

export function habitGoalLabel(habit: ApiHabit): string {
  const count = habit.frequency_count ?? 1;

  switch (habit.frequency_type) {
    case "daily":
      return "Daily";
    case "every_x_days":
      return count === 1 ? "Every day" : `Every ${count} days`;
    case "x_times_per_week":
      return `${count}× / week`;
    case "x_times_in_y_days": {
      const period = habit.frequency_period_days ?? 30;
      if (period === 30) return `${count}× / month`;
      return `${count}× in ${period} days`;
    }
    default:
      return "Custom";
  }
}

export function apiHabitToCard(
  habit: ApiHabit,
  checkIns: ApiCheckIn[] = [],
): DashboardHobby {
  const byDate = checkInsByDateMap(checkIns);
  const isMonthly = habit.frequency_type === "x_times_in_y_days";
  const target = isMonthly
    ? Math.max(1, habit.frequency_count ?? 1)
    : habit.frequency_type === "daily"
      ? 7
      : Math.max(1, Math.min(7, habit.frequency_count ?? 1));

  const doneRaw = isMonthly
    ? countInCurrentMonth(byDate)
    : countInCurrentWeek(byDate);
  const done = Math.min(target, doneRaw);

  return {
    id: String(habit.id),
    name: habit.name,
    color: habit.color,
    goalLabel: habitGoalLabel(habit),
    streak: computeStreak(new Set(byDate.keys())),
    unit: isMonthly ? "this month" : "this week",
    done,
    target,
    weekDots: Array.from({ length: target }, (_, i) => ({
      on: i < done,
      off: i >= done,
    })),
    mini: buildMiniFromCheckIns(habit.color, byDate),
  };
}

/** UI "8:00 PM" / "20:00" → API `H:i` */
export function toApiReminderTime(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const twentyFour = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) {
    const h = Number(twentyFour[1]);
    const m = twentyFour[2];
    if (h >= 0 && h <= 23) {
      return `${String(h).padStart(2, "0")}:${m}`;
    }
  }

  const twelve = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!twelve) return null;

  let h = Number(twelve[1]);
  const m = twelve[2];
  const mer = twelve[3].toUpperCase();
  if (mer === "PM" && h < 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m}`;
}

export function draftToCreatePayload(draft: CreateHabitDraft): CreateHabitPayload {
  let frequency_type: ApiHabit["frequency_type"] = "daily";
  let frequency_count: number | null = null;
  let frequency_period_days: number | null = null;

  if (draft.frequency === "daily") {
    frequency_type = "daily";
  } else if (draft.frequency === "weekly") {
    frequency_type = "x_times_per_week";
    frequency_count = draft.times;
  } else {
    frequency_type = "x_times_in_y_days";
    frequency_count = draft.times;
    frequency_period_days = 30;
  }

  return {
    name: draft.name.trim(),
    question: draft.frage.trim() || null,
    color: draft.color,
    type: "build",
    frequency_type,
    frequency_count,
    frequency_period_days,
    reminder_time: draft.reminderEnabled
      ? toApiReminderTime(draft.reminderTime)
      : null,
  };
}

export async function fetchHabits(): Promise<ApiHabit[]> {
  const res = await fetch(`${API_URL}/api/habits`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(await readApiError(res));
  }

  return res.json();
}

export async function fetchHabit(id: number): Promise<ApiHabit> {
  const res = await fetch(`${API_URL}/api/habits/${id}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(await readApiError(res));
  }

  return res.json();
}

export async function createHabit(
  payload: CreateHabitPayload,
): Promise<ApiHabit> {
  const res = await fetch(`${API_URL}/api/habits`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await readApiError(res));
  }

  return res.json();
}

export async function updateHabit(
  id: number,
  payload: CreateHabitPayload,
): Promise<ApiHabit> {
  const res = await fetch(`${API_URL}/api/habits/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await readApiError(res));
  }

  return res.json();
}

export async function deleteHabit(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/habits/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(await readApiError(res));
  }
}

/** API `H:i` / datetime → UI "8:00 PM" */
export function fromApiReminderTime(value: string | null): string {
  if (!value) return "8:00 PM";

  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return "8:00 PM";

  let h = Number(match[1]);
  const m = match[2];
  const mer = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${mer}`;
}

export function apiHabitToDraft(habit: ApiHabit): CreateHabitDraft {
  let frequency: CreateHabitDraft["frequency"] = "daily";
  let times = 1;

  if (habit.frequency_type === "x_times_per_week") {
    frequency = "weekly";
    times = habit.frequency_count ?? 3;
  } else if (habit.frequency_type === "x_times_in_y_days") {
    frequency = "monthly";
    times = habit.frequency_count ?? 2;
  } else if (habit.frequency_type === "every_x_days") {
    frequency = "daily";
    times = 1;
  }

  return {
    name: habit.name,
    frage: habit.question ?? "",
    color: habit.color,
    frequency,
    times,
    reminderEnabled: Boolean(habit.reminder_time),
    reminderTime: fromApiReminderTime(habit.reminder_time),
  };
}
