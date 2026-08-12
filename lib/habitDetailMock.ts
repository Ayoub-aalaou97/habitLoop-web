import type { ApiHabit } from "@/lib/habits";
import { habitGoalLabel } from "@/lib/habits";

export type ActivityWeek = {
  label: string;
  days: string[];
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

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "").trim();
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return { r, g, b };
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
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

/** Sunday-based week start (matches existing heatmap orientation). */
function startOfWeekSunday(date: Date) {
  const next = startOfDay(date);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function generateActivity(opts: {
  colorHex: string;
  density: number;
  seed: number;
  streakLen: number;
}): { weeks: ActivityWeek[]; sessions: number } {
  const { colorHex, density, seed, streakLen } = opts;
  const rgb = hexToRgb(colorHex);
  const rng = mulberry32(seed);
  const DAY = 86400000;

  const today = startOfDay(new Date());
  const tms = today.getTime();
  const year = today.getFullYear();

  const yearStart = startOfDay(new Date(year, 0, 1));
  const yearEnd = startOfDay(new Date(year, 11, 31));
  const gridStart = startOfWeekSunday(yearStart);
  const gridEnd = startOfWeekSunday(yearEnd);
  gridEnd.setDate(gridEnd.getDate() + 6);

  const totalDays =
    Math.round((gridEnd.getTime() - gridStart.getTime()) / DAY) + 1;
  const weekCount = Math.ceil(totalDays / 7);
  const levels: number[] = Array.from({ length: totalDays }, () => 0);

  for (let i = 0; i < totalDays; i++) {
    const dt = gridStart.getTime() + i * DAY;
    const inYear = dt >= yearStart.getTime() && dt <= yearEnd.getTime();
    if (!inYear || dt > tms) continue;
    if (rng() < density) {
      levels[i] = 1 + Math.floor(rng() * 3.999);
    }
  }

  const todayIdx = Math.round((tms - gridStart.getTime()) / DAY);
  for (let k = 0; k < streakLen; k++) {
    const idx = todayIdx - k;
    if (idx < 0 || idx >= totalDays) continue;
    const dt = gridStart.getTime() + idx * DAY;
    if (dt < yearStart.getTime()) continue;
    levels[idx] = Math.max(levels[idx] ?? 0, 2 + (k % 2));
  }

  const weeks: ActivityWeek[] = [];
  let prevMonth = -1;

  for (let c = 0; c < weekCount; c++) {
    // Prefer a day inside the current year for the month label.
    let labelMonth = -1;
    for (let r = 0; r < 7; r++) {
      const day = new Date(gridStart.getTime() + (c * 7 + r) * DAY);
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

    const days: string[] = [];
    for (let r = 0; r < 7; r++) {
      const idx = c * 7 + r;
      const dt = gridStart.getTime() + idx * DAY;
      const inYear = dt >= yearStart.getTime() && dt <= yearEnd.getTime();

      // Keep a visible empty box for every day in the year (including future).
      if (!inYear) {
        days.push("transparent");
      } else if (dt > tms) {
        days.push(cellColor(rgb, 0));
      } else {
        days.push(cellColor(rgb, levels[idx] ?? 0));
      }
    }
    weeks.push({ label, days });
  }

  return {
    weeks,
    sessions: levels.filter((level, idx) => {
      if (level <= 0) return false;
      const dt = gridStart.getTime() + idx * DAY;
      return dt >= yearStart.getTime() && dt <= tms;
    }).length,
  };
}

const CHECKIN_NOTES = [
  "Showed up and kept the loop going.",
  "Felt strong — logged a solid session.",
  "Kept it light, still counts.",
  "Tired but showed up anyway.",
  "Worked on form and consistency.",
  "Hit a small personal best.",
];

function mockCheckIns(seed: number, colorUnused: string): HabitDetailCheckIn[] {
  void colorUnused;
  const rng = mulberry32(seed + 99);
  const labels = ["Today", "Sat", "Fri", "Thu"];
  const times = ["6:40a", "7:10a", "6:30a", "7:00a"];

  return labels.map((dayLabel, i) => ({
    dayLabel,
    timeLabel: times[i] ?? "7:00a",
    note: CHECKIN_NOTES[Math.floor(rng() * CHECKIN_NOTES.length)]!,
    mood: 3 + Math.floor(rng() * 3),
  }));
}

/** Stable mock detail stats until check-ins API exists. */
export function buildHabitDetailView(habit: ApiHabit): HabitDetailView {
  const seed = habit.id * 97 + habit.name.length * 13;
  const density =
    habit.frequency_type === "daily"
      ? 0.78
      : habit.frequency_type === "x_times_per_week"
        ? 0.42
        : 0.18;

  const currentStreak =
    habit.frequency_type === "daily"
      ? 12 + (habit.id % 15)
      : 3 + (habit.id % 9);
  const longestStreak = currentStreak + 8 + (habit.id % 12);
  const thisWeekTarget = weekTarget(habit);
  const thisWeekDone = Math.min(
    thisWeekTarget,
    Math.max(0, thisWeekTarget - (habit.id % 3)),
  );
  const completion = Math.round(
    70 + ((habit.id * 7) % 25) + (thisWeekDone / thisWeekTarget) * 5,
  );

  const { weeks, sessions } = generateActivity({
    colorHex: habit.color,
    density,
    seed,
    streakLen: Math.min(20, currentStreak),
  });

  const monthlyBase = [58, 64, 72, 88, 79, 94, 70, 61, 83, 90, 76, 86];
  const monthly = monthlyBase.map((pct, i) => ({
    label: MONTH_LETTERS[i] ?? "",
    pct: Math.max(12, Math.min(100, pct + ((seed + i * 3) % 11) - 5)),
  }));

  return {
    goalBadge: `${habitGoalLabel(habit)} goal`,
    startedLabel: formatStarted(habit.created_at),
    reminderLabel: formatReminder(habit.reminder_time),
    currentStreak,
    longestStreak,
    completion: Math.min(99, completion),
    sessions: Math.max(sessions, currentStreak),
    thisWeekDone,
    thisWeekTarget,
    weeks,
    dayLabels: ["", "Mon", "", "Wed", "", "Fri", ""],
    monthly,
    checkIns: mockCheckIns(seed, habit.color),
  };
}

export function habitColorWithAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
