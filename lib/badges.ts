import type { ApiCheckIn } from "@/lib/checkInsApi";
import { normalizeCheckInDate } from "@/lib/checkInsApi";
import type { ApiHabit } from "@/lib/habits";
import {
  computePeriodStats,
  listPeriodSnapshots,
  parseDateKey,
} from "@/lib/periodStreak";

export type BadgeItem = {
  id: string;
  label: string;
  desc: string;
  mark: string;
  have: number;
  need: number;
  unit?: string;
  unlocked: boolean;
  pct: number;
  progress: string;
};

export type BadgesView = {
  earned: BadgeItem[];
  locked: BadgeItem[];
  all: BadgeItem[];
  earnedCount: number;
  total: number;
  pct: number;
  nextBadge: BadgeItem | null;
  subtitle: string;
};

function uniqueSessionCount(checkIns: ApiCheckIn[]): number {
  const keys = new Set(checkIns.map((item) => normalizeCheckInDate(item.date)));
  return keys.size;
}

function maxLongestStreak(
  habits: ApiHabit[],
  checkInsByHabit: Record<number, ApiCheckIn[]>,
): number {
  let max = 0;
  for (const habit of habits) {
    const stats = computePeriodStats({
      habit,
      checkIns: checkInsByHabit[habit.id] ?? [],
    });
    max = Math.max(max, stats.longestStreak);
  }
  return max;
}

/** Longest run of consecutive satisfied closed periods on any habit. */
function maxConsecutiveSatisfiedPeriods(
  habits: ApiHabit[],
  checkInsByHabit: Record<number, ApiCheckIn[]>,
): number {
  let best = 0;
  for (const habit of habits) {
    const periods = listPeriodSnapshots({
      habit,
      checkIns: checkInsByHabit[habit.id] ?? [],
    }).filter(
      (item) => item.status === "satisfied" || item.status === "missed",
    );
    let run = 0;
    for (const item of periods) {
      if (item.satisfied) {
        run += 1;
        best = Math.max(best, run);
      } else {
        run = 0;
      }
    }
  }
  return best;
}

/** Best month: count of satisfied closed periods in any single calendar month. */
function bestPerfectMonthProgress(
  habits: ApiHabit[],
  checkInsByHabit: Record<number, ApiCheckIn[]>,
): { have: number; need: number } {
  const byMonth = new Map<string, { sat: number; total: number }>();

  for (const habit of habits) {
    const periods = listPeriodSnapshots({
      habit,
      checkIns: checkInsByHabit[habit.id] ?? [],
    });
    for (const period of periods) {
      if (period.status !== "satisfied" && period.status !== "missed") continue;
      const end = parseDateKey(period.endKey);
      const key = `${end.getFullYear()}-${end.getMonth()}`;
      const bucket = byMonth.get(key) ?? { sat: 0, total: 0 };
      bucket.total += 1;
      if (period.satisfied) bucket.sat += 1;
      byMonth.set(key, bucket);
    }
  }

  let bestSat = 0;
  let bestTotal = 0;
  for (const bucket of byMonth.values()) {
    if (bucket.total === 0) continue;
    if (
      bucket.sat === bucket.total &&
      bucket.total >= bestTotal &&
      bucket.sat >= bestSat
    ) {
      bestSat = bucket.sat;
      bestTotal = bucket.total;
    } else if (bucket.sat > bestSat) {
      bestSat = bucket.sat;
      bestTotal = Math.max(bucket.total, bestSat);
    }
  }

  // Need at least one closed period in a month with 100% satisfaction;
  // progress shown as satisfied periods toward a full clean month (use best month totals).
  if (bestTotal > 0 && bestSat === bestTotal) {
    return { have: bestSat, need: bestTotal };
  }
  if (bestTotal === 0) return { have: 0, need: 4 };
  return { have: bestSat, need: bestTotal };
}

function formatProgress(have: number, need: number, unit?: string): string {
  const capped = Math.min(have, need);
  return unit ? `${capped} / ${need} ${unit}` : `${capped} / ${need}`;
}

export function buildBadgesView(opts: {
  habits: ApiHabit[];
  checkInsByHabit: Record<number, ApiCheckIn[]>;
}): BadgesView {
  const { habits, checkInsByHabit } = opts;

  let totalSessions = 0;
  for (const habit of habits) {
    totalSessions += uniqueSessionCount(checkInsByHabit[habit.id] ?? []);
  }

  const longest = maxLongestStreak(habits, checkInsByHabit);
  const consecutive = maxConsecutiveSatisfiedPeriods(habits, checkInsByHabit);
  const perfect = bestPerfectMonthProgress(habits, checkInsByHabit);

  const defs: Array<{
    id: string;
    label: string;
    desc: string;
    mark: string;
    have: number;
    need: number;
    unit?: string;
  }> = [
    {
      id: "first-log",
      label: "First Log",
      desc: "Logged your first session",
      mark: "1",
      have: totalSessions,
      need: 1,
    },
    {
      id: "streak-7",
      label: "7-Period Streak",
      desc: "7 loops closed in a row",
      mark: "7",
      have: longest,
      need: 7,
      unit: "loops",
    },
    {
      id: "sessions-30",
      label: "30 Sessions",
      desc: "30 total check-ins",
      mark: "30",
      have: totalSessions,
      need: 30,
    },
    {
      id: "consistent",
      label: "Consistent",
      desc: "4 periods closed, no gaps",
      mark: "4w",
      have: consecutive,
      need: 4,
      unit: "loops",
    },
    {
      id: "century",
      label: "Century",
      desc: "100 total sessions",
      mark: "100",
      have: totalSessions,
      need: 100,
    },
    {
      id: "perfect-month",
      label: "Perfect Month",
      desc: "Every goal met in one month",
      mark: "✓",
      have: perfect.have,
      need: perfect.need,
      unit: "loops",
    },
    {
      id: "collector",
      label: "Collector",
      desc: "Track 5 hobbies",
      mark: "5",
      have: habits.length,
      need: 5,
      unit: "hobbies",
    },
    {
      id: "streak-90",
      label: "90-Period Streak",
      desc: "Reach a 90-loop streak",
      mark: "90",
      have: longest,
      need: 90,
      unit: "loops",
    },
  ];

  const all: BadgeItem[] = defs.map((def) => {
    const unlocked = def.have >= def.need;
    const pct = Math.min(100, Math.round((def.have / def.need) * 100));
    return {
      ...def,
      unlocked,
      pct,
      progress: formatProgress(def.have, def.need, def.unit),
    };
  });

  const earned = all.filter((item) => item.unlocked);
  const locked = all
    .filter((item) => !item.unlocked)
    .sort((a, b) => b.pct - a.pct);
  const nextBadge = locked[0] ?? null;
  const earnedCount = earned.length;
  const total = all.length;
  const pct = total === 0 ? 0 : Math.round((earnedCount / total) * 100);

  return {
    earned,
    locked,
    all,
    earnedCount,
    total,
    pct,
    nextBadge,
    subtitle: `${earnedCount} of ${total} earned · keep logging to unlock the rest`,
  };
}
