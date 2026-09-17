"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  API_URL,
  clearToken,
  getToken,
} from "@/lib/auth";
import { useDashboardSession } from "@/lib/useDashboardSession";
import {
  buildStatisticsView,
  StatsRange,
} from "@/lib/statistics";
import { PageLoader } from "@/components/LoadingSpinner";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { MobileNavSpacer } from "@/components/dashboard/MobileNavSpacer";
import { ThemeToggle } from "@/components/ThemeToggle";

const RANGES: { id: StatsRange; label: string }[] = [
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "year", label: "This year" },
];

function RangeToggle({
  value,
  onChange,
}: {
  value: StatsRange;
  onChange: (next: StatsRange) => void;
}) {
  return (
    <div className="flex gap-1 rounded-[12px] border border-border bg-bg-soft p-1">
      {RANGES.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`rounded-[8px] px-3.5 py-2 text-[12.5px] font-semibold transition sm:px-[15px] ${
              active
                ? "bg-bg-elevated text-text-heading shadow-[0_1px_2px_rgba(15,18,26,0.08)]"
                : "text-text-soft hover:text-text-body"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export default function StatisticsPage() {
  const router = useRouter();
  const { user, bundle, error, booting } = useDashboardSession();
  const [range, setRange] = useState<StatsRange>("year");

  const habits = bundle?.habits ?? [];
  const checkInsByHabit = bundle?.checkInsByHabit ?? {};
  const freezes = bundle?.freezes ?? {
    remaining: 3,
    total: 3,
    by_habit: {},
  };

  const view = useMemo(
    () =>
      buildStatisticsView({
        habits,
        checkInsByHabit,
        frozenByHabit: freezes.by_habit,
        range,
      }),
    [habits, checkInsByHabit, freezes.by_habit, range],
  );

  async function logout() {
    const token = getToken();
    if (token) {
      await fetch(`${API_URL}/api/logout`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => undefined);
    }
    clearToken();
    router.replace("/login");
  }

  if (error && !user) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-bg p-8">
        <p className="text-danger">{error}</p>
        <Link href="/login" className="text-brand-soft underline">
          Back to login
        </Link>
      </main>
    );
  }

  if (booting || !user) {
    return <PageLoader label="Loading statistics…" />;
  }

  const displayName = `${user.first_name} ${user.last_name}`;
  const monthMaxHeight = 96;

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar
        userName={displayName}
        userPlanLabel="Free plan"
        onLogout={logout}
        bestMonth={view.bestMonth}
        bestMonthPct={view.bestMonthPct}
      />

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border-soft bg-bg/95 px-[18px] py-3 backdrop-blur-md sm:hidden">
          <div className="min-w-0">
            <h1 className="m-0 truncate text-[18px] font-extrabold tracking-[-0.02em] text-text">
              Statistics
            </h1>
            <p className="m-0 truncate font-mono text-[11px] font-medium text-text-dim">
              {view.subtitle}
            </p>
          </div>
          <ThemeToggle compact />
        </div>

        <div className="px-[18px] pb-9 pt-5 sm:px-[34px] sm:pt-[30px]">
          {error ? (
            <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-danger">
              {error}
            </p>
          ) : null}

          <div className="mb-5 hidden items-start justify-between gap-4 sm:mb-6 sm:flex">
            <div>
              <h1 className="m-0 mb-1 text-[27px] font-extrabold tracking-[-0.025em] text-text">
                Statistics
              </h1>
              <p className="m-0 font-mono text-[13px] font-medium text-text-dim">
                {view.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <RangeToggle value={range} onChange={setRange} />
              <ThemeToggle compact />
            </div>
          </div>

          <div className="mb-5 sm:hidden">
            <RangeToggle value={range} onChange={setRange} />
          </div>

          <div className="-mx-[18px] mb-5 flex gap-2.5 overflow-x-auto px-[18px] pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:mb-[18px] sm:grid sm:grid-cols-2 sm:gap-3.5 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4 [&::-webkit-scrollbar]:hidden">
            {view.kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="min-w-[168px] flex-none rounded-[18px] border border-border-soft bg-bg-elevated px-[18px] py-4 sm:min-w-0 sm:flex-none sm:px-5 sm:py-[18px]"
              >
                <div className="mb-2.5 font-mono text-[10.5px] font-semibold tracking-[0.08em] text-text-dim">
                  {kpi.label}
                </div>
                <div className="mb-1 flex items-baseline gap-1.5">
                  <span
                    className="font-mono text-[28px] font-bold tracking-[-0.03em] sm:text-[30px]"
                    style={{ color: kpi.color }}
                  >
                    {kpi.value}
                  </span>
                  <span className="text-[12.5px] font-semibold text-text-muted">
                    {kpi.unit}
                  </span>
                </div>
                <div className="text-[11px] font-medium text-text-dim">
                  {kpi.note}
                </div>
              </div>
            ))}
          </div>

          <section className="mb-[18px] rounded-[18px] border border-border-soft bg-bg-elevated px-4 py-5 sm:px-6 sm:py-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:mb-5">
              <div className="min-w-0">
                <h2 className="m-0 text-[15px] font-bold text-text-body">
                  Goal completion by month
                </h2>
                <p className="m-0 mt-0.5 text-[12px] font-medium text-text-muted">
                  Share of period goals you closed successfully — across every
                  hobby. A period is a day, week, or month depending on each
                  habit&apos;s frequency.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {view.bestMonth !== "—" ? (
                  <div className="rounded-[9px] border border-[rgba(111,123,255,0.25)] bg-[rgba(111,123,255,0.1)] px-3 py-1.5">
                    <span className="font-mono text-[10.5px] font-semibold text-[color:var(--accent-stat)]">
                      Best · {view.bestMonth} {view.bestMonthPct}%
                    </span>
                  </div>
                ) : null}
                <div className="rounded-[9px] bg-bg-muted px-3 py-1.5">
                  <span className="font-mono text-[10.5px] font-semibold text-text-soft">
                    {view.goalsTotal === 0
                      ? "No closed periods yet"
                      : `${view.goalsMet}/${view.goalsTotal} met · ${view.goalsOverallPct}%`}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-3 text-[11px] font-medium text-text-dim">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-[2px]"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(52,211,153,0.85), rgba(52,211,153,0.35))",
                  }}
                />
                80%+ solid
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-[2px]"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(138,146,255,0.75), rgba(111,123,255,0.35))",
                  }}
                />
                50–79%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-[2px]"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(251,146,60,0.7), rgba(251,146,60,0.28))",
                  }}
                />
                Under 50%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-[2px]"
                  style={{ background: "var(--chart-bar-best)" }}
                />
                Best month
              </span>
            </div>

            {view.goalsTotal === 0 ? (
              <p className="m-0 rounded-[12px] border border-dashed border-border bg-bg-muted/60 px-4 py-8 text-center text-[13px] font-medium text-text-muted">
                Once you complete (or miss) habit periods, this chart fills in
                month by month.
              </p>
            ) : (
              <div
                className="flex items-end gap-1 sm:gap-2"
                style={{ height: monthMaxHeight + 52 }}
              >
                {view.months.map((month) => {
                  const muted = !month.inRange;
                  const barHeight =
                    month.total === 0
                      ? 3
                      : Math.max(
                          6,
                          Math.round((month.pct / 100) * monthMaxHeight),
                        );
                  return (
                    <div
                      key={month.shortLabel}
                      className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                      title={
                        month.total === 0
                          ? `${month.shortLabel}: no closed periods`
                          : `${month.shortLabel}: ${month.met} of ${month.total} goals met (${month.pct}%)`
                      }
                    >
                      <span
                        className="font-mono text-[10px] font-bold sm:text-[11px]"
                        style={{
                          color: month.isBest
                            ? "var(--accent-stat)"
                            : muted
                              ? "var(--text-dim)"
                              : "var(--text-muted)",
                          opacity: muted ? 0.55 : 1,
                        }}
                      >
                        {month.total === 0 ? "—" : `${month.pct}%`}
                      </span>
                      <div
                        className="relative w-full overflow-hidden rounded-[6px]"
                        style={{
                          height: `${barHeight}px`,
                          background: month.fill,
                          opacity: muted ? 0.35 : 1,
                          boxShadow: month.isCurrent
                            ? "0 0 0 1.5px rgba(111,123,255,0.45)"
                            : undefined,
                        }}
                      />
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className={`font-mono text-[10px] font-semibold ${
                            month.isCurrent
                              ? "text-[color:var(--accent-stat)]"
                              : "text-text-dim"
                          }`}
                          style={{ opacity: muted ? 0.5 : 1 }}
                        >
                          <span className="sm:hidden">{month.label}</span>
                          <span className="hidden sm:inline">
                            {month.shortLabel}
                          </span>
                        </span>
                        {month.total > 0 ? (
                          <span
                            className="hidden font-mono text-[9px] font-medium text-text-dim sm:block"
                            style={{ opacity: muted ? 0.45 : 0.85 }}
                          >
                            {month.met}/{month.total}
                          </span>
                        ) : (
                          <span className="hidden h-[12px] sm:block" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.9fr_0.85fr] lg:gap-4">
            <section className="rounded-[18px] border border-border-soft bg-bg-elevated px-4 py-5 sm:px-[22px] sm:py-[18px]">
              <h2 className="m-0 mb-0.5 text-[14.5px] font-bold text-text-body">
                By hobby
              </h2>
              <p className="m-0 mb-4 font-mono text-[11px] font-medium text-text-dim">
                sessions logged &amp; goal completion in this range
              </p>

              {view.hobbies.length === 0 ? (
                <p className="m-0 text-[13px] font-medium text-text-muted">
                  No hobbies yet. Create one on the dashboard to see stats here.
                </p>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {view.hobbies.map((hobby) => (
                    <div key={hobby.id}>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div
                            className="h-2.5 w-2.5 flex-none rounded-[3px]"
                            style={{ background: hobby.color }}
                          />
                          <span className="truncate text-[13.5px] font-semibold text-text-body">
                            {hobby.name}
                          </span>
                          <span className="hidden font-mono text-[10.5px] font-medium text-text-dim sm:inline">
                            {hobby.goalLabel}
                          </span>
                        </div>
                        <div className="flex flex-none items-baseline gap-2.5">
                          <span className="font-mono text-[11px] font-medium text-text-muted">
                            {hobby.sessions} sessions
                          </span>
                          <span
                            className="font-mono text-[13px] font-bold"
                            style={{ color: hobby.color }}
                          >
                            {hobby.pct}%
                          </span>
                        </div>
                      </div>
                      <div className="h-[7px] overflow-hidden rounded-[4px] bg-bg-muted">
                        <div
                          className="h-full rounded-[4px]"
                          style={{
                            width: `${Math.max(0, Math.min(100, hobby.pct))}%`,
                            background: hobby.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[18px] border border-border-soft bg-bg-elevated px-4 py-5 sm:px-[22px] sm:py-[18px]">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="m-0 mb-0.5 text-[14.5px] font-bold text-text-body">
                    When you show up
                  </h2>
                  <p className="m-0 font-mono text-[11px] font-medium text-text-dim">
                    sessions by weekday · this range
                  </p>
                </div>
                {view.peakWeekday ? (
                  <div className="rounded-[8px] bg-bg-muted px-2.5 py-1">
                    <span className="font-mono text-[10px] font-semibold text-[color:var(--accent-stat)]">
                      Peak · {view.peakWeekday}
                    </span>
                  </div>
                ) : null}
              </div>

              {view.weekdays.every((day) => day.value === 0) ? (
                <p className="m-0 rounded-[12px] border border-dashed border-border bg-bg-muted/60 px-3 py-8 text-center text-[12.5px] font-medium text-text-muted">
                  No sessions in this range yet.
                </p>
              ) : (
                <div className="flex h-[128px] items-end gap-2">
                  {view.weekdays.map((day) => (
                    <div
                      key={day.fullLabel}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                      title={`${day.fullLabel}: ${day.value} sessions (${day.sharePct}% of all)`}
                    >
                      <span
                        className="font-mono text-[10.5px] font-bold"
                        style={{
                          color: day.isMax
                            ? "var(--accent-stat)"
                            : "var(--text-muted)",
                        }}
                      >
                        {day.value}
                      </span>
                      <div
                        className="w-full rounded-[5px]"
                        style={{
                          height: `${Math.max(
                            4,
                            Math.round((day.pctHeight / 100) * 88),
                          )}px`,
                          background: day.isMax
                            ? "var(--chart-bar-best)"
                            : "rgba(111,123,255,0.38)",
                          boxShadow: day.isMax
                            ? "0 6px 14px -6px rgba(111,123,255,0.55)"
                            : undefined,
                        }}
                      />
                      <span
                        className="font-mono text-[10px] font-semibold"
                        style={{
                          color: day.isMax
                            ? "var(--accent-stat)"
                            : "var(--text-dim)",
                        }}
                      >
                        <span className="sm:hidden">{day.label}</span>
                        <span className="hidden sm:inline">{day.fullLabel}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[18px] border border-border-soft bg-bg-elevated px-4 py-5 sm:px-[22px] sm:py-[18px]">
              <h2 className="m-0 mb-0.5 text-[14.5px] font-bold text-text-body">
                How it felt
              </h2>
              <p className="m-0 mb-4 font-mono text-[11px] font-medium text-text-dim">
                mood across all check-ins
              </p>
              <div className="flex flex-col gap-[11px]">
                {view.moods.map((mood) => (
                  <div
                    key={mood.n}
                    className="flex items-center gap-[11px]"
                    title={mood.label}
                  >
                    <span
                      className="w-5 flex-none text-center text-[15px] leading-none"
                      aria-hidden="true"
                    >
                      {mood.face}
                    </span>
                    <div className="h-[7px] min-w-0 flex-1 overflow-hidden rounded-[4px] bg-bg-muted">
                      <div
                        className="h-full rounded-[4px]"
                        style={{
                          width: `${Math.max(0, Math.min(100, mood.pct))}%`,
                          background: mood.fill,
                        }}
                      />
                    </div>
                    <span className="w-7 flex-none text-right font-mono text-[11px] font-bold text-text-muted">
                      {mood.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <MobileNavSpacer />
      </div>

      <MobileBottomNav onAddClick={() => router.push("/dashboard")} />
    </div>
  );
}
