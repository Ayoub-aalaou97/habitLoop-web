import type { ApiCheckIn } from "@/lib/checkInsApi";
import { normalizeCheckInDate } from "@/lib/checkInsApi";
import type { ApiHabit } from "@/lib/habits";
import { habitGoalLabel } from "@/lib/habits";
import { MOODS } from "@/lib/checkIn";
import {
  computePeriodStats,
  listPeriodSnapshots,
  parseDateKey,
  periodNoun,
  toDateKey,
  type PeriodSnapshot,
} from "@/lib/periodStreak";

export type StatsRange = "30d" | "90d" | "year";

export type StatsKpi = {
  label: string;
  value: string;
  unit: string;
  color: string;
  note: string;
};

export type StatsMonthBar = {
  label: string;
  shortLabel: string;
  monthIndex: number;
  pct: number;
  met: number;
  total: number;
  fill: string;
  isBest: boolean;
  inRange: boolean;
  isCurrent: boolean;
};

export type StatsHobbyRow = {
  id: number;
  name: string;
  color: string;
  goalLabel: string;
  sessions: number;
  pct: number;
};

export type StatsWeekdayBar = {
  label: string;
  fullLabel: string;
  value: number;
  pctHeight: number;
  sharePct: number;
  isMax: boolean;
};

export type StatsMoodRow = {
  n: number;
  label: string;
  face: string;
  pct: number;
  fill: string;
};

export type StatisticsView = {
  range: StatsRange;
  subtitle: string;
  habitCount: number;
  kpis: StatsKpi[];
  months: StatsMonthBar[];
  goalsMet: number;
  goalsTotal: number;
  goalsOverallPct: number;
  bestMonth: string;
  bestMonthPct: number;
  hobbies: StatsHobbyRow[];
  weekdays: StatsWeekdayBar[];
  peakWeekday: string | null;
  moods: StatsMoodRow[];
};

const MONTH_LETTERS = "JFMAMJJASOND".split("");
const MONTH_SHORT = [
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
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
/** Monday-first so the chart matches how people think about a week. */
const WEEKDAY_META = [
  { dayIndex: 1, label: "M", fullLabel: "Mon" },
  { dayIndex: 2, label: "T", fullLabel: "Tue" },
  { dayIndex: 3, label: "W", fullLabel: "Wed" },
  { dayIndex: 4, label: "T", fullLabel: "Thu" },
  { dayIndex: 5, label: "F", fullLabel: "Fri" },
  { dayIndex: 6, label: "S", fullLabel: "Sat" },
  { dayIndex: 0, label: "S", fullLabel: "Sun" },
] as const;
const MOOD_FILLS = ["#fb7185", "#fb923c", "#facc15", "#8a92ff", "#34d399"];
const MOOD_FACES = ["😞", "😐", "🙂", "😄", "🤩"];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = startOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

function rangeStart(range: StatsRange, today: Date, year: number): string {
  if (range === "30d") return toDateKey(addDays(today, -29));
  if (range === "90d") return toDateKey(addDays(today, -89));
  return `${year}-01-01`;
}

function rangeSubtitle(
  range: StatsRange,
  year: number,
  habitCount: number,
): string {
  const noun = habitCount === 1 ? "hobby" : "hobbies";
  if (range === "30d") return `Last 30 days · ${habitCount} ${noun} tracked`;
  if (range === "90d") return `Last 90 days · ${habitCount} ${noun} tracked`;
  return `Jan – Dec ${year} · ${habitCount} ${noun} tracked`;
}

function filterCheckIns(
  checkIns: ApiCheckIn[],
  fromKey: string,
  toKey: string,
): ApiCheckIn[] {
  return checkIns.filter((item) => {
    const key = normalizeCheckInDate(item.date);
    return key >= fromKey && key <= toKey;
  });
}

function uniqueSessionCount(checkIns: ApiCheckIn[]): number {
  const keys = new Set(checkIns.map((item) => normalizeCheckInDate(item.date)));
  return keys.size;
}

/** Closed periods that overlap the selected stats window. */
function periodsInRange(
  periods: PeriodSnapshot[],
  fromKey: string,
  toKey: string,
): PeriodSnapshot[] {
  return periods.filter((period) => {
    if (period.status !== "satisfied" && period.status !== "missed") {
      return false;
    }
    // Period overlaps [fromKey, toKey] if it starts before/on toKey and ends on/after fromKey.
    return period.startKey <= toKey && period.endKey >= fromKey;
  });
}

function consistencyFromPeriods(periods: PeriodSnapshot[]): number {
  if (periods.length === 0) return 0;
  const met = periods.filter((item) => item.satisfied).length;
  return Math.round((met / periods.length) * 100);
}

function monthFill(pct: number, isBest: boolean): string {
  if (pct <= 0) return "var(--heat-empty)";
  if (isBest) return "var(--chart-bar-best)";
  if (pct >= 80) return "linear-gradient(180deg, rgba(52,211,153,0.85), rgba(52,211,153,0.35))";
  if (pct >= 50) return "linear-gradient(180deg, rgba(138,146,255,0.75), rgba(111,123,255,0.35))";
  return "linear-gradient(180deg, rgba(251,146,60,0.7), rgba(251,146,60,0.28))";
}

/**
 * Attribute a closed period to a calendar month.
 * Prefer the month that contains most of the period; fall back to end month.
 */
function monthIndexForPeriod(period: PeriodSnapshot): number {
  const start = parseDateKey(period.startKey);
  const end = parseDateKey(period.endKey);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return start.getMonth();
  }

  // Count days in start vs end month within the period.
  let startMonthDays = 0;
  let endMonthDays = 0;
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    if (cursor.getMonth() === start.getMonth() && cursor.getFullYear() === start.getFullYear()) {
      startMonthDays += 1;
    }
    if (cursor.getMonth() === end.getMonth() && cursor.getFullYear() === end.getFullYear()) {
      endMonthDays += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  if (endMonthDays > startMonthDays) return end.getMonth();
  return start.getMonth();
}

function monthOverlapsRange(
  year: number,
  monthIndex: number,
  fromKey: string,
  toKey: string,
): boolean {
  const startKey = toDateKey(new Date(year, monthIndex, 1));
  const endKey = toDateKey(new Date(year, monthIndex + 1, 0));
  return startKey <= toKey && endKey >= fromKey;
}

export function buildStatisticsView(opts: {
  habits: ApiHabit[];
  checkInsByHabit: Record<number, ApiCheckIn[]>;
  frozenByHabit?: Record<string, string[]>;
  range?: StatsRange;
  today?: Date;
}): StatisticsView {
  const today = startOfDay(opts.today ?? new Date());
  const year = today.getFullYear();
  const range = opts.range ?? "year";
  const fromKey = rangeStart(range, today, year);
  const toKey = toDateKey(today);
  const habits = opts.habits;
  const frozenByHabit = opts.frozenByHabit ?? {};

  const perHabit = habits.map((habit) => {
    const all = opts.checkInsByHabit[habit.id] ?? [];
    const frozenPeriodKeys =
      frozenByHabit[String(habit.id)] ??
      frozenByHabit[habit.id as unknown as string] ??
      [];
    const inRange = filterCheckIns(all, fromKey, toKey);
    const stats = computePeriodStats({
      habit,
      checkIns: all,
      today,
      frozenPeriodKeys,
    });
    const periods = listPeriodSnapshots({
      habit,
      checkIns: all,
      today,
      frozenPeriodKeys,
    });
    const rangedPeriods = periodsInRange(periods, fromKey, toKey);
    return {
      habit,
      all,
      inRange,
      stats,
      periods,
      rangedPeriods,
      sessions: uniqueSessionCount(inRange),
      consistency: consistencyFromPeriods(rangedPeriods),
      goalLabel: habitGoalLabel(habit),
    };
  });

  const totalSessions = perHabit.reduce((sum, row) => sum + row.sessions, 0);

  const allRangedPeriods = perHabit.flatMap((row) => row.rangedPeriods);
  const goalsMet = allRangedPeriods.filter((p) => p.satisfied).length;
  const goalsTotal = allRangedPeriods.length;
  const goalCompletion =
    goalsTotal === 0 ? 0 : Math.round((goalsMet / goalsTotal) * 100);

  let active = perHabit[0] ?? null;
  for (const row of perHabit) {
    if (!active || row.stats.currentStreak > active.stats.currentStreak) {
      active = row;
    }
  }

  let longest = perHabit[0] ?? null;
  for (const row of perHabit) {
    if (!longest || row.stats.longestStreak > longest.stats.longestStreak) {
      longest = row;
    }
  }

  const activeUnit = active
    ? periodNoun(active.stats.streakUnit, active.stats.currentStreak)
    : "days";
  const longestUnit = longest
    ? periodNoun(longest.stats.streakUnit, longest.stats.longestStreak)
    : "days";

  const kpis: StatsKpi[] = [
    {
      label: "GOAL COMPLETION",
      value: String(goalCompletion),
      unit: "%",
      color: "var(--accent-stat)",
      note:
        goalsTotal === 0
          ? "no closed periods yet"
          : `${goalsMet} of ${goalsTotal} period goals met`,
    },
    {
      label: "TOTAL SESSIONS",
      value: String(totalSessions),
      unit: "logged",
      color: "var(--kpi-sessions)",
      note:
        range === "30d"
          ? "last 30 days"
          : range === "90d"
            ? "last 90 days"
            : `since January ${year}`,
    },
    {
      label: "ACTIVE STREAK",
      value: String(active?.stats.currentStreak ?? 0),
      unit: activeUnit,
      color: active?.habit.color ?? "var(--accent-cyan)",
      note: active
        ? `${active.habit.name} · still running`
        : "start a habit to track streaks",
    },
    {
      label: "LONGEST STREAK",
      value: String(longest?.stats.longestStreak ?? 0),
      unit: longestUnit,
      color: "var(--accent-amber)",
      note: longest ? longest.habit.name : "—",
    },
  ];

  const monthBuckets = Array.from({ length: 12 }, () => ({
    sat: 0,
    total: 0,
  }));

  for (const row of perHabit) {
    for (const period of row.rangedPeriods) {
      const end = parseDateKey(period.endKey);
      // Keep calendar year buckets for the chart (current year).
      if (end.getFullYear() !== year && parseDateKey(period.startKey).getFullYear() !== year) {
        continue;
      }
      const monthIndex = monthIndexForPeriod(period);
      const periodYear =
        parseDateKey(period.startKey).getMonth() === monthIndex
          ? parseDateKey(period.startKey).getFullYear()
          : end.getFullYear();
      if (periodYear !== year) continue;

      const bucket = monthBuckets[monthIndex]!;
      bucket.total += 1;
      if (period.satisfied) bucket.sat += 1;
    }
  }

  const monthPcts = monthBuckets.map((bucket) =>
    bucket.total === 0 ? 0 : Math.round((bucket.sat / bucket.total) * 100),
  );
  const bestPct = Math.max(0, ...monthPcts);
  const bestIndex = monthPcts.findIndex((pct) => pct === bestPct && pct > 0);
  const currentMonth = today.getMonth();

  const months: StatsMonthBar[] = monthPcts.map((pct, i) => {
    const bucket = monthBuckets[i]!;
    const isBest = i === bestIndex && pct > 0;
    const inRange = monthOverlapsRange(year, i, fromKey, toKey);
    return {
      label: MONTH_LETTERS[i] ?? "",
      shortLabel: MONTH_SHORT[i] ?? "",
      monthIndex: i,
      pct,
      met: bucket.sat,
      total: bucket.total,
      isBest,
      inRange,
      isCurrent: i === currentMonth,
      fill: monthFill(pct, isBest),
    };
  });

  const hobbies: StatsHobbyRow[] = perHabit
    .map((row) => ({
      id: row.habit.id,
      name: row.habit.name,
      color: row.habit.color,
      goalLabel: row.goalLabel,
      sessions: row.sessions,
      pct: row.consistency,
    }))
    .sort((a, b) => b.pct - a.pct || b.sessions - a.sessions);

  const weekdayCounts = Array.from({ length: 7 }, () => 0);
  for (const row of perHabit) {
    const seen = new Set<string>();
    for (const item of row.inRange) {
      const key = normalizeCheckInDate(item.date);
      if (seen.has(key)) continue;
      seen.add(key);
      weekdayCounts[parseDateKey(key).getDay()]! += 1;
    }
  }

  const weekdayTotal = weekdayCounts.reduce((sum, n) => sum + n, 0);
  const weekdayMax = Math.max(0, ...weekdayCounts);
  const weekdays: StatsWeekdayBar[] = WEEKDAY_META.map((meta) => {
    const value = weekdayCounts[meta.dayIndex] ?? 0;
    return {
      label: meta.label,
      fullLabel: meta.fullLabel,
      value,
      pctHeight: weekdayMax === 0 ? 0 : Math.round((value / weekdayMax) * 100),
      sharePct: weekdayTotal === 0 ? 0 : Math.round((value / weekdayTotal) * 100),
      isMax: value === weekdayMax && value > 0,
    };
  });

  const peakMeta = weekdays.find((day) => day.isMax) ?? null;

  const moodCounts = Array.from({ length: 5 }, () => 0);
  let moodTotal = 0;
  for (const row of perHabit) {
    for (const item of row.inRange) {
      const mood = Math.min(5, Math.max(1, Math.round(item.mood)));
      moodCounts[mood - 1]! += 1;
      moodTotal += 1;
    }
  }
  const moods: StatsMoodRow[] = MOODS.map((mood, i) => {
    const count = moodCounts[i] ?? 0;
    return {
      n: mood.n,
      label: mood.label,
      face: MOOD_FACES[i] ?? "🙂",
      pct: moodTotal === 0 ? 0 : Math.round((count / moodTotal) * 100),
      fill: MOOD_FILLS[i] ?? "#8a92ff",
    };
  });

  return {
    range,
    subtitle: rangeSubtitle(range, year, habits.length),
    habitCount: habits.length,
    kpis,
    months,
    goalsMet,
    goalsTotal,
    goalsOverallPct: goalCompletion,
    bestMonth: bestIndex >= 0 ? (MONTH_NAMES[bestIndex] ?? "—") : "—",
    bestMonthPct: bestPct,
    hobbies,
    weekdays,
    peakWeekday: peakMeta?.fullLabel ?? null,
    moods,
  };
}
