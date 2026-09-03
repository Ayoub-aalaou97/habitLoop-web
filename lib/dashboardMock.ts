export type MiniHeatCell = {
  color: string;
  dateKey: string | null;
  checked: boolean;
  locked?: boolean;
};

export type DashboardWeekDot = {
  on: boolean;
  off: boolean;
};

export type DashboardHobby = {
  id: string;
  name: string;
  color: string; // hex
  goalLabel: string;
  streak: number;
  unit: string; // "day streak" / "week streak"
  periodLabel: string; // "today" / "this week" / "this month"
  consistency: number;
  atRisk: boolean;
  riskLabel: string | null;
  done: number;
  target: number;
  weekDots: DashboardWeekDot[];
  mini: MiniHeatCell[][];
};

export type ConsistencyMonth = {
  label: string;
  pct: number;
  fill: string; // css background
};

export type DashboardMock = {
  hobbies: DashboardHobby[];
  stats: {
    completionRate: number;
    totalSessions: number;
    activeStreak: number;
    bestMonth: string;
    hobbiesOnLoop: number;
    freezesUsed: number;
    freezesTotal: number;
  };
  consistencyMonthly: ConsistencyMonth[];
  // Used by the desktop header.
  greetingDateLine: string; // e.g. "Sunday, June 28 · 4 hobbies on the loop"
  // Used by mobile header.
  mobileDateLabel: string; // e.g. "SUN · JUNE 28"
};

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "").trim();
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return { r, g, b };
}

// Deterministic RNG for stable mock visuals across reloads.
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function alphaForLevel(level: number) {
  // Matches the vibe of the design script (4 intensity steps).
  return [0.14, 0.32, 0.55, 0.85][Math.max(0, Math.min(3, level - 1))]!;
}

// Generated wide enough that the widest card can still be filled edge to edge.
const HEATMAP_WEEKS = 40;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function generateMiniHeatmap(opts: {
  colorHex: string;
  density: number;
  seed: number;
  streakLen: number;
}): MiniHeatCell[][] {
  const { colorHex, density, seed, streakLen } = opts;
  const { r, g, b } = hexToRgb(colorHex);
  const rng = mulberry32(seed);

  const today = startOfDay(new Date());
  const endWeek = startOfDay(new Date(today));
  endWeek.setDate(endWeek.getDate() - endWeek.getDay());
  const startWeek = startOfDay(new Date(endWeek));
  startWeek.setDate(endWeek.getDate() - (HEATMAP_WEEKS - 1) * 7);

  const days = HEATMAP_WEEKS * 7;
  const mini: MiniHeatCell[][] = [];
  const off = "var(--heat-empty)";

  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    const week: MiniHeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = startOfDay(new Date(startWeek));
      day.setDate(startWeek.getDate() + w * 7 + d);
      const dateKey = toDateKey(day);

      if (day.getTime() > today.getTime()) {
        week.push({ color: "transparent", dateKey: null, checked: false });
        continue;
      }

      const idx = w * 7 + d;
      const inStreakBoost = idx >= days - streakLen;
      const isOn = inStreakBoost ? rng() < 0.96 : rng() < density;

      if (!isOn) {
        week.push({
          color: off,
          dateKey,
          checked: false,
        });
        continue;
      }

      const baseLevel = inStreakBoost ? 4 : 1 + Math.floor(rng() * 4);
      const alpha = alphaForLevel(baseLevel);
      week.push({
        color: `rgba(${r},${g},${b},${alpha})`,
        dateKey,
        checked: true,
      });
    }
    mini.push(week);
  }

  return mini;
}

const MONTHS = "JFMAMJJASOND".split("");

export const dashboardMock: DashboardMock = (() => {
  const hobbiesSeedDefs = [
    {
      id: "swimming",
      name: "Swimming",
      color: "#38bdf8",
      goalLabel: "Daily",
      density: 0.84,
      seed: 7,
      streak: 23,
      done: 6,
      target: 7,
      unit: "day streak",
    },
    {
      id: "drawing",
      name: "Drawing",
      color: "#a78bfa",
      goalLabel: "3× / week",
      density: 0.44,
      seed: 42,
      streak: 11,
      done: 2,
      target: 3,
      unit: "day streak",
    },
    {
      id: "football",
      name: "Football",
      color: "#34d399",
      goalLabel: "2× / week",
      density: 0.3,
      seed: 99,
      streak: 5,
      done: 2,
      target: 2,
      unit: "day streak",
    },
    {
      id: "travelling",
      name: "Travelling",
      color: "#fb923c",
      goalLabel: "2× / month",
      density: 0.13,
      seed: 123,
      streak: 0,
      done: 1,
      target: 2,
      unit: "this month",
    },
  ] as const;

  const hobbies: DashboardHobby[] = hobbiesSeedDefs.map((d) => {
    const weekDots: DashboardWeekDot[] = Array.from({ length: d.target }, (_, i) => ({
      on: i < d.done,
      off: i >= d.done,
    }));

    const streakLen = Math.max(0, Math.min(20, d.streak));
    const mini = generateMiniHeatmap({
      colorHex: d.color,
      density: d.density,
      seed: d.seed,
      streakLen,
    });

    return {
      id: d.id,
      name: d.name,
      color: d.color,
      goalLabel: d.goalLabel,
      streak: d.streak,
      unit: d.unit,
      periodLabel: d.unit === "this month" ? "this month" : "this week",
      consistency: 0,
      atRisk: false,
      riskLabel: null,
      done: d.done,
      target: d.target,
      weekDots,
      mini,
    };
  });

  const completionMonthly = [62, 71, 94, 80, 76, 88, 69, 58, 83, 90, 78, 85];
  const consistencyMonthly: ConsistencyMonth[] = completionMonthly.map((v, i) => ({
    label: MONTHS[i] ?? "",
    pct: v,
    fill: v === 94 ? "var(--chart-bar-best)" : "var(--chart-bar)",
  }));

  return {
    hobbies,
    stats: {
      completionRate: 87,
      totalSessions: 342,
      activeStreak: 23,
      bestMonth: "March",
      hobbiesOnLoop: hobbies.length,
      freezesUsed: 0,
      freezesTotal: 3,
    },
    consistencyMonthly,
    greetingDateLine: "Sunday, June 28 · 4 hobbies on the loop",
    mobileDateLabel: "SUN · JUNE 28",
  };
})();

