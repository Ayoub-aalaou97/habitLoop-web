import type { ApiCheckIn } from "@/lib/checkInsApi";
import { normalizeCheckInDate } from "@/lib/checkInsApi";

type HabitGoalSource = {
  frequency_type: string;
  frequency_count: number | null;
  created_at?: string;
};

export type HabitPeriod = "day" | "week" | "month";
export type LoopStatus = "satisfied" | "missed" | "progress" | "future";

export type HabitGoal = {
  period: HabitPeriod;
  target: number;
};

export type PeriodSnapshot = {
  key: string;
  startKey: string;
  endKey: string;
  done: number;
  target: number;
  satisfied: boolean;
  status: LoopStatus;
  frozen?: boolean;
};

export type PeriodStats = {
  goal: HabitGoal;
  currentStreak: number;
  longestStreak: number;
  consistency: number;
  periodDone: number;
  periodTarget: number;
  periodLabel: string;
  streakUnit: HabitPeriod;
  streakUnitLabel: string;
  atRisk: boolean;
  riskLabel: string | null;
  daysLeft: number;
  needed: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.slice(0, 10).split("-").map(Number);
  return startOfDay(new Date(y!, (m ?? 1) - 1, d ?? 1));
}

function startOfWeekSunday(date: Date) {
  const next = startOfDay(date);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function addDays(date: Date, days: number) {
  const next = startOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function uniqueCheckInDates(checkIns: ApiCheckIn[]): Set<string> {
  const keys = new Set<string>();
  for (const item of checkIns) {
    keys.add(normalizeCheckInDate(item.date));
  }
  return keys;
}

export function goalFromHabit(
  habit: Pick<HabitGoalSource, "frequency_type" | "frequency_count">,
): HabitGoal {
  if (habit.frequency_type === "x_times_per_week") {
    return { period: "week", target: clamp(habit.frequency_count ?? 4, 1, 7) };
  }
  if (habit.frequency_type === "x_times_in_y_days") {
    return { period: "month", target: clamp(habit.frequency_count ?? 1, 1, 31) };
  }
  return { period: "day", target: 1 };
}

export function periodNoun(period: HabitPeriod, count = 1): string {
  if (period === "day") return count === 1 ? "day" : "days";
  if (period === "week") return count === 1 ? "week" : "weeks";
  return count === 1 ? "month" : "months";
}

export function periodLabel(period: HabitPeriod): string {
  if (period === "day") return "today";
  if (period === "week") return "this week";
  return "this month";
}

export function startOfPeriod(date: Date, period: HabitPeriod): Date {
  const day = startOfDay(date);
  if (period === "week") return startOfWeekSunday(day);
  if (period === "month") return startOfDay(new Date(day.getFullYear(), day.getMonth(), 1));
  return day;
}

export function endOfPeriod(date: Date, period: HabitPeriod): Date {
  const start = startOfPeriod(date, period);
  if (period === "week") return addDays(start, 6);
  if (period === "month") {
    return startOfDay(new Date(start.getFullYear(), start.getMonth() + 1, 0));
  }
  return start;
}

export function periodKey(date: Date, period: HabitPeriod): string {
  const start = startOfPeriod(date, period);
  if (period === "month") {
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
  }
  return toDateKey(start);
}

function shiftPeriod(date: Date, period: HabitPeriod, delta: number): Date {
  const start = startOfPeriod(date, period);
  if (period === "day") return addDays(start, delta);
  if (period === "week") return addDays(start, delta * 7);
  return startOfDay(new Date(start.getFullYear(), start.getMonth() + delta, 1));
}

function countInRange(dates: Set<string>, start: Date, end: Date): number {
  let count = 0;
  const cursor = startOfDay(start);
  while (cursor.getTime() <= end.getTime()) {
    if (dates.has(toDateKey(cursor))) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function daysInRange(start: Date, end: Date): number {
  if (end.getTime() < start.getTime()) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function activeRange(
  periodStart: Date,
  periodEnd: Date,
  startedAt: Date | null,
): { start: Date; end: Date } | null {
  const start = startedAt && startedAt.getTime() > periodStart.getTime()
    ? startedAt
    : periodStart;
  if (start.getTime() > periodEnd.getTime()) return null;
  return { start, end: periodEnd };
}

function snapshotFor(
  date: Date,
  period: HabitPeriod,
  target: number,
  dates: Set<string>,
  today: Date,
  startedAt: Date | null = null,
  frozenKeys: Set<string> = new Set(),
): PeriodSnapshot | null {
  const periodStart = startOfPeriod(date, period);
  const periodEnd = endOfPeriod(date, period);
  const range = activeRange(periodStart, periodEnd, startedAt);
  if (!range) return null;

  const key = periodKey(date, period);
  const periodTarget = Math.max(
    1,
    Math.min(target, daysInRange(range.start, range.end)),
  );
  const done = countInRange(dates, range.start, range.end);
  const frozen = frozenKeys.has(key);
  const satisfied = done >= periodTarget || frozen;
  const todayMs = today.getTime();
  let status: LoopStatus = "missed";
  if (range.start.getTime() > todayMs) status = "future";
  else if (periodEnd.getTime() >= todayMs) {
    status = satisfied ? "satisfied" : "progress";
  } else {
    status = satisfied ? "satisfied" : "missed";
  }

  return {
    key,
    startKey: toDateKey(range.start),
    endKey: toDateKey(range.end),
    done,
    target: periodTarget,
    satisfied,
    status,
    frozen,
  };
}

function listClosedAndCurrent(
  period: HabitPeriod,
  target: number,
  dates: Set<string>,
  startedAt: Date,
  today: Date,
  frozenKeys: Set<string> = new Set(),
): PeriodSnapshot[] {
  const periods: PeriodSnapshot[] = [];
  let cursor = startOfPeriod(startedAt, period);
  const last = startOfPeriod(today, period);

  while (cursor.getTime() <= last.getTime()) {
    const snap = snapshotFor(
      cursor,
      period,
      target,
      dates,
      today,
      startedAt,
      frozenKeys,
    );
    if (snap) periods.push(snap);
    cursor = shiftPeriod(cursor, period, 1);
  }
  return periods;
}

function longestSatisfiedRun(periods: PeriodSnapshot[]): number {
  let longest = 0;
  let run = 0;
  for (const item of periods) {
    if (item.status === "future" || item.status === "progress") continue;
    if (item.satisfied) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }
  return longest;
}

function currentSatisfiedRun(periods: PeriodSnapshot[]): number {
  const countable = periods.filter((item) => item.status !== "future");
  if (countable.length === 0) return 0;

  let streak = 0;
  for (let i = countable.length - 1; i >= 0; i--) {
    const item = countable[i]!;
    if (item.status === "progress") continue;
    if (item.satisfied) streak += 1;
    else break;
  }
  return streak;
}

export function daysLeftInPeriod(
  today: Date,
  period: HabitPeriod,
  startedAt: Date | null = null,
): number {
  const end = endOfPeriod(today, period);
  const start = startedAt && startedAt.getTime() > today.getTime()
    ? startedAt
    : today;
  return daysInRange(startOfDay(start), end);
}

export function computePeriodStats(opts: {
  habit: HabitGoalSource & { created_at: string };
  checkIns: ApiCheckIn[];
  today?: Date;
  frozenPeriodKeys?: string[];
}): PeriodStats {
  const today = startOfDay(opts.today ?? new Date());
  const goal = goalFromHabit(opts.habit);
  const dates = uniqueCheckInDates(opts.checkIns);
  const frozenKeys = new Set(opts.frozenPeriodKeys ?? []);
  const startedAt = startOfDay(new Date(opts.habit.created_at));
  const origin = Number.isNaN(startedAt.getTime()) ? today : startedAt;

  const periods = listClosedAndCurrent(
    goal.period,
    goal.target,
    dates,
    origin,
    today,
    frozenKeys,
  );
  const current = periods[periods.length - 1];
  const closed = periods.filter(
    (item) => item.status === "satisfied" || item.status === "missed",
  );
  const rolling = closed.slice(-12);
  const consistency =
    rolling.length === 0
      ? 0
      : Math.round(
          (rolling.filter((item) => item.satisfied).length / rolling.length) *
            100,
        );

  const periodDone = current?.done ?? 0;
  const periodTarget = current?.target ?? goal.target;
  const needed = Math.max(0, periodTarget - periodDone);
  const daysLeft = daysLeftInPeriod(today, goal.period, origin);
  const inProgress = current?.status === "progress" || current?.status === "satisfied";
  const atRisk = Boolean(inProgress && needed > 0 && daysLeft <= needed);
  const riskLabel = atRisk
    ? `${daysLeft} ${periodNoun("day", daysLeft)} left · ${needed} to close the loop`
    : null;

  return {
    goal,
    currentStreak: currentSatisfiedRun(periods),
    longestStreak: longestSatisfiedRun(periods),
    consistency,
    periodDone,
    periodTarget,
    periodLabel: periodLabel(goal.period),
    streakUnit: goal.period,
    streakUnitLabel: `${goal.period} streak`,
    atRisk,
    riskLabel,
    daysLeft,
    needed,
  };
}

export function listPeriodSnapshots(opts: {
  habit: HabitGoalSource & { created_at: string };
  checkIns: ApiCheckIn[];
  today?: Date;
  frozenPeriodKeys?: string[];
}): PeriodSnapshot[] {
  const today = startOfDay(opts.today ?? new Date());
  const goal = goalFromHabit(opts.habit);
  const dates = uniqueCheckInDates(opts.checkIns);
  const frozenKeys = new Set(opts.frozenPeriodKeys ?? []);
  const startedAt = startOfDay(new Date(opts.habit.created_at));
  const origin = Number.isNaN(startedAt.getTime()) ? today : startedAt;
  return listClosedAndCurrent(
    goal.period,
    goal.target,
    dates,
    origin,
    today,
    frozenKeys,
  );
}

export function loopStatusForWeek(
  weekStartKey: string,
  statsHabit: Pick<
    HabitGoalSource,
    "frequency_type" | "frequency_count" | "created_at"
  >,
  checkIns: ApiCheckIn[],
  today?: Date,
  frozenPeriodKeys: string[] = [],
): LoopStatus | null {
  const goal = goalFromHabit(statsHabit);
  if (goal.period !== "week") return null;
  const dates = uniqueCheckInDates(checkIns);
  const startedAt = statsHabit.created_at
    ? startOfDay(new Date(statsHabit.created_at))
    : null;
  const snap = snapshotFor(
    parseDateKey(weekStartKey),
    "week",
    goal.target,
    dates,
    startOfDay(today ?? new Date()),
    startedAt && !Number.isNaN(startedAt.getTime()) ? startedAt : null,
    new Set(frozenPeriodKeys),
  );
  return snap?.status ?? null;
}

export function loopStatusForMonth(
  year: number,
  monthIndex: number,
  statsHabit: Pick<
    HabitGoalSource,
    "frequency_type" | "frequency_count" | "created_at"
  >,
  checkIns: ApiCheckIn[],
  today?: Date,
  frozenPeriodKeys: string[] = [],
): LoopStatus | null {
  const goal = goalFromHabit(statsHabit);
  if (goal.period !== "month") return null;
  const dates = uniqueCheckInDates(checkIns);
  const startedAt = statsHabit.created_at
    ? startOfDay(new Date(statsHabit.created_at))
    : null;
  const snap = snapshotFor(
    new Date(year, monthIndex, 1),
    "month",
    goal.target,
    dates,
    startOfDay(today ?? new Date()),
    startedAt && !Number.isNaN(startedAt.getTime()) ? startedAt : null,
    new Set(frozenPeriodKeys),
  );
  return snap?.status ?? null;
}
