"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, AuthUser, clearToken, fetchCurrentUser, getToken } from "@/lib/auth";
import { dashboardMock } from "@/lib/dashboardMock";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { HobbyCard } from "@/components/dashboard/HobbyCard";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { StreakFreezesCard } from "@/components/dashboard/StreakFreezesCard";
import { ConsistencyChart } from "@/components/dashboard/ConsistencyChart";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    fetchCurrentUser(token)
      .then(setUser)
      .catch(() => {
        clearToken();
        setError("Your session expired. Please log in again.");
      });
  }, [router]);

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

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-bg p-8">
        <p className="text-danger">{error}</p>
        <a href="/login" className="text-brand-soft underline">
          Back to login
        </a>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex flex-1 items-center justify-center bg-bg p-8">
        <p className="text-text-muted">Loading…</p>
      </main>
    );
  }

  const displayName = `${user.first_name} ${user.last_name}`;
  const freezesRemaining = dashboardMock.stats.freezesTotal; // UI only

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar
        userName={displayName}
        userPlanLabel="Free plan"
        onLogout={logout}
      />

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Mobile header */}
        <div className="lg:hidden px-[22px] pt-[16px] pb-[12px] flex items-center justify-between bg-bg-soft border-b border-white/[0.04]">
          <div className="min-w-0">
            <div className="text-[11.5px] font-mono text-text-dim mb-[3px]">
              {dashboardMock.mobileDateLabel}
            </div>
            <div className="text-[22px] font-extrabold text-[#f4f5f7] leading-tight">
              Hey, {user.first_name}
            </div>
          </div>

          <div className="flex items-center gap-[7px] px-[12px] py-[8px] rounded-[11px] bg-bg-elevated border border-[rgba(56,189,248,0.25)] flex-none">
            <div className="flex gap-[2.5px]">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={`m-${idx}`}
                  className="w-[9px] h-[12px] rounded-[2px] bg-gradient-to-b from-[#7dd3fc] to-[#38bdf8]"
                />
              ))}
            </div>
            <span className="text-[13px] font-extrabold text-[#cfe9fb] font-mono">
              {freezesRemaining}
            </span>
          </div>
        </div>

        {/* Desktop content */}
        <div className="hidden lg:block px-[34px] pt-[30px] pb-[36px]">
          <div className="flex items-start justify-between mb-[26px]">
            <div>
              <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.025em] text-[#f4f5f7]">
                Good evening, {user.first_name}
              </h1>
              <p className="m-0 text-[14px] font-medium text-text-dim opacity-70">
                {dashboardMock.greetingDateLine}
              </p>
            </div>

            <div className="flex items-center gap-[12px]">
              <div className="flex items-center gap-[9px] px-[14px] py-[10px] bg-bg-elevated border border-[rgba(56,189,248,0.25)] rounded-[12px]">
                <div className="flex gap-[3px]">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div
                      key={`fi-${idx}`}
                      className="w-[11px] h-[14px] rounded-[3px] bg-gradient-to-b from-[#7dd3fc] to-[#38bdf8] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                    />
                  ))}
                </div>
                <span className="text-[13px] font-semibold text-[#cfe9fb] font-mono">
                  {freezesRemaining} freezes
                </span>
              </div>

              <div className="flex items-center gap-[8px] px-[18px] py-[11px] rounded-[12px] bg-gradient-to-b from-[#7a86ff] to-[#5d69f0] shadow-[0_8px_20px_-6px_rgba(111,123,255,0.55),inset_0_1px_0_rgba(255,255,255,0.25)]">
                <span className="text-[18px] font-extrabold text-white leading-[0] -mt-[2px]">
                  +
                </span>
                <span className="text-[14px] font-extrabold text-white">
                  Check in
                </span>
              </div>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-[16px] mb-[26px]">
            <div className="p-[18px] bg-bg-elevated border border-white/[0.06] rounded-[16px]">
              <div className="text-[12px] font-semibold text-text-dim mb-[10px]">
                Active streak
              </div>
              <div className="flex items-baseline gap-[6px]">
                <span className="text-[30px] font-extrabold font-mono text-[#f4f5f7]">
                  {dashboardMock.stats.activeStreak}
                </span>
                <span className="text-[13px] font-medium text-text-soft">
                  days
                </span>
              </div>
            </div>

            <div className="p-[18px] bg-bg-elevated border border-white/[0.06] rounded-[16px]">
              <div className="text-[12px] font-semibold text-text-dim mb-[10px]">
                Completion rate
              </div>
              <div className="flex items-baseline gap-[6px]">
                <span className="text-[30px] font-extrabold font-mono text-[#f4f5f7]">
                  {dashboardMock.stats.completionRate}
                </span>
                <span className="text-[13px] font-medium text-text-soft">
                  %
                </span>
              </div>
            </div>

            <div className="p-[18px] bg-bg-elevated border border-white/[0.06] rounded-[16px]">
              <div className="text-[12px] font-semibold text-text-dim mb-[10px]">
                Total sessions
              </div>
              <div className="flex items-baseline gap-[6px]">
                <span className="text-[30px] font-extrabold font-mono text-[#f4f5f7]">
                  {dashboardMock.stats.totalSessions}
                </span>
              </div>
            </div>

            <div className="p-[18px] bg-bg-elevated border border-white/[0.06] rounded-[16px]">
              <div className="text-[12px] font-semibold text-text-dim mb-[10px]">
                Best month
              </div>
              <div className="flex items-baseline gap-[6px]">
                <span className="text-[24px] font-bold text-[#f4f5f7]">
                  {dashboardMock.stats.bestMonth}
                </span>
              </div>
            </div>
          </div>

          {/* Hobbies + right column */}
          <div className="grid grid-cols-[1.5fr_1fr] gap-[24px]">
            <div>
              <div className="flex items-center justify-between mb-[14px]">
                <h2 className="m-0 text-[16px] font-bold text-[#e8e9ec]">
                  Your hobbies
                </h2>
                <span className="text-[12px] font-semibold font-mono text-text-dim">
                  VIEW ALL
                </span>
              </div>

              <div className="grid grid-cols-2 gap-[16px]">
                {dashboardMock.hobbies.map((h) => (
                  <HobbyCard key={h.id} hobby={h} variant="desktop" />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-[16px]">
              <StreakFreezesCard
                total={dashboardMock.stats.freezesTotal}
                remaining={dashboardMock.stats.freezesTotal}
              />
              <ConsistencyChart months={dashboardMock.consistencyMonthly} />
            </div>
          </div>
        </div>

        {/* Mobile body */}
        <div className="lg:hidden px-[22px] pb-[90px]">
          <div className="flex flex-col gap-[11px] pt-[4px]">
            {dashboardMock.hobbies.map((h) => (
              <HobbyCard key={h.id} hobby={h} variant="mobile" />
            ))}
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
