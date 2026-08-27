"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  API_URL,
  AuthUser,
  clearToken,
  fetchCurrentUser,
  getToken,
} from "@/lib/auth";
import { ApiHabit, fetchHabits } from "@/lib/habits";
import { ApiCheckIn, fetchHabitCheckIns } from "@/lib/checkInsApi";
import {
  buildStatisticsView,
  StatsRange,
} from "@/lib/statistics";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { MobileNavSpacer } from "@/components/dashboard/MobileNavSpacer";

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
    <div className="flex gap-1 rounded-[12px] border border-white/[0.07] bg-[#15171c] p-1">
      {RANGES.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`rounded-[8px] px-3.5 py-2 text-[12.5px] font-semibold transition sm:px-[15px] ${
              active
                ? "bg-[#2a2e37] text-[#f2f3f5] shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
                : "text-[#9aa0ab] hover:text-[#d5d7de]"
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [habits, setHabits] = useState<ApiHabit[]>([]);
  const [checkInsByHabit, setCheckInsByHabit] = useState<
    Record<number, ApiCheckIn[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<StatsRange>("year");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const next = await fetchHabits();
      setHabits(next);

      const pairs = await Promise.all(
        next.map(async (habit) => {
          try {
            const checkIns = await fetchHabitCheckIns(habit.id);
            return [habit.id, checkIns] as const;
          } catch {
            return [habit.id, [] as ApiCheckIn[]] as const;
          }
        }),
      );
      setCheckInsByHabit(Object.fromEntries(pairs));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load statistics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    fetchCurrentUser(token)
      .then((currentUser) => {
        setUser(currentUser);
        return load();
      })
      .catch(() => {
        clearToken();
        setError("Your session expired. Please log in again.");
        setLoading(false);
      });
  }, [router, load]);

  const view = useMemo(
    () =>
      buildStatisticsView({
        habits,
        checkInsByHabit,
        range,
      }),
    [habits, checkInsByHabit, range],
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

  if (!user || loading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-bg p-8">
        <p className="text-text-muted">Loading…</p>
      </main>
    );
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
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-bg/95 px-[18px] py-3 backdrop-blur-md sm:hidden">
          <div className="min-w-0">
            <h1 className="m-0 truncate text-[18px] font-extrabold tracking-[-0.02em] text-[#f4f5f7]">
              Statistics
            </h1>
            <p className="m-0 truncate font-mono text-[11px] font-medium text-[#6b7280]">
              {view.subtitle}
            </p>
          </div>
        </div>

        <div className="px-[18px] pb-9 pt-5 sm:px-[34px] sm:pt-[30px]">
          {error ? (
            <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-danger">
              {error}
            </p>
          ) : null}

          <div className="mb-5 hidden items-start justify-between gap-4 sm:mb-6 sm:flex">
            <div>
              <h1 className="m-0 mb-1 text-[27px] font-extrabold tracking-[-0.025em] text-[#f4f5f7]">
                Statistics
              </h1>
              <p className="m-0 font-mono text-[13px] font-medium text-[#6b7280]">
                {view.subtitle}
              </p>
            </div>
            <RangeToggle value={range} onChange={setRange} />
          </div>

          <div className="mb-5 sm:hidden">
            <RangeToggle value={range} onChange={setRange} />
          </div>

          <div className="-mx-[18px] mb-5 flex gap-2.5 overflow-x-auto px-[18px] pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:mb-[18px] sm:grid sm:grid-cols-2 sm:gap-3.5 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4 [&::-webkit-scrollbar]:hidden">
            {view.kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="min-w-[168px] flex-none rounded-[18px] border border-white/[0.06] bg-[#15171c] px-[18px] py-4 sm:min-w-0 sm:flex-none sm:px-5 sm:py-[18px]"
              >
                <div className="mb-2.5 font-mono text-[10.5px] font-semibold tracking-[0.08em] text-[#6b7280]">
                  {kpi.label}
                </div>
                <div className="mb-1 flex items-baseline gap-1.5">
                  <span
                    className="font-mono text-[28px] font-bold tracking-[-0.03em] sm:text-[30px]"
                    style={{ color: kpi.color }}
                  >
                    {kpi.value}
                  </span>
                  <span className="text-[12.5px] font-semibold text-[#8a8f9c]">
                    {kpi.unit}
                  </span>
                </div>
                <div className="text-[11px] font-medium text-[#5b6070]">
                  {kpi.note}
                </div>
              </div>
            ))}
          </div>

          <section className="mb-[18px] rounded-[18px] border border-white/[0.06] bg-[#15171c] px-4 py-5 sm:px-6 sm:py-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:mb-[18px]">
              <div>
                <h2 className="m-0 text-[15px] font-bold text-[#eceef1]">
                  Goal completion by month
                </h2>
                <p className="m-0 mt-0.5 font-mono text-[11px] font-medium text-[#6b7280]">
                  % of period goals met · all hobbies
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-[9px] bg-[#1b1e25] px-3 py-1.5">
                <div className="h-2.5 w-2.5 rounded-[2px] bg-gradient-to-b from-[#9aa3ff] to-[#6f7bff]" />
                <span className="font-mono text-[10.5px] font-semibold text-[#9aa3ff]">
                  best month
                </span>
              </div>
            </div>

            <div
              className="flex items-end gap-1.5 sm:gap-[11px]"
              style={{ height: monthMaxHeight + 36 }}
            >
              {view.months.map((month, idx) => (
                <div
                  key={`${month.label}-${idx}`}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <span
                    className={`font-mono text-[10px] font-bold sm:text-[10.5px] ${
                      month.isBest ? "text-[#9aa3ff]" : "text-[#777c8a]"
                    }`}
                  >
                    {month.pct}
                  </span>
                  <div
                    className="w-full rounded-[5px]"
                    style={{
                      height: `${Math.max(4, Math.round((month.pct / 100) * monthMaxHeight))}px`,
                      background: month.fill,
                    }}
                  />
                  <span className="font-mono text-[10px] font-semibold text-[#5b6070]">
                    {month.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.9fr_0.85fr] lg:gap-4">
            <section className="rounded-[18px] border border-white/[0.06] bg-[#15171c] px-4 py-5 sm:px-[22px] sm:py-[18px]">
              <h2 className="m-0 mb-0.5 text-[14.5px] font-bold text-[#eceef1]">
                By hobby
              </h2>
              <p className="m-0 mb-4 font-mono text-[11px] font-medium text-[#6b7280]">
                sessions logged &amp; goal completion
              </p>

              {view.hobbies.length === 0 ? (
                <p className="m-0 text-[13px] font-medium text-[#777c8a]">
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
                          <span className="truncate text-[13.5px] font-semibold text-[#dfe1e6]">
                            {hobby.name}
                          </span>
                          <span className="hidden font-mono text-[10.5px] font-medium text-[#5b6070] sm:inline">
                            {hobby.goalLabel}
                          </span>
                        </div>
                        <div className="flex flex-none items-baseline gap-2.5">
                          <span className="font-mono text-[11px] font-medium text-[#777c8a]">
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
                      <div className="h-[7px] overflow-hidden rounded-[4px] bg-[#1b1e25]">
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

            <section className="rounded-[18px] border border-white/[0.06] bg-[#15171c] px-4 py-5 sm:px-[22px] sm:py-[18px]">
              <h2 className="m-0 mb-0.5 text-[14.5px] font-bold text-[#eceef1]">
                When you show up
              </h2>
              <p className="m-0 mb-4 font-mono text-[11px] font-medium text-[#6b7280]">
                sessions by weekday
              </p>
              <div className="flex h-[112px] items-end gap-2">
                {view.weekdays.map((day, idx) => (
                  <div
                    key={`${day.label}-${idx}`}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                  >
                    <span className="font-mono text-[10.5px] font-bold text-[#777c8a]">
                      {day.value}
                    </span>
                    <div
                      className="w-full rounded-[5px]"
                      style={{
                        height: `${Math.max(4, Math.round((day.pctHeight / 100) * 84))}px`,
                        background: day.isMax
                          ? "linear-gradient(180deg,#9aa3ff,#6f7bff)"
                          : "rgba(111,123,255,0.38)",
                      }}
                    />
                    <span className="font-mono text-[10px] font-semibold text-[#5b6070]">
                      {day.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[18px] border border-white/[0.06] bg-[#15171c] px-4 py-5 sm:px-[22px] sm:py-[18px]">
              <h2 className="m-0 mb-0.5 text-[14.5px] font-bold text-[#eceef1]">
                How it felt
              </h2>
              <p className="m-0 mb-4 font-mono text-[11px] font-medium text-[#6b7280]">
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
                    <div className="h-[7px] min-w-0 flex-1 overflow-hidden rounded-[4px] bg-[#1b1e25]">
                      <div
                        className="h-full rounded-[4px]"
                        style={{
                          width: `${Math.max(0, Math.min(100, mood.pct))}%`,
                          background: mood.fill,
                        }}
                      />
                    </div>
                    <span className="w-7 flex-none text-right font-mono text-[11px] font-bold text-[#8a8f9c]">
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
