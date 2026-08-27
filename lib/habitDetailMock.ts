import type { ApiHabit } from "@/lib/habits";
import { habitGoalLabel } from "@/lib/habits";
import type { ApiCheckIn } from "@/lib/checkInsApi";
import { normalizeCheckInDate } from "@/lib/checkInsApi";

export type ActivityDayCell = {
  color: string;
  /** YYYY-MM-DD when in the year grid; null for padding cells. */
  dateKey: string | null;
  checked: boolean;
};

export type ActivityWeek = {
  label: string;
  days: ActivityDayCell[];
};

export type HabitDetailCheckIn = {
  dayLabel: string;
  timeLabel: string;
  note: string;
  mood: number;
};

export type HabitDetailView = {
  goalBadge: string;
  startedLabel: string;
  reminderLabel: string | null;
  currentStreak: number;
  longestStreak: number;
  completion: number;
  sessions: number;
  thisWeekDone: number;
  thisWeekTarget: number;
  weeks: ActivityWeek[];
  dayLabels: string[];
  monthly: { label: string; pct: number }[];
  checkIns: HabitDetailCheckIn[];
  loggedDateKeys: Set<string>;
};

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTH_LETTERS = "JFMAMJJASOND".split("");
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "").trim();
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return { r, g, b };
}

function cellColor(
  rgb: { r: number; g: number; b: number },
  level: number,
): string {
  if (level <= 0) return "rgba(255,255,255,0.045)";
  const alpha = [0.2, 0.42, 0.68, 0.95][Math.max(0, Math.min(3, level - 1))]!;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

function weekTarget(habit: ApiHabit): number {
  if (habit.frequency_type === "daily") return 7;
  if (habit.frequency_type === "x_times_per_week") {
    return Math.max(1, Math.min(7, habit.frequency_count ?? 1));
  }
  if (habit.frequency_type === "x_times_in_y_days") {
    return Math.max(1, habit.frequency_count ?? 1);
  }
  return 1;
}

function formatStarted(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "started recently";

  const month = MONTHS_SHORT[date.getMonth()] ?? "";
  return `started ${month} ${date.getFullYear()}`;
}

function formatReminder(value: string | null): string | null {
  if (!value) return null;

  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return "Reminder set";

  let h = Number(match[1]);
  const m = match[2];
  const mer = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `Reminder · ${h}:${m} ${mer}`;
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

/** Sunday-based week start (matches existing heatmap orientation). */
function startOfWeekSunday(date: Date) {
  const next = startOfDay(date);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function moodToLevel(mood: number): number {
  if (mood >= 5) return 4;
  if (mood >= 4) return 3;
  if (mood >= 3) return 2;
  return 1;
}

function generateActivityFromCheckIns(opts: {
  colorHex: string;
  checkInsByDate: Map<string, ApiCheckIn>;
}): { weeks: ActivityWeek[]; sessions: number } {
  const { colorHex, checkInsByDate } = opts;
  const rgb = hexToRgb(colorHex);

  const today = startOfDay(new Date());
  const todayMs = today.getTime();
  const year = today.getFullYear();

  const yearStart = startOfDay(new Date(year, 0, 1));
  const yearEnd = startOfDay(new Date(year, 11, 31));
  const gridStart = startOfWeekSunday(yearStart);
  const gridEnd = startOfWeekSunday(yearEnd);
  gridEnd.setDate(gridEnd.getDate() + 6);

  // Use calendar-day offsets (not ms) so DST cannot skip/shift dates.
  const totalDays =
    Math.round((gridEnd.getTime() - gridStart.getTime()) / 86400000) + 1;
  const weekCount = Math.ceil(totalDays / 7);

  let sessions = 0;
  const weeks: ActivityWeek[] = [];
  let prevMonth = -1;

  for (let c = 0; c < weekCount; c++) {
    let labelMonth = -1;
    for (let r = 0; r < 7; r++) {
      const day = startOfDay(new Date(gridStart));
      day.setDate(gridStart.getDate() + c * 7 + r);
      if (
        day.getFullYear() === year &&
        day.getTime() >= yearStart.getTime() &&
        day.getTime() <= yearEnd.getTime()
      ) {
        labelMonth = day.getMonth();
        break;
      }
    }

    const label =
      labelMonth >= 0 && labelMonth !== prevMonth
        ? (MONTHS_SHORT[labelMonth] ?? "")
        : "";
    if (labelMonth >= 0) prevMonth = labelMonth;

    const days: ActivityDayCell[] = [];
    for (let r = 0; r < 7; r++) {
      const day = startOfDay(new Date(gridStart));
      day.setDate(gridStart.getDate() + c * 7 + r);
      const dayMs = day.getTime();
      const inYear =
        dayMs >= yearStart.getTime() && dayMs <= yearEnd.getTime();
      const key = toDateKey(day);
      const checkIn = checkInsByDate.get(key);

      if (!inYear) {
        days.push({ color: "transparent", dateKey: null, checked: false });
      } else if (dayMs > todayMs) {
        days.push({ color: cellColor(rgb, 0), dateKey: key, checked: false });
      } else if (checkIn) {
        sessions += 1;
        days.push({
          color: cellColor(rgb, moodToLevel(checkIn.mood)),
          dateKey: key,
          checked: true,
        });
      } else {
        days.push({ color: cellColor(rgb, 0), dateKey: key, checked: false });
      }
    }
    weeks.push({ label, days });
  }

  return { weeks, sessions };
}

function computeStreaks(sortedDateKeys: string[]): {
  current: number;
  longest: number;
} {
  if (sortedDateKeys.length === 0) return { current: 0, longest: 0 };

  const unique = [...new Set(sortedDateKeys)].sort();
  const today = startOfDay(new Date());
  const todayKey = toDateKey(today);
  const yesterday = startOfDay(new Date(today));
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);

  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = parseDateKey(unique[i - 1]!);
    const curr = parseDateKey(unique[i]!);
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  const set = new Set(unique);
  let current = 0;
  let cursor =
    set.has(todayKey) ? today : set.has(yesterdayKey) ? yesterday : null;

  if (cursor) {
    while (set.has(toDateKey(cursor))) {
      current += 1;
      cursor = startOfDay(new Date(cursor));
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  return { current, longest: Math.max(longest, current) };
}

function formatRecentCheckIn(checkIn: ApiCheckIn): HabitDetailCheckIn {
  const date = parseDateKey(normalizeCheckInDate(checkIn.date));
  const today = startOfDay(new Date());
  const diff = Math.round((today.getTime() - date.getTime()) / 86400000);

  let dayLabel = WEEKDAY_SHORT[date.getDay()] ?? "";
  if (diff === 0) dayLabel = "Today";
  else if (diff === 1) dayLabel = "Yesterday";

  const created = new Date(checkIn.created_at);
  let timeLabel = "";
  if (!Number.isNaN(created.getTime())) {
    let h = created.getHours();
    const m = String(created.getMinutes()).padStart(2, "0");
    const mer = h >= 12 ? "p" : "a";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    timeLabel = `${h}:${m}${mer}`;
  }

  return {
    dayLabel,
    timeLabel,
    note: checkIn.note?.trim() || "Logged a session.",
    mood: checkIn.mood,
  };
}

function thisWeekCount(checkInsByDate: Map<string, ApiCheckIn>): number {
  const today = startOfDay(new Date());
  const weekStart = startOfWeekSunday(today);
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    if (day.getTime() > today.getTime()) break;
    if (checkInsByDate.has(toDateKey(day))) count += 1;
  }
  return count;
}

function monthlyFromCheckIns(
  checkIns: ApiCheckIn[],
  year: number,
): { label: string; pct: number }[] {
  const counts = Array.from({ length: 12 }, () => 0);
  for (const item of checkIns) {
    const key = normalizeCheckInDate(item.date);
    const date = parseDateKey(key);
    if (date.getFullYear() !== year) continue;
    counts[date.getMonth()] = (counts[date.getMonth()] ?? 0) + 1;
  }

  const max = Math.max(1, ...counts);
  return counts.map((count, i) => ({
    label: MONTH_LETTERS[i] ?? "",
    pct: Math.max(count > 0 ? 12 : 4, Math.round((count / max) * 100)),
  }));
}

/** Build habit detail UI from habit + real API check-ins. */
export function buildHabitDetailView(
  habit: ApiHabit,
  checkIns: ApiCheckIn[] = [],
): HabitDetailView {
  const checkInsByDate = new Map<string, ApiCheckIn>();
  for (const item of checkIns) {
    const key = normalizeCheckInDate(item.date);
    const existing = checkInsByDate.get(key);
    if (!existing || item.id > existing.id) {
      checkInsByDate.set(key, item);
    }
  }

  const loggedDateKeys = new Set(checkInsByDate.keys());
  const { weeks, sessions } = generateActivityFromCheckIns({
    colorHex: habit.color,
    checkInsByDate,
  });

  const sortedKeys = [...loggedDateKeys].sort();
  const { current: currentStreak, longest: longestStreak } =
    computeStreaks(sortedKeys);

  const thisWeekTarget = weekTarget(habit);
  const thisWeekDone = Math.min(thisWeekTarget, thisWeekCount(checkInsByDate));
  const completion =
    thisWeekTarget > 0
      ? Math.min(100, Math.round((thisWeekDone / thisWeekTarget) * 100))
      : 0;

  const recent = [...checkIns]
    .sort((a, b) => {
      const dateCmp = normalizeCheckInDate(b.date).localeCompare(
        normalizeCheckInDate(a.date),
      );
      if (dateCmp !== 0) return dateCmp;
      return b.id - a.id;
    })
    .slice(0, 4)
    .map(formatRecentCheckIn);

  return {
    goalBadge: `${habitGoalLabel(habit)} goal`,
    startedLabel: formatStarted(habit.created_at),
    reminderLabel: formatReminder(habit.reminder_time),
    currentStreak,
    longestStreak,
    completion,
    sessions,
    thisWeekDone,
    thisWeekTarget,
    weeks,
    dayLabels: ["", "Mon", "", "Wed", "", "Fri", ""],
    monthly: monthlyFromCheckIns(checkIns, new Date().getFullYear()),
    checkIns: recent,
    loggedDateKeys,
  };
}

export function habitColorWithAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
