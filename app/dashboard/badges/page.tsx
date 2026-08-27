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
import { BadgeItem, buildBadgesView } from "@/lib/badges";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { MobileNavSpacer } from "@/components/dashboard/MobileNavSpacer";

function EarnedBadgeCard({ badge }: { badge: BadgeItem }) {
  return (
    <div className="flex flex-col items-center rounded-[18px] border border-[rgba(252,211,77,0.22)] bg-[#15171c] px-3.5 py-[18px] text-center sm:px-[18px] sm:py-[26px]">
      <div
        className="mb-3.5 flex h-[58px] w-[58px] flex-none items-center justify-center rounded-full font-mono text-[18px] font-bold text-[#3a2606] sm:mb-[15px] sm:h-16 sm:w-16 sm:text-[19px]"
        style={{
          background: "linear-gradient(160deg,#fde08a,#f59e0b)",
          boxShadow:
            "0 0 24px rgba(245,158,11,0.4), inset 0 2px 0 rgba(255,255,255,0.5)",
        }}
      >
        {badge.mark}
      </div>
      <div className="mb-1 text-[13.5px] font-bold text-[#eceef1] sm:mb-[5px] sm:text-[14.5px]">
        {badge.label}
      </div>
      <div className="text-[11px] font-medium leading-snug text-[#777c8a] sm:text-[11.5px]">
        {badge.desc}
      </div>
    </div>
  );
}

function LockedBadgeCard({ badge }: { badge: BadgeItem }) {
  return (
    <div className="flex flex-col items-center rounded-[18px] border border-white/[0.05] bg-[#111318] px-3.5 py-[18px] text-center sm:px-5 sm:py-6">
      <div className="mb-3.5 flex h-[58px] w-[58px] flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-[#2e323c] bg-[#191c22] font-mono text-[16px] font-bold text-[#454a56] sm:mb-[15px] sm:h-16 sm:w-16 sm:text-[17px]">
        {badge.mark}
      </div>
      <div className="mb-1 text-[13.5px] font-bold text-[#9aa0ab] sm:mb-[5px] sm:text-[14.5px]">
        {badge.label}
      </div>
      <div className="mb-3.5 text-[11px] font-medium leading-snug text-[#6b7280] sm:mb-3.5 sm:text-[11.5px]">
        {badge.desc}
      </div>
      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-[3px] bg-[#1b1e25]">
        <div
          className="h-full rounded-[3px] bg-[#5b6070]"
          style={{ width: `${Math.max(0, Math.min(100, badge.pct))}%` }}
        />
      </div>
      <div className="font-mono text-[10.5px] font-semibold text-[#777c8a]">
        {badge.progress}
      </div>
    </div>
  );
}

function MobileBadgeCard({ badge }: { badge: BadgeItem }) {
  if (badge.unlocked) {
    return <EarnedBadgeCard badge={badge} />;
  }

  return (
    <div className="flex flex-col items-center rounded-[18px] border border-white/[0.06] bg-[#15171c] px-3.5 py-[18px] text-center">
      <div className="mb-3.5 flex h-[58px] w-[58px] flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-[#2e323c] bg-[#191c22] font-mono text-[16px] font-bold text-[#454a56]">
        {badge.mark}
      </div>
      <div className="mb-1 text-[13.5px] font-bold text-[#dfe1e6]">
        {badge.label}
      </div>
      <div className="mt-1 w-full">
        <div className="mb-1.5 h-[5px] overflow-hidden rounded-[3px] bg-[#1b1e25]">
          <div
            className="h-full rounded-[3px] bg-[#5b6070]"
            style={{ width: `${Math.max(0, Math.min(100, badge.pct))}%` }}
          />
        </div>
        <div className="font-mono text-[10.5px] font-semibold text-[#6b7280]">
          {badge.progress}
        </div>
      </div>
    </div>
  );
}

export default function BadgesPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [habits, setHabits] = useState<ApiHabit[]>([]);
  const [checkInsByHabit, setCheckInsByHabit] = useState<
    Record<number, ApiCheckIn[]>
  >({});
  const [loading, setLoading] = useState(true);

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
      setError(err instanceof Error ? err.message : "Could not load badges.");
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
    () => buildBadgesView({ habits, checkInsByHabit }),
    [habits, checkInsByHabit],
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

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar
        userName={displayName}
        userPlanLabel="Free plan"
        onLogout={logout}
        nextBadge={view.nextBadge}
      />

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 border-b border-white/[0.06] bg-bg/95 px-[18px] py-3 backdrop-blur-md sm:hidden">
          <h1 className="m-0 mb-3 text-[22px] font-extrabold tracking-[-0.025em] text-[#f4f5f7]">
            Badges
          </h1>
          <div className="flex items-center gap-3">
            <div className="h-[7px] min-w-0 flex-1 overflow-hidden rounded-[4px] bg-[#1b1e25]">
              <div
                className="h-full rounded-[4px]"
                style={{
                  width: `${view.pct}%`,
                  background: "linear-gradient(90deg,#fcd34d,#f59e0b)",
                }}
              />
            </div>
            <span className="font-mono text-[12px] font-bold text-[#fcd34d]">
              {view.earnedCount} / {view.total}
            </span>
          </div>
        </div>

        <div className="px-[18px] pb-9 pt-5 sm:px-[34px] sm:pt-[30px]">
          {error ? (
            <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-danger">
              {error}
            </p>
          ) : null}

          <div className="mb-6 hidden items-start justify-between gap-4 sm:mb-[26px] sm:flex">
            <div>
              <h1 className="m-0 mb-1 text-[27px] font-extrabold tracking-[-0.025em] text-[#f4f5f7]">
                Badges
              </h1>
              <p className="m-0 font-mono text-[13px] font-medium text-[#6b7280]">
                {view.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-3.5 rounded-[14px] border border-white/[0.06] bg-[#15171c] px-5 py-3.5">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-[24px] font-bold tracking-[-0.03em] text-[#fcd34d]">
                  {view.earnedCount}
                </span>
                <span className="text-[12.5px] font-semibold text-[#8a8f9c]">
                  / {view.total}
                </span>
              </div>
              <div className="h-[7px] w-[108px] overflow-hidden rounded-[4px] bg-[#1b1e25]">
                <div
                  className="h-full rounded-[4px]"
                  style={{
                    width: `${view.pct}%`,
                    background: "linear-gradient(90deg,#fcd34d,#f59e0b)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Mobile: mixed grid like design */}
          <div className="grid grid-cols-2 gap-3.5 sm:hidden">
            {view.all.map((badge) => (
              <MobileBadgeCard key={badge.id} badge={badge} />
            ))}
          </div>

          {/* Desktop: earned then locked */}
          <div className="hidden sm:block">
            <div className="mb-3.5 font-mono text-[10.5px] font-semibold tracking-[0.14em] text-[#fcd34d]">
              EARNED
            </div>
            {view.earned.length === 0 ? (
              <p className="mb-8 text-[13px] font-medium text-[#777c8a]">
                No badges yet — log your first session to earn First Log.
              </p>
            ) : (
              <div className="mb-[30px] grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {view.earned.map((badge) => (
                  <EarnedBadgeCard key={badge.id} badge={badge} />
                ))}
              </div>
            )}

            <div className="mb-3.5 font-mono text-[10.5px] font-semibold tracking-[0.14em] text-[#6b7280]">
              LOCKED
            </div>
            {view.locked.length === 0 ? (
              <p className="text-[13px] font-medium text-[#777c8a]">
                You’ve unlocked every badge. Nice loop.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {view.locked.map((badge) => (
                  <LockedBadgeCard key={badge.id} badge={badge} />
                ))}
              </div>
            )}
          </div>
        </div>

        <MobileNavSpacer />
      </div>

      <MobileBottomNav onAddClick={() => router.push("/dashboard")} />
    </div>
  );
}
