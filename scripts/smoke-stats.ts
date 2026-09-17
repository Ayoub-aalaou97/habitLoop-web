/**
 * Smoke tests for statistics / period logic (no browser).
 * Run: npx tsx scripts/smoke-stats.ts
 */
import {
  buildStatisticsView,
  type StatsRange,
} from "../lib/statistics";
import type { ApiHabit } from "../lib/habits";
import type { ApiCheckIn } from "../lib/checkInsApi";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function habit(
  partial: Partial<ApiHabit> & Pick<ApiHabit, "id" | "name" | "frequency_type">,
): ApiHabit {
  return {
    id: partial.id,
    user_id: partial.user_id ?? 1,
    name: partial.name,
    question: partial.question ?? "Did you?",
    color: partial.color ?? "#38bdf8",
    note: partial.note ?? null,
    frequency_type: partial.frequency_type,
    frequency_count: partial.frequency_count ?? null,
    frequency_period_days: partial.frequency_period_days ?? null,
    reminder_time: partial.reminder_time ?? null,
    type: partial.type ?? "build",
    archived_at: partial.archived_at ?? null,
    created_at: partial.created_at ?? "2026-01-01T00:00:00.000000Z",
    updated_at: partial.updated_at ?? "2026-01-01T00:00:00.000000Z",
  };
}

function checkIn(id: number, habitId: number, date: string, mood = 4): ApiCheckIn {
  return {
    id,
    habit_id: habitId,
    date,
    mood,
    note: null,
    created_at: `${date}T10:00:00.000000Z`,
    updated_at: `${date}T10:00:00.000000Z`,
  };
}

const today = new Date(2026, 8, 17); // Sep 17, 2026

const daily = habit({
  id: 1,
  name: "Swim",
  frequency_type: "daily",
  created_at: "2026-09-01T00:00:00.000000Z",
});

const weekly = habit({
  id: 2,
  name: "Draw",
  frequency_type: "x_times_per_week",
  frequency_count: 3,
  created_at: "2026-09-01T00:00:00.000000Z",
});

// Daily: complete Sep 1–10, miss Sep 11–16 (today Sep 17 in progress ignored in closed)
const dailyCheckIns: ApiCheckIn[] = [];
for (let d = 1; d <= 10; d++) {
  dailyCheckIns.push(
    checkIn(d, 1, `2026-09-${String(d).padStart(2, "0")}`),
  );
}

// Weekly: 3 sessions in first week of September (Aug 30–Sep 5 week if Sunday start)
// Sep 1 2026 is Tuesday. Week Sun Aug 30 - Sat Sep 5.
const weeklyCheckIns: ApiCheckIn[] = [
  checkIn(100, 2, "2026-08-31"),
  checkIn(101, 2, "2026-09-02"),
  checkIn(102, 2, "2026-09-04"),
  // next week only 1 session -> miss if week closed
  checkIn(103, 2, "2026-09-08"),
];

let passed = 0;
function ok(name: string) {
  passed += 1;
  console.log(`✓ ${name}`);
}

// --- year range ---
{
  const view = buildStatisticsView({
    habits: [daily, weekly],
    checkInsByHabit: { 1: dailyCheckIns, 2: weeklyCheckIns },
    range: "year",
    today,
  });

  assert(view.months.length === 12, "expected 12 months");
  assert(
    view.months.every((m) => m.shortLabel && m.shortLabel.length >= 3),
    "months should have short labels like Jan",
  );
  assert(view.months[8]!.shortLabel === "Sep", "index 8 is September");
  assert(view.months[8]!.total > 0, "September should have closed periods");
  assert(
    view.months[8]!.pct >= 0 && view.months[8]!.pct <= 100,
    "Sep pct in range",
  );
  assert(view.goalsTotal > 0, "should have closed goals");
  assert(
    view.goalsMet <= view.goalsTotal,
    "met cannot exceed total",
  );
  assert(
    view.goalsOverallPct ===
      Math.round((view.goalsMet / view.goalsTotal) * 100),
    "overall pct mismatch",
  );
  assert(view.weekdays.length === 7, "7 weekdays");
  assert(
    view.weekdays[0]!.fullLabel === "Mon",
    "weekday chart should start Monday",
  );
  assert(
    view.weekdays.reduce((s, d) => s + d.value, 0) > 0,
    "weekday sessions > 0",
  );
  assert(view.kpis[0]!.label === "GOAL COMPLETION", "kpi0");
  assert(
    view.kpis[0]!.note.includes("of") && view.kpis[0]!.note.includes("met"),
    "goal completion note should explain met/total",
  );
  ok("year view: months, goals, weekdays");
}

// --- 30d range filters sessions ---
{
  const view = buildStatisticsView({
    habits: [daily],
    checkInsByHabit: { 1: dailyCheckIns },
    range: "30d",
    today,
  });
  const sessionsKpi = view.kpis.find((k) => k.label === "TOTAL SESSIONS");
  assert(sessionsKpi?.value === "10", `expected 10 sessions, got ${sessionsKpi?.value}`);
  assert(view.months.some((m) => m.inRange), "some months in range");
  assert(
    view.months.filter((m) => !m.inRange).length > 0,
    "months outside 30d should be marked out of range",
  );
  ok("30d range filters sessions + month inRange");
}

// --- empty state ---
{
  const view = buildStatisticsView({
    habits: [],
    checkInsByHabit: {},
    range: "year",
    today,
  });
  assert(view.goalsTotal === 0, "empty goals");
  assert(view.goalsOverallPct === 0, "empty pct");
  assert(view.peakWeekday === null, "no peak weekday");
  assert(view.hobbies.length === 0, "no hobbies");
  ok("empty habits state");
}

// --- duplicate check-ins same day count once for sessions ---
{
  const dups = [
    checkIn(1, 1, "2026-09-10", 3),
    checkIn(2, 1, "2026-09-10", 5),
  ];
  const view = buildStatisticsView({
    habits: [daily],
    checkInsByHabit: { 1: dups },
    range: "30d",
    today,
  });
  const sessionsKpi = view.kpis.find((k) => k.label === "TOTAL SESSIONS");
  assert(sessionsKpi?.value === "1", `dup days should count as 1, got ${sessionsKpi?.value}`);
  const wedOrThu = view.weekdays.find((d) => d.value === 1);
  assert(wedOrThu, "one weekday should have the session");
  ok("unique session counting");
}

// --- ranges type exhaustiveness smoke ---
{
  const ranges: StatsRange[] = ["30d", "90d", "year"];
  for (const range of ranges) {
    const view = buildStatisticsView({
      habits: [daily, weekly],
      checkInsByHabit: { 1: dailyCheckIns, 2: weeklyCheckIns },
      range,
      today,
    });
    assert(view.range === range, `range ${range}`);
    assert(view.months.length === 12, `months for ${range}`);
  }
  ok("all range toggles build");
}

console.log(`\nAll ${passed} smoke checks passed.`);
