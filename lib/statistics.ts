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
  pct: number;
  fill: string;
  isBest: boolean;
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
  value: number;
  pctHeight: number;
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
  bestMonth: string;
  bestMonthPct: number;
  hobbies: StatsHobbyRow[];
  weekdays: StatsWeekdayBar[];
  moods: StatsMoodRow[];
};

const MONTH_LETTERS = "JFMAMJJASOND".split("");
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
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
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

export function buildStatisticsView(opts: {
  habits: ApiHabit[];
  checkInsByHabit: Record<number, ApiCheckIn[]>;
  range?: StatsRange;
  today?: Date;
}): StatisticsView {
  const today = startOfDay(opts.today ?? new Date());
  const year = today.getFullYear();
  const range = opts.range ?? "year";
  const fromKey = rangeStart(range, today, year);
  const toKey = toDateKey(today);
  const habits = opts.habits;

  const perHabit = habits.map((habit) => {
    const all = opts.checkInsByHabit[habit.id] ?? [];
    const inRange = filterCheckIns(all, fromKey, toKey);
    const stats = computePeriodStats({ habit, checkIns: all, today });
    const periods = listPeriodSnapshots({ habit, checkIns: all, today });
    return {
      habit,
      all,
      inRange,
      stats,
      periods,
      sessions: uniqueSessionCount(inRange),
      goalLabel: habitGoalLabel(habit),
    };
  });

  const totalSessions = perHabit.reduce((sum, row) => sum + row.sessions, 0);
  const goalCompletion =
    perHabit.length === 0
      ? 0
      : Math.round(
          perHabit.reduce((sum, row) => sum + row.stats.consistency, 0) /
            perHabit.length,
        );

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
      color: "#9aa3ff",
      note:
        habits.length === 0
          ? "no hobbies yet"
          : `average across ${habits.length} ${habits.length === 1 ? "hobby" : "hobbies"}`,
    },
    {
      label: "TOTAL SESSIONS",
      value: String(totalSessions),
      unit: "logged",
      color: "#e8e9ec",
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
      color: active?.habit.color ?? "#38bdf8",
      note: active
        ? `${active.habit.name} · still running`
        : "start a habit to track streaks",
    },
    {
      label: "LONGEST STREAK",
      value: String(longest?.stats.longestStreak ?? 0),
      unit: longestUnit,
      color: "#fcd34d",
      note: longest ? longest.habit.name : "—",
    },
  ];

  const monthBuckets = Array.from({ length: 12 }, () => ({
    sat: 0,
    total: 0,
  }));

  for (const row of perHabit) {
    for (const period of row.periods) {
      if (period.status !== "satisfied" && period.status !== "missed") continue;
      const end = parseDateKey(period.endKey);
      if (end.getFullYear() !== year) continue;
      if (range !== "year") {
        if (period.endKey < fromKey || period.startKey > toKey) continue;
      }
      const bucket = monthBuckets[end.getMonth()]!;
      bucket.total += 1;
      if (period.satisfied) bucket.sat += 1;
    }
  }

  const monthPcts = monthBuckets.map((bucket) =>
    bucket.total === 0 ? 0 : Math.round((bucket.sat / bucket.total) * 100),
  );
  const bestPct = Math.max(0, ...monthPcts);
  const bestIndex = monthPcts.findIndex((pct) => pct === bestPct && pct > 0);

  const months: StatsMonthBar[] = monthPcts.map((pct, i) => {
    const isBest = i === bestIndex && pct > 0;
    return {
      label: MONTH_LETTERS[i] ?? "",
      pct,
      isBest,
      fill: isBest
        ? "linear-gradient(180deg,#9aa3ff,#6f7bff)"
        : "linear-gradient(180deg,#3a4060,#2b3050)",
    };
  });

  const hobbies: StatsHobbyRow[] = perHabit
    .map((row) => ({
      id: row.habit.id,
      name: row.habit.name,
      color: row.habit.color,
      goalLabel: row.goalLabel,
      sessions: row.sessions,
      pct: row.stats.consistency,
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
  const weekdayMax = Math.max(1, ...weekdayCounts);
  const weekdays: StatsWeekdayBar[] = WEEKDAY_LABELS.map((label, i) => {
    const value = weekdayCounts[i] ?? 0;
    return {
      label,
      value,
      pctHeight: Math.round((value / weekdayMax) * 100),
      isMax: value === weekdayMax && value > 0,
    };
  });

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
    bestMonth: bestIndex >= 0 ? (MONTH_NAMES[bestIndex] ?? "—") : "—",
    bestMonthPct: bestPct,
    hobbies,
    weekdays,
    moods,
  };
}
