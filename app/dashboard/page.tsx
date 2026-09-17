"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  API_URL,
  clearToken,
  getToken,
} from "@/lib/auth";
import {
  ApiHabit,
  apiHabitToCard,
  apiHabitToDraft,
  createHabit,
  deleteHabit,
  draftToCreatePayload,
  updateHabit,
} from "@/lib/habits";
import {
  ApiCheckIn,
  createHabitCheckIn,
  deleteHabitCheckIn,
} from "@/lib/checkInsApi";
import {
  frozenKeysForHabit,
  FreezesResponse,
} from "@/lib/freezesApi";
import {
  invalidateDashboardCache,
  patchDashboardCache,
} from "@/lib/dashboardData";
import { useDashboardSession } from "@/lib/useDashboardSession";
import { goalFromHabit, type HabitPeriod } from "@/lib/periodStreak";
import { buildStatisticsView } from "@/lib/statistics";
import { LoadingSpinner, PageLoader } from "@/components/LoadingSpinner";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { HobbyCard } from "@/components/dashboard/HobbyCard";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { MobileNavSpacer } from "@/components/dashboard/MobileNavSpacer";
import { StreakFreezesCard } from "@/components/dashboard/StreakFreezesCard";
import { ConsistencyChart } from "@/components/dashboard/ConsistencyChart";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { CreateHabitDraft } from "@/components/dashboard/CreateHabitModal";
import type { CheckInDraft } from "@/lib/checkIn";
import { toDateKey } from "@/lib/checkIn";

const CreateHabitModal = dynamic(
  () =>
    import("@/components/dashboard/CreateHabitModal").then((m) => m.CreateHabitModal),
  { ssr: false },
);
const ConfirmDialog = dynamic(
  () =>
    import("@/components/dashboard/ConfirmDialog").then((m) => m.ConfirmDialog),
  { ssr: false },
);
const LogSessionModal = dynamic(
  () =>
    import("@/components/dashboard/LogSessionModal").then((m) => m.LogSessionModal),
  { ssr: false },
);

export default function DashboardPage() {
  const router = useRouter();
  const {
    user,
    bundle,
    setBundle,
    error,
    setError,
    booting,
  } = useDashboardSession();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<ApiHabit | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<ApiHabit | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const habits = bundle?.habits ?? [];
  const checkInsByHabit = bundle?.checkInsByHabit ?? {};
  const freezes = bundle?.freezes ?? null;
  const [habitsError, setHabitsError] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [logHabitId, setLogHabitId] = useState<number | null>(null);
  const [logDateKey, setLogDateKey] = useState<string | null>(null);
  const [logMode, setLogMode] = useState<"create" | "edit">("create");

  function setHabits(updater: ApiHabit[] | ((prev: ApiHabit[]) => ApiHabit[])) {
    setBundle((prev) => {
      if (!prev) return prev;
      const nextHabits =
        typeof updater === "function" ? updater(prev.habits) : updater;
      const next = { ...prev, habits: nextHabits, fetchedAt: Date.now() };
      patchDashboardCache(() => next);
      return next;
    });
  }

  function setCheckInsByHabit(
    updater:
      | Record<number, ApiCheckIn[]>
      | ((prev: Record<number, ApiCheckIn[]>) => Record<number, ApiCheckIn[]>),
  ) {
    setBundle((prev) => {
      if (!prev) return prev;
      const nextMap =
        typeof updater === "function"
          ? updater(prev.checkInsByHabit)
          : updater;
      const next = {
        ...prev,
        checkInsByHabit: nextMap,
        fetchedAt: Date.now(),
      };
      patchDashboardCache(() => next);
      return next;
    });
  }

  function setFreezes(
    updater:
      | FreezesResponse
      | null
      | ((prev: FreezesResponse | null) => FreezesResponse | null),
  ) {
    setBundle((prev) => {
      if (!prev) return prev;
      const nextFreezes =
        typeof updater === "function" ? updater(prev.freezes) : updater;
      if (!nextFreezes) return prev;
      const next = { ...prev, freezes: nextFreezes, fetchedAt: Date.now() };
      patchDashboardCache(() => next);
      return next;
    });
  }

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
    invalidateDashboardCache();
    router.replace("/login");
  }

  function openCreateModal() {
    setEditingHabit(null);
    setModalOpen(true);
  }

  function openEditModal(habit: ApiHabit) {
    setEditingHabit(habit);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingHabit(null);
  }

  async function handleSaveHabit(draft: CreateHabitDraft) {
    const payload = draftToCreatePayload(draft);

    if (editingHabit) {
      const updated = await updateHabit(editingHabit.id, payload);
      setHabits((prev) => {
        const next = prev.map((h) => (h.id === updated.id ? updated : h));
        patchDashboardCache((cache) => ({
          ...cache,
          habits: next,
          fetchedAt: Date.now(),
        }));
        return next;
      });
      return;
    }

    const created = await createHabit(payload);
    setHabits((prev) => {
      const next = [created, ...prev];
      patchDashboardCache((cache) => ({
        ...cache,
        habits: next,
        checkInsByHabit: { ...cache.checkInsByHabit, [created.id]: [] },
        fetchedAt: Date.now(),
      }));
      return next;
    });
    setCheckInsByHabit((prev) => ({ ...prev, [created.id]: [] }));
  }

  async function handleDeleteHabit() {
    if (!deletingHabit) return;

    setDeleteLoading(true);
    setHabitsError(null);

    try {
      await deleteHabit(deletingHabit.id);
      setHabits((prev) => prev.filter((h) => h.id !== deletingHabit.id));
      setCheckInsByHabit((prev) => {
        const next = { ...prev };
        delete next[deletingHabit.id];
        return next;
      });
      patchDashboardCache((cache) => {
        const habits = cache.habits.filter((h) => h.id !== deletingHabit.id);
        const checkInsByHabit = { ...cache.checkInsByHabit };
        delete checkInsByHabit[deletingHabit.id];
        return { ...cache, habits, checkInsByHabit, fetchedAt: Date.now() };
      });
      setDeletingHabit(null);
    } catch (err) {
      setHabitsError(
        err instanceof Error ? err.message : "Could not delete habit.",
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  function openMiniCheckIn(
    habit: ApiHabit,
    cell: { dateKey: string; checked: boolean; locked?: boolean },
  ) {
    if (cell.locked) return;
    if (cell.dateKey < habit.created_at.slice(0, 10)) return;

    const todayKey = toDateKey(new Date());
    // Past logged days are locked — only today can be edited.
    if (cell.checked && cell.dateKey !== todayKey) return;
    if (!cell.checked && cell.dateKey < todayKey && (freezes?.remaining ?? 0) < 1) {
      return;
    }

    setLogHabitId(habit.id);
    setLogDateKey(cell.dateKey);
    setLogMode(cell.checked ? "edit" : "create");
    setLogOpen(true);
  }

  function closeLogModal() {
    setLogOpen(false);
    setLogHabitId(null);
    setLogDateKey(null);
    setLogMode("create");
  }

  async function handleLogSession(draft: CheckInDraft) {
    const habit = habits.find((item) => item.id === draft.habitId);
    if (!habit) throw new Error("Habit not found.");
    if (draft.date < habit.created_at.slice(0, 10)) {
      throw new Error("You cannot check in before this habit was created.");
    }
    const todayKey = toDateKey(new Date());
    if (draft.date < todayKey && (freezes?.remaining ?? 0) < 1) {
      throw new Error("No streak freezes left. You can only log today.");
    }
    const existing = (checkInsByHabit[habit.id] ?? []).find(
      (item) => item.date === draft.date,
    );
    if (existing && draft.date !== todayKey) {
      throw new Error("Past check-ins can’t be changed.");
    }

    const created = await createHabitCheckIn(habit.id, {
      date: draft.date,
      mood: draft.mood,
      note: draft.note.trim() || null,
    });

    setCheckInsByHabit((prev) => {
      const list = prev[habit.id] ?? [];
      const withoutSameDay = list.filter((item) => item.date !== created.date);
      const nextList = [created, ...withoutSameDay];
      const nextMap = { ...prev, [habit.id]: nextList };
      patchDashboardCache((cache) => ({
        ...cache,
        checkInsByHabit: nextMap,
        fetchedAt: Date.now(),
      }));
      return nextMap;
    });

    if (created.freeze) {
      const freeze = created.freeze;
      setFreezes((prev) => {
        const base = prev ?? { remaining: 0, total: freeze.total, by_habit: {} };
        const keys = frozenKeysForHabit(base.by_habit, habit.id);
        const nextKeys =
          freeze.period_key && !keys.includes(freeze.period_key)
            ? [...keys, freeze.period_key]
            : keys;
        const next = {
          remaining: freeze.remaining,
          total: freeze.total,
          by_habit: {
            ...base.by_habit,
            [String(habit.id)]: nextKeys,
          },
        };
        patchDashboardCache((cache) => ({
          ...cache,
          freezes: next,
          fetchedAt: Date.now(),
        }));
        return next;
      });
    }
  }

  async function handleRemoveCheckIn() {
    if (!logHabitId || !logDateKey) return;
    if (logDateKey !== toDateKey(new Date())) {
      throw new Error("Only today's check-in can be removed.");
    }

    const list = checkInsByHabit[logHabitId] ?? [];
    const existing = list.find((item) => item.date === logDateKey);
    if (!existing) {
      throw new Error("Check-in not found for this day.");
    }

    await deleteHabitCheckIn(logHabitId, existing.id);
    setCheckInsByHabit((prev) => {
      const nextMap = {
        ...prev,
        [logHabitId]: (prev[logHabitId] ?? []).filter(
          (item) => item.id !== existing.id,
        ),
      };
      patchDashboardCache((cache) => ({
        ...cache,
        checkInsByHabit: nextMap,
        fetchedAt: Date.now(),
      }));
      return nextMap;
    });
  }

  const habitCards = useMemo(
    () =>
      habits.map((habit) =>
        apiHabitToCard(
          habit,
          checkInsByHabit[habit.id] ?? [],
          frozenKeysForHabit(freezes?.by_habit ?? {}, habit.id),
        ),
      ),
    [habits, checkInsByHabit, freezes?.by_habit],
  );

  const yearStats = useMemo(
    () =>
      buildStatisticsView({
        habits,
        checkInsByHabit,
        frozenByHabit: freezes?.by_habit ?? {},
        range: "year",
      }),
    [habits, checkInsByHabit, freezes?.by_habit],
  );

  const dashboardStats = useMemo(() => {
    const cards = habitCards;
    const totalSessions = Object.values(checkInsByHabit).reduce((sum, list) => {
      const uniqueDates = new Set(list.map((item) => item.date.slice(0, 10)));
      return sum + uniqueDates.size;
    }, 0);

    const top = cards.reduce<(typeof cards)[number] | null>((best, card) => {
      if (!best || card.streak > best.streak) return card;
      return best;
    }, null);

    return {
      activeStreak: top?.streak ?? 0,
      activeStreakUnit: top?.unit.replace(" streak", "s") ?? "days",
      completionRate: yearStats.goalsOverallPct,
      totalSessions,
      bestMonth: yearStats.bestMonth,
    };
  }, [habitCards, checkInsByHabit, yearStats]);

  const consistencyMonths = useMemo(
    () =>
      yearStats.months.map((month) => ({
        label: month.label,
        shortLabel: month.shortLabel,
        pct: month.pct,
        fill: month.fill,
        met: month.met,
        total: month.total,
        isBest: month.isBest,
        isCurrent: month.isCurrent,
        inRange: month.inRange,
      })),
    [yearStats.months],
  );

  const greetingDateLine = useMemo(() => {
    const weekday = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
    }).format(new Date());
    const monthDay = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
    }).format(new Date());
    const count = habits.length;
    const noun = count === 1 ? "hobby" : "hobbies";
    return `${weekday}, ${monthDay} · ${count} ${noun} on the loop`;
  }, [habits.length]);

  const mobileDateLabel = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
    })
      .format(new Date())
      .toUpperCase()
      .replace(",", " ·");
  }, []);

  const logHabit = useMemo(
    () => habits.find((habit) => habit.id === logHabitId) ?? null,
    [habits, logHabitId],
  );

  const editingCheckIn = useMemo(() => {
    if (!logHabitId || !logDateKey || logMode !== "edit") return null;
    return (
      (checkInsByHabit[logHabitId] ?? []).find(
        (item) => item.date === logDateKey,
      ) ?? null
    );
  }, [checkInsByHabit, logDateKey, logHabitId, logMode]);

  const streakByHabitId = useMemo(() => {
    const map: Record<number, number> = {};
    for (const habit of habits) {
      const card = habitCards.find((item) => item.id === String(habit.id));
      if (card) map[habit.id] = card.streak;
    }
    return map;
  }, [habits, habitCards]);

  const streakUnitByHabitId = useMemo(() => {
    const map: Record<number, HabitPeriod> = {};
    for (const habit of habits) {
      map[habit.id] = goalFromHabit(habit).period;
    }
    return map;
  }, [habits]);

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

  if (booting || !user) {
    return <PageLoader label="Loading dashboard…" />;
  }

  const displayName = `${user.first_name} ${user.last_name}`;
  const freezesReady = freezes !== null;
  const freezesRemaining = freezes?.remaining ?? 0;
  const freezesTotal = freezes?.total ?? 3;
  const freezePips = freezesReady ? freezesRemaining : 0;

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar
        userName={displayName}
        userPlanLabel="Free plan"
        onLogout={logout}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-border-soft bg-bg-soft px-[22px] pb-[12px] pt-[16px] lg:hidden">
          <div className="min-w-0">
            <div className="mb-[3px] font-mono text-[11.5px] text-text-dim">
              {mobileDateLabel}
            </div>
            <div className="text-[22px] font-extrabold leading-tight text-text">
              Hey, {user.first_name}
            </div>
          </div>

          <div className="flex flex-none items-center gap-2">
            <ThemeToggle compact />
            <div className="flex items-center gap-[7px] rounded-[11px] border border-[rgba(56,189,248,0.25)] bg-bg-elevated px-[12px] py-[8px]">
              <div className="flex gap-[2.5px]">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={`m-${idx}`}
                    className={
                      freezesReady && idx < freezePips
                        ? "h-[12px] w-[9px] rounded-[2px] bg-gradient-to-b from-[#7dd3fc] to-[#38bdf8]"
                        : "h-[12px] w-[9px] rounded-[2px] bg-bg-muted"
                    }
                  />
                ))}
              </div>
              <span className="font-mono text-[13px] font-extrabold text-[#38bdf8]">
                {freezesReady ? freezesRemaining : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="hidden px-[34px] pb-[36px] pt-[30px] lg:block">
          <div className="mb-[26px] flex items-start justify-between">
            <div>
              <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.025em] text-text">
                Good evening, {user.first_name}
              </h1>
              <p className="m-0 text-[14px] font-medium text-text-dim opacity-70">
                {greetingDateLine}
              </p>
            </div>

            <div className="flex items-center gap-[12px]">
              <div className="flex items-center gap-[9px] rounded-[12px] border border-[rgba(56,189,248,0.25)] bg-bg-elevated px-[14px] py-[10px]">
                <div className="flex gap-[3px]">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div
                      key={`fi-${idx}`}
                      className={
                        freezesReady && idx < freezePips
                          ? "h-[14px] w-[11px] rounded-[3px] bg-gradient-to-b from-[#7dd3fc] to-[#38bdf8] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                          : "h-[14px] w-[11px] rounded-[3px] bg-bg-muted"
                      }
                    />
                  ))}
                </div>
                <span className="font-mono text-[13px] font-semibold text-[#38bdf8]">
                  {freezesReady ? `${freezesRemaining} freezes` : "— freezes"}
                </span>
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                className="flex items-center gap-[8px] rounded-[12px] bg-gradient-to-b from-[#7a86ff] to-[#5d69f0] px-[18px] py-[11px] shadow-[0_8px_20px_-6px_rgba(111,123,255,0.55),inset_0_1px_0_rgba(255,255,255,0.25)]"
              >
                <span className="-mt-[2px] text-[18px] font-extrabold leading-[0] text-white">
                  +
                </span>
                <span className="text-[14px] font-extrabold text-white">
                  Add habit
                </span>
              </button>
              <ThemeToggle compact />
            </div>
          </div>

          <div className="mb-[26px] grid grid-cols-4 gap-[16px]">
            <div className="rounded-[16px] border border-border-soft bg-bg-elevated p-[18px]">
              <div className="mb-[10px] text-[12px] font-semibold text-text-dim">
                Active streak
              </div>
              <div className="flex items-baseline gap-[6px]">
                <span className="font-mono text-[30px] font-extrabold text-text">
                  {dashboardStats.activeStreak}
                </span>
                <span className="text-[13px] font-medium text-text-soft">
                  {dashboardStats.activeStreakUnit}
                </span>
              </div>
            </div>

            <div className="rounded-[16px] border border-border-soft bg-bg-elevated p-[18px]">
              <div className="mb-[10px] text-[12px] font-semibold text-text-dim">
                Consistency
              </div>
              <div className="flex items-baseline gap-[6px]">
                <span className="font-mono text-[30px] font-extrabold text-text">
                  {dashboardStats.completionRate}
                </span>
                <span className="text-[13px] font-medium text-text-soft">%</span>
              </div>
            </div>

            <div className="rounded-[16px] border border-border-soft bg-bg-elevated p-[18px]">
              <div className="mb-[10px] text-[12px] font-semibold text-text-dim">
                Total sessions
              </div>
              <div className="flex items-baseline gap-[6px]">
                <span className="font-mono text-[30px] font-extrabold text-text">
                  {dashboardStats.totalSessions}
                </span>
              </div>
            </div>

            <div className="rounded-[16px] border border-border-soft bg-bg-elevated p-[18px]">
              <div className="mb-[10px] text-[12px] font-semibold text-text-dim">
                Best month
              </div>
              <div className="flex items-baseline gap-[6px]">
                <span className="text-[24px] font-bold text-text">
                  {dashboardStats.bestMonth}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1.5fr_1fr] gap-[24px]">
            <div>
              <div className="mb-[14px] flex items-center justify-between">
                <h2 className="m-0 text-[16px] font-bold text-text-heading">
                  Your hobbies
                </h2>
                <span className="font-mono text-[12px] font-semibold text-text-dim">
                  {habits.length} TOTAL
                </span>
              </div>

              {habitsError ? (
                <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-danger">
                  {habitsError}
                </p>
              ) : null}

              {booting ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="md" label="Loading habits…" />
                </div>
              ) : habits.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-white/[0.1] bg-bg-elevated px-5 py-8 text-center">
                  <p className="mb-3 text-[14px] text-text-muted">
                    No habits yet. Create your first one to start the loop.
                  </p>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="text-[14px] font-semibold text-brand-soft hover:text-text"
                  >
                    + Add habit
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-[16px]">
                  {habits.map((habit, index) => (
                    <HobbyCard
                      key={habit.id}
                      hobby={habitCards[index]!}
                      variant="desktop"
                      href={`/dashboard/habits/${habit.id}`}
                      onEdit={() => openEditModal(habit)}
                      onDelete={() => setDeletingHabit(habit)}
                      onMiniCellClick={(cell) => openMiniCheckIn(habit, cell)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-[16px]">
              <StreakFreezesCard
                total={freezesTotal}
                remaining={freezesRemaining}
                loading={!freezesReady}
              />
              <ConsistencyChart months={consistencyMonths} />
            </div>
          </div>
        </div>

        <div className="px-[22px] lg:hidden">
          <div className="flex flex-col gap-[11px] pt-[4px]">
            {habitsError ? (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-danger">
                {habitsError}
              </p>
            ) : null}

            {booting ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner size="md" label="Loading habits…" />
              </div>
            ) : habits.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-white/[0.1] bg-bg-elevated px-5 py-8 text-center">
                <p className="mb-3 text-[14px] text-text-muted">
                  No habits yet. Tap + to create one.
                </p>
              </div>
            ) : (
              habits.map((habit, index) => (
                <HobbyCard
                  key={habit.id}
                  hobby={habitCards[index]!}
                  variant="mobile"
                  href={`/dashboard/habits/${habit.id}`}
                  onEdit={() => openEditModal(habit)}
                  onDelete={() => setDeletingHabit(habit)}
                  onMiniCellClick={(cell) => openMiniCheckIn(habit, cell)}
                />
              ))
            )}
          </div>
          <MobileNavSpacer />
        </div>
      </div>

      <MobileBottomNav onAddClick={openCreateModal} />

      <CreateHabitModal
        open={modalOpen}
        mode={editingHabit ? "edit" : "create"}
        initialValues={editingHabit ? apiHabitToDraft(editingHabit) : null}
        onClose={closeModal}
        onCreate={handleSaveHabit}
      />

      <ConfirmDialog
        open={Boolean(deletingHabit)}
        danger
        loading={deleteLoading}
        title="Delete habit?"
        message={
          deletingHabit
            ? `“${deletingHabit.name}” and its history will be removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete habit"
        cancelLabel="Keep habit"
        onCancel={() => {
          if (!deleteLoading) setDeletingHabit(null);
        }}
        onConfirm={() => {
          void handleDeleteHabit();
        }}
      />

      {logHabit ? (
        <LogSessionModal
          open={logOpen}
          habits={[{ id: logHabit.id, name: logHabit.name, color: logHabit.color }]}
          initialHabitId={logHabit.id}
          initialDateKey={logDateKey ?? toDateKey(new Date())}
          initialMood={editingCheckIn?.mood ?? null}
          initialNote={editingCheckIn?.note ?? null}
          mode={logMode}
          streakByHabitId={streakByHabitId}
          streakUnitByHabitId={streakUnitByHabitId}
          freezesRemaining={freezesRemaining}
          onClose={closeLogModal}
          onSubmit={handleLogSession}
          onRemove={
            logMode === "edit" && logDateKey === toDateKey(new Date())
              ? handleRemoveCheckIn
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
