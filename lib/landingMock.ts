/** Static content for the HabitLoop marketing landing page. */

export const landNav = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how" },
  { label: "Badges", href: "#features" },
] as const;

export const landProof = [
  { value: "342", label: "sessions logged this year" },
  { value: "41 d", label: "longest unbroken loop" },
  { value: "87%", label: "goal completion across habits" },
] as const;

type PeriodCell = { bg: string; border: string; glow: string };

function mkCells(color: string, pattern: number[]): PeriodCell[] {
  const clean = color.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return pattern.map((p) => {
    if (p === 2) {
      return {
        bg: color,
        border: `1px solid ${color}`,
        glow: `0 0 12px -2px ${color}`,
      };
    }
    if (p === 1) {
      return {
        bg: `rgba(${r},${g},${b},0.30)`,
        border: `1px solid rgba(${r},${g},${b},0.55)`,
        glow: "none",
      };
    }
    return {
      bg: "rgba(255,255,255,0.035)",
      border: "1px dashed rgba(255,255,255,0.10)",
      glow: "none",
    };
  });
}

export const landPeriods = [
  {
    kind: "DAILY",
    color: "#38bdf8",
    habit: "Swimming",
    rule: "1 session · every day",
    streak: "23 days",
    cells: mkCells("#38bdf8", [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0]),
  },
  {
    kind: "WEEKLY",
    color: "#a78bfa",
    habit: "Drawing",
    rule: "3 sessions · every week",
    streak: "11 weeks",
    cells: mkCells("#a78bfa", [1, 1, 1, 1, 1, 1, 1, 1, 2, 0]),
  },
  {
    kind: "MONTHLY",
    color: "#fb923c",
    habit: "Travelling",
    rule: "2 trips · every month",
    streak: "6 months",
    cells: mkCells("#fb923c", [1, 1, 1, 1, 2, 0]),
  },
] as const;

export const landFeatures = [
  {
    title: "Freeze tokens",
    accent: "#38bdf8",
    desc: "Three a month. Spend one and a missed period counts as closed — the loop holds while you deal with life.",
    tag: "3 / month",
  },
  {
    title: "Consistency, not vanity",
    accent: "#9aa3ff",
    desc: "One honest number: periods satisfied out of the last twelve. It moves slowly, so it means something.",
    tag: "rolling 12",
  },
  {
    title: "Badges worth having",
    accent: "#fcd34d",
    desc: "Earned in loop language — ten consecutive loops, ninety percent for twelve periods. No participation medals.",
    tag: "8 tiers",
  },
  {
    title: "Reminders that read the risk",
    accent: "#34d399",
    desc: "Per-habit days and times, plus a nudge only when a streak is one period away from breaking.",
    tag: "quiet hours",
  },
] as const;

export const landSteps = [
  {
    n: "01",
    title: "Name the rhythm",
    desc: "Pick a habit and a period — daily, weekly or monthly — then set how many sessions close it.",
  },
  {
    n: "02",
    title: "Log the session",
    desc: "Two taps, plus an optional mood. The current period fills as you go.",
  },
  {
    n: "03",
    title: "Close the loop",
    desc: "Hit the target before the period ends and the streak carries. Miss it and a freeze can cover you.",
  },
] as const;

export const landPlans = [
  {
    name: "Free",
    price: "$0",
    per: "forever",
    note: "Everything you need for one or two habits.",
    cta: "Start free",
    href: "/register",
    featured: false,
    items: [
      "3 habits",
      "Daily · weekly · monthly periods",
      "30-week heatmap",
      "1 freeze token / month",
    ],
  },
  {
    name: "Loop Pro",
    price: "$4",
    per: "per month",
    note: "For the collection that keeps growing.",
    cta: "Go Pro",
    href: "/register",
    featured: true,
    items: [
      "Unlimited habits",
      "3 freeze tokens / month",
      "Full statistics & mood history",
      "Badge wall + streak-risk alerts",
      "Data export",
    ],
  },
] as const;

export type LandingHabitPreview = {
  name: string;
  color: string;
  goalLabel: string;
  streak: number;
  /** 13 weeks × 7 days of rgba colors */
  mini: string[][];
};

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function buildMini(
  color: string,
  density: number,
  seed: number,
  streakLen: number,
  weekCount = 40,
): string[][] {
  const rng = mulberry32(seed);
  const { r, g, b } = hexToRgb(color);
  const alphas = [0.2, 0.42, 0.68, 0.95];
  const empty = "var(--heat-empty)";
  const weeks: string[][] = [];
  let streakLeft = streakLen;

  for (let w = 0; w < weekCount; w++) {
    const days: string[] = [];
    for (let d = 0; d < 7; d++) {
      const nearEnd = w >= weekCount - 3;
      if (nearEnd && streakLeft > 0) {
        days.push(`rgba(${r},${g},${b},${alphas[2 + (streakLeft % 2)]})`);
        streakLeft -= 1;
      } else if (rng() < density) {
        const level = Math.floor(rng() * 4);
        days.push(`rgba(${r},${g},${b},${alphas[level]})`);
      } else {
        days.push(empty);
      }
    }
    weeks.push(days);
  }
  return weeks;
}

export const landingHabits: LandingHabitPreview[] = [
  {
    name: "Swimming",
    color: "#38bdf8",
    goalLabel: "Daily",
    streak: 23,
    mini: buildMini("#38bdf8", 0.84, 7, 14),
  },
  {
    name: "Drawing",
    color: "#a78bfa",
    goalLabel: "3× / week",
    streak: 11,
    mini: buildMini("#a78bfa", 0.44, 42, 8),
  },
  {
    name: "Football",
    color: "#34d399",
    goalLabel: "2× / week",
    streak: 5,
    mini: buildMini("#34d399", 0.3, 99, 4),
  },
  {
    name: "Travelling",
    color: "#fb923c",
    goalLabel: "2× / month",
    streak: 0,
    mini: buildMini("#fb923c", 0.13, 123, 0),
  },
];

export const loginStrip: string[] = (() => {
  const palette = ["#38bdf8", "#a78bfa", "#34d399", "#fb923c"].map(hexToRgb);
  const rng = mulberry32(2024);
  const alphas = [0.14, 0.32, 0.55, 0.85];
  return Array.from({ length: 24 }, () => {
    const p = palette[Math.floor(rng() * palette.length)]!;
    const a = alphas[Math.floor(rng() * 4)]!;
    return `rgba(${p.r},${p.g},${p.b},${a})`;
  });
})();
