"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  API_URL,
  AuthUser,
  clearToken,
  fetchCurrentUser,
  getToken,
} from "@/lib/auth";
import {
  ApiHabit,
  apiHabitToDraft,
  deleteHabit,
  draftToCreatePayload,
  fetchHabit,
  updateHabit,
} from "@/lib/habits";
import {
  buildHabitDetailView,
  habitColorWithAlpha,
} from "@/lib/habitDetailMock";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { MobileNavSpacer } from "@/components/dashboard/MobileNavSpacer";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import {
  CreateHabitDraft,
  CreateHabitModal,
} from "@/components/dashboard/CreateHabitModal";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { HabitDetailActions } from "@/components/dashboard/HabitDetailActions";
import { CheckDayModal } from "@/components/dashboard/CheckDayModal";
import { LogSessionModal } from "@/components/dashboard/LogSessionModal";
import type { CheckInDraft } from "@/lib/checkIn";
import { toDateKey } from "@/lib/checkIn";
import {
  ApiCheckIn,
  createHabitCheckIn,
  fetchHabitCheckIns,
} from "@/lib/checkInsApi";

function StatCard({
  label,
  value,
  suffix,
  accent,
  borderColor,
  compact,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  accent?: string;
  borderColor?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-[15px] border bg-bg-elevated ${
        compact ? "min-w-[132px] flex-none px-3.5 py-3.5" : "px-[18px] py-4"
      }`}
      style={{ borderColor: borderColor ?? "rgba(255,255,255,0.06)" }}
    >
      <div
        className={`mb-2 font-semibold text-[#7b8090] ${
          compact ? "text-[11px]" : "mb-[9px] text-[11.5px]"
        }`}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-[5px]">
        <span
          className={`font-mono font-bold ${compact ? "text-[24px]" : "text-[28px]"}`}
          style={{ color: accent ?? "#f4f5f7" }}
        >
          {value}
        </span>
        {suffix ? (
          <span className="text-[12px] font-medium text-[#8a8f9c]">{suffix}</span>
        ) : null}
      </div>
    </div>
  );
}

export default function HabitDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const habitId = Number(params.id);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [habit, setHabit] = useState<ApiHabit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [checkDayOpen, setCheckDayOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logDateKey, setLogDateKey] = useState<string | null>(null);
  const [checkIns, setCheckIns] = useState<ApiCheckIn[]>([]);

  const loadHabit = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);

    try {
      const [next, nextCheckIns] = await Promise.all([
        fetchHabit(id),
        fetchHabitCheckIns(id),
      ]);
      setHabit(next);
      setCheckIns(nextCheckIns);
    } catch (err) {
      setHabit(null);
      setCheckIns([]);
      setError(err instanceof Error ? err.message : "Could not load habit.");
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

    if (!Number.isFinite(habitId) || habitId <= 0) {
      setError("Habit not found.");
      setLoading(false);
      return;
    }

    fetchCurrentUser(token)
      .then((currentUser) => {
        setUser(currentUser);
        return loadHabit(habitId);
      })
      .catch(() => {
        clearToken();
        setError("Your session expired. Please log in again.");
        setLoading(false);
      });
  }, [router, habitId, loadHabit]);

  const detail = useMemo(
    () => (habit ? buildHabitDetailView(habit, checkIns) : null),
    [habit, checkIns],
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

  async function handleSaveHabit(draft: CreateHabitDraft) {
    if (!habit) return;

    const updated = await updateHabit(habit.id, draftToCreatePayload(draft));
    setHabit(updated);
  }

  async function handleDeleteHabit() {
    if (!habit) return;

    setDeleteLoading(true);
    setActionError(null);

    try {
      await deleteHabit(habit.id);
      router.replace("/dashboard");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not delete habit.",
      );
      setDeleteOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  }

  function openCheckDay() {
    setCheckDayOpen(true);
  }

  function openLogForDate(dateKey: string) {
    setLogDateKey(dateKey);
    setCheckDayOpen(false);
    setLogOpen(true);
  }

  async function handleLogSession(draft: CheckInDraft) {
    if (!habit) return;

    const created = await createHabitCheckIn(habit.id, {
      date: draft.date,
      mood: draft.mood,
      note: draft.note.trim() || null,
    });

    setCheckIns((prev) => {
      const withoutSameDay = prev.filter((item) => item.date !== created.date);
      return [created, ...withoutSameDay];
    });
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

  if (error || !habit || !detail) {
    return (
      <div className="flex min-h-dvh bg-bg">
        <Sidebar
          userName={`${user.first_name} ${user.last_name}`}
          userPlanLabel="Free plan"
          onLogout={logout}
        />
        <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 p-8">
          <p className="text-danger">{error ?? "Habit not found."}</p>
          <Link
            href="/dashboard"
            className="text-[14px] font-semibold text-[#aeb3f5] hover:text-white"
          >
            ← Back to dashboard
          </Link>
        </main>
      </div>
    );
  }

  const displayName = `${user.first_name} ${user.last_name}`;
  const barGradient = `linear-gradient(180deg,${habitColorWithAlpha(habit.color, 0.85)},${habitColorWithAlpha(habit.color, 0.35)})`;
  const checkInGradient = `linear-gradient(180deg,${habitColorWithAlpha(habit.color, 0.95)},${habitColorWithAlpha(habit.color, 0.65)})`;

  const stats = [
    {
      label: "Current streak",
      value: detail.currentStreak,
      suffix: "days",
      accent: habit.color,
      borderColor: habitColorWithAlpha(habit.color, 0.2),
    },
    {
      label: "Longest streak",
      value: detail.longestStreak,
      suffix: "days",
    },
    {
      label: "Completion",
      value: detail.completion,
      suffix: "%",
    },
    {
      label: "Sessions",
      value: detail.sessions,
    },
    {
      label: "This week",
      value: detail.thisWeekDone,
      suffix: `/ ${detail.thisWeekTarget}`,
    },
  ] as const;

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar
        userName={displayName}
        userPlanLabel="Free plan"
        onLogout={logout}
      />

      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-bg/95 px-[18px] py-3 backdrop-blur-md sm:hidden">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-[#777c8a]"
          >
            <span aria-hidden="true">←</span>
            <span className="truncate text-[#cfd2d8]">{habit.name}</span>
          </Link>
          <HabitDetailActions
            compact
            onEdit={() => setEditOpen(true)}
            onDelete={() => setDeleteOpen(true)}
          />
        </div>

        {/* Desktop top bar */}
        <div className="hidden h-16 items-center justify-between gap-3 border-b border-white/[0.06] px-[34px] sm:flex">
          <div className="flex min-w-0 items-center gap-[10px] text-[13px] font-semibold">
            <Link
              href="/dashboard"
              className="flex items-center gap-[10px] text-[#777c8a] transition hover:text-[#cfd2d8]"
            >
              <span aria-hidden="true">←</span>
              <span>Dashboard</span>
            </Link>
            <span className="text-[#3a3e48]">/</span>
            <span className="truncate text-[#cfd2d8]">{habit.name}</span>
          </div>

          <div className="flex flex-wrap items-center gap-[10px]">
            {detail.reminderLabel ? (
              <div className="flex items-center gap-[7px] rounded-[11px] border border-white/[0.08] bg-[#15171c] px-[14px] py-[9px]">
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: habit.color }}
                />
                <span className="text-[12.5px] font-semibold text-[#b9bdc6]">
                  {detail.reminderLabel}
                </span>
              </div>
            ) : null}

            <HabitDetailActions
              onEdit={() => setEditOpen(true)}
              onDelete={() => setDeleteOpen(true)}
            />
          </div>
        </div>

        <div className="px-[18px] pb-9 pt-5 sm:px-[34px] sm:pt-[30px]">
          {actionError ? (
            <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-danger">
              {actionError}
            </p>
          ) : null}

          <div className="mb-5 flex flex-col gap-4 sm:mb-[26px] sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div
                className="h-11 w-11 flex-none rounded-[14px] sm:h-[46px] sm:w-[46px]"
                style={{
                  background: `linear-gradient(150deg,${habitColorWithAlpha(habit.color, 0.9)},${habitColorWithAlpha(habit.color, 0.5)})`,
                  boxShadow: `0 0 26px ${habitColorWithAlpha(habit.color, 0.45)}, inset 0 1px 0 rgba(255,255,255,0.35)`,
                }}
              />
              <div className="min-w-0">
                <h1 className="m-0 mb-1 text-[24px] font-extrabold tracking-[-0.025em] text-[#f4f5f7] sm:text-[28px]">
                  {habit.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-[10px]">
                  <span
                    className="rounded-[7px] px-2.5 py-[3px] text-[12px] font-semibold"
                    style={{
                      background: habitColorWithAlpha(habit.color, 0.14),
                      color: habitColorWithAlpha(habit.color, 0.95),
                    }}
                  >
                    {detail.goalBadge}
                  </span>
                  <span className="font-mono text-[12px] font-medium text-[#6b7280] sm:text-[13px]">
                    {detail.startedLabel}
                  </span>
                </div>
                {detail.reminderLabel ? (
                  <div className="mt-2.5 flex items-center gap-2 sm:hidden">
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: habit.color }}
                    />
                    <span className="text-[12px] font-semibold text-[#8a8f9c]">
                      {detail.reminderLabel}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={openCheckDay}
              className="inline-flex w-full items-center justify-center gap-[9px] rounded-[12px] px-[18px] py-3 sm:w-auto sm:self-start sm:py-[11px]"
              style={{
                background: checkInGradient,
                boxShadow: `0 8px 20px -6px ${habitColorWithAlpha(habit.color, 0.5)}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                color: "#06283a",
              }}
            >
              <span className="-mt-0.5 text-[18px] font-bold leading-none">+</span>
              <span className="text-[14px] font-bold">Check in</span>
            </button>
          </div>

          {/* Mobile stats: horizontal snap scroll */}
          <div className="-mx-[18px] mb-5 flex gap-2.5 overflow-x-auto px-[18px] pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden">
            {stats.map((stat) => (
              <StatCard
                key={stat.label}
                compact
                label={stat.label}
                value={stat.value}
                suffix={"suffix" in stat ? stat.suffix : undefined}
                accent={"accent" in stat ? stat.accent : undefined}
                borderColor={"borderColor" in stat ? stat.borderColor : undefined}
              />
            ))}
          </div>

          {/* Desktop stats */}
          <div className="mb-[26px] hidden grid-cols-2 gap-[14px] sm:grid xl:grid-cols-5">
            {stats.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                suffix={"suffix" in stat ? stat.suffix : undefined}
                accent={"accent" in stat ? stat.accent : undefined}
                borderColor={"borderColor" in stat ? stat.borderColor : undefined}
              />
            ))}
          </div>

          <div className="mb-5 sm:mb-6">
            <ActivityHeatmap
              weeks={detail.weeks}
              dayLabels={detail.dayLabels}
              color={habit.color}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[1.15fr_1fr]">
            <section className="rounded-[18px] border border-white/[0.06] bg-bg-elevated px-4 py-5 sm:px-[26px] sm:py-[24px]">
              <div className="mb-4 flex items-center justify-between gap-3 sm:mb-[22px]">
                <h3 className="m-0 text-[15px] font-bold text-[#e8e9ec]">
                  Monthly consistency
                </h3>
                <span className="font-mono text-[10px] font-semibold text-[#6b7280] sm:text-[11px]">
                  SESSIONS / MONTH
                </span>
              </div>

              <div className="flex h-[120px] items-end gap-1.5 sm:h-[150px] sm:gap-[9px]">
                {detail.monthly.map((month, idx) => (
                  <div
                    key={`${month.label}-${idx}`}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-2 sm:gap-[9px]"
                  >
                    <div
                      className="w-full min-h-[5px] rounded-[5px_5px_2px_2px]"
                      style={{
                        height: `${Math.max(5, Math.min(100, month.pct))}%`,
                        background: barGradient,
                      }}
                    />
                    <span className="font-mono text-[9px] font-semibold text-[#5b6070] sm:text-[10px]">
                      {month.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[18px] border border-white/[0.06] bg-bg-elevated px-4 py-5 sm:px-[26px] sm:py-[24px]">
              <h3 className="m-0 mb-3 text-[15px] font-bold text-[#e8e9ec] sm:mb-[18px]">
                Recent check-ins
              </h3>

              <div className="flex flex-col gap-0.5">
                {detail.checkIns.map((entry, idx) => {
                  const isLast = idx === detail.checkIns.length - 1;
                  return (
                    <div
                      key={`${entry.dayLabel}-${idx}`}
                      className={`flex items-start gap-3 py-3 sm:gap-3.5 ${
                        isLast ? "" : "border-b border-white/[0.05]"
                      }`}
                    >
                      <div className="w-[48px] flex-none pt-px font-mono text-[11px] font-semibold text-[#8a8f9c] sm:w-[54px] sm:text-[11.5px]">
                        {entry.dayLabel}
                        <br />
                        <span className="text-[#5b6070]">{entry.timeLabel}</span>
                      </div>
                      <div className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-[#cfd2d8] sm:text-[13.5px]">
                        {entry.note}
                      </div>
                      <div className="flex gap-[3px] pt-[3px]">
                        {Array.from({ length: 5 }).map((_, moodIdx) => (
                          <div
                            key={`m-${idx}-${moodIdx}`}
                            className="h-[14px] w-[5px] rounded-[2px]"
                            style={{
                              background:
                                moodIdx < entry.mood
                                  ? habit.color
                                  : habitColorWithAlpha(habit.color, 0.18),
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        <MobileNavSpacer />
      </div>

      <MobileBottomNav onAddClick={() => router.push("/dashboard")} />

      <CreateHabitModal
        open={editOpen}
        mode="edit"
        initialValues={apiHabitToDraft(habit)}
        onClose={() => setEditOpen(false)}
        onCreate={handleSaveHabit}
      />

      <CheckDayModal
        open={checkDayOpen}
        habitId={habit.id}
        habitName={habit.name}
        habitColor={habit.color}
        streak={detail.currentStreak}
        freezesRemaining={3}
        loggedDateKeys={detail.loggedDateKeys}
        onClose={() => setCheckDayOpen(false)}
        onConfirm={openLogForDate}
      />

      <LogSessionModal
        open={logOpen}
        habits={[{ id: habit.id, name: habit.name, color: habit.color }]}
        initialHabitId={habit.id}
        initialDateKey={logDateKey ?? toDateKey(new Date())}
        streakByHabitId={{ [habit.id]: detail.currentStreak }}
        freezesRemaining={3}
        onClose={() => {
          setLogOpen(false);
          setLogDateKey(null);
        }}
        onSubmit={handleLogSession}
      />

      <ConfirmDialog
        open={deleteOpen}
        danger
        loading={deleteLoading}
        title="Delete habit?"
        message={`“${habit.name}” and its history will be removed. This cannot be undone.`}
        confirmLabel="Delete habit"
        cancelLabel="Keep habit"
        onCancel={() => {
          if (!deleteLoading) setDeleteOpen(false);
        }}
        onConfirm={() => {
          void handleDeleteHabit();
        }}
      />
    </div>
  );
}
