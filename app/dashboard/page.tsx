"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  API_URL,
  AuthUser,
  clearToken,
  fetchCurrentUser,
  getToken,
} from "@/lib/auth";
import { dashboardMock } from "@/lib/dashboardMock";
import {
  ApiHabit,
  apiHabitToCard,
  apiHabitToDraft,
  createHabit,
  deleteHabit,
  draftToCreatePayload,
  fetchHabits,
  updateHabit,
} from "@/lib/habits";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { HobbyCard } from "@/components/dashboard/HobbyCard";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { MobileNavSpacer } from "@/components/dashboard/MobileNavSpacer";
import { StreakFreezesCard } from "@/components/dashboard/StreakFreezesCard";
import { ConsistencyChart } from "@/components/dashboard/ConsistencyChart";
import {
  CreateHabitDraft,
  CreateHabitModal,
} from "@/components/dashboard/CreateHabitModal";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<ApiHabit | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<ApiHabit | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [habits, setHabits] = useState<ApiHabit[]>([]);
  const [habitsLoading, setHabitsLoading] = useState(true);
  const [habitsError, setHabitsError] = useState<string | null>(null);

  const loadHabits = useCallback(async () => {
    setHabitsLoading(true);
    setHabitsError(null);

    try {
      const next = await fetchHabits();
      setHabits(next);
    } catch (err) {
      setHabitsError(
        err instanceof Error ? err.message : "Could not load habits.",
      );
    } finally {
      setHabitsLoading(false);
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
        return loadHabits();
      })
      .catch(() => {
        clearToken();
        setError("Your session expired. Please log in again.");
      });
  }, [router, loadHabits]);

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
      setHabits((prev) =>
        prev.map((h) => (h.id === updated.id ? updated : h)),
      );
      return;
    }

    const created = await createHabit(payload);
    setHabits((prev) => [created, ...prev]);
  }

  async function handleDeleteHabit() {
    if (!deletingHabit) return;

    setDeleteLoading(true);
    setHabitsError(null);

    try {
      await deleteHabit(deletingHabit.id);
      setHabits((prev) => prev.filter((h) => h.id !== deletingHabit.id));
      setDeletingHabit(null);
    } catch (err) {
      setHabitsError(
        err instanceof Error ? err.message : "Could not delete habit.",
      );
    } finally {
      setDeleteLoading(false);
    }
  }

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
  const freezesRemaining = dashboardMock.stats.freezesTotal;

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar
        userName={displayName}
        userPlanLabel="Free plan"
        onLogout={logout}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-white/[0.04] bg-bg-soft px-[22px] pb-[12px] pt-[16px] lg:hidden">
          <div className="min-w-0">
            <div className="mb-[3px] font-mono text-[11.5px] text-text-dim">
              {mobileDateLabel}
            </div>
            <div className="text-[22px] font-extrabold leading-tight text-[#f4f5f7]">
              Hey, {user.first_name}
            </div>
          </div>

          <div className="flex flex-none items-center gap-[7px] rounded-[11px] border border-[rgba(56,189,248,0.25)] bg-bg-elevated px-[12px] py-[8px]">
            <div className="flex gap-[2.5px]">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={`m-${idx}`}
                  className="h-[12px] w-[9px] rounded-[2px] bg-gradient-to-b from-[#7dd3fc] to-[#38bdf8]"
                />
              ))}
            </div>
            <span className="font-mono text-[13px] font-extrabold text-[#cfe9fb]">
              {freezesRemaining}
            </span>
          </div>
        </div>

        <div className="hidden px-[34px] pb-[36px] pt-[30px] lg:block">
          <div className="mb-[26px] flex items-start justify-between">
            <div>
              <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.025em] text-[#f4f5f7]">
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
                      className="h-[14px] w-[11px] rounded-[3px] bg-gradient-to-b from-[#7dd3fc] to-[#38bdf8] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                    />
                  ))}
                </div>
                <span className="font-mono text-[13px] font-semibold text-[#cfe9fb]">
                  {freezesRemaining} freezes
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
            </div>
          </div>

          <div className="mb-[26px] grid grid-cols-4 gap-[16px]">
            <div className="rounded-[16px] border border-white/[0.06] bg-bg-elevated p-[18px]">
              <div className="mb-[10px] text-[12px] font-semibold text-text-dim">
                Active streak
              </div>
              <div className="flex items-baseline gap-[6px]">
                <span className="font-mono text-[30px] font-extrabold text-[#f4f5f7]">
                  {dashboardMock.stats.activeStreak}
                </span>
                <span className="text-[13px] font-medium text-text-soft">
                  days
                </span>
              </div>
            </div>

            <div className="rounded-[16px] border border-white/[0.06] bg-bg-elevated p-[18px]">
              <div className="mb-[10px] text-[12px] font-semibold text-text-dim">
                Completion rate
              </div>
              <div className="flex items-baseline gap-[6px]">
                <span className="font-mono text-[30px] font-extrabold text-[#f4f5f7]">
                  {dashboardMock.stats.completionRate}
                </span>
                <span className="text-[13px] font-medium text-text-soft">%</span>
              </div>
            </div>

            <div className="rounded-[16px] border border-white/[0.06] bg-bg-elevated p-[18px]">
              <div className="mb-[10px] text-[12px] font-semibold text-text-dim">
                Total sessions
              </div>
              <div className="flex items-baseline gap-[6px]">
                <span className="font-mono text-[30px] font-extrabold text-[#f4f5f7]">
                  {dashboardMock.stats.totalSessions}
                </span>
              </div>
            </div>

            <div className="rounded-[16px] border border-white/[0.06] bg-bg-elevated p-[18px]">
              <div className="mb-[10px] text-[12px] font-semibold text-text-dim">
                Best month
              </div>
              <div className="flex items-baseline gap-[6px]">
                <span className="text-[24px] font-bold text-[#f4f5f7]">
                  {dashboardMock.stats.bestMonth}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1.5fr_1fr] gap-[24px]">
            <div>
              <div className="mb-[14px] flex items-center justify-between">
                <h2 className="m-0 text-[16px] font-bold text-[#e8e9ec]">
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

              {habitsLoading ? (
                <p className="text-[14px] text-text-muted">Loading habits…</p>
              ) : habits.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-white/[0.1] bg-bg-elevated px-5 py-8 text-center">
                  <p className="mb-3 text-[14px] text-text-muted">
                    No habits yet. Create your first one to start the loop.
                  </p>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="text-[14px] font-semibold text-[#aeb3f5] hover:text-white"
                  >
                    + Add habit
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-[16px]">
                  {habits.map((habit) => (
                    <HobbyCard
                      key={habit.id}
                      hobby={apiHabitToCard(habit)}
                      variant="desktop"
                      href={`/dashboard/habits/${habit.id}`}
                      onEdit={() => openEditModal(habit)}
                      onDelete={() => setDeletingHabit(habit)}
                    />
                  ))}
                </div>
              )}
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

        <div className="px-[22px] lg:hidden">
          <div className="flex flex-col gap-[11px] pt-[4px]">
            {habitsError ? (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-danger">
                {habitsError}
              </p>
            ) : null}

            {habitsLoading ? (
              <p className="text-[14px] text-text-muted">Loading habits…</p>
            ) : habits.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-white/[0.1] bg-bg-elevated px-5 py-8 text-center">
                <p className="mb-3 text-[14px] text-text-muted">
                  No habits yet. Tap + to create one.
                </p>
              </div>
            ) : (
              habits.map((habit) => (
                <HobbyCard
                  key={habit.id}
                  hobby={apiHabitToCard(habit)}
                  variant="mobile"
                  href={`/dashboard/habits/${habit.id}`}
                  onEdit={() => openEditModal(habit)}
                  onDelete={() => setDeletingHabit(habit)}
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
    </div>
  );
}
