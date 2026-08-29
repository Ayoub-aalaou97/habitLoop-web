"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckInDraft,
  formatCheckInWhen,
  formatLogButtonDate,
  MOODS,
  toDateKey,
} from "@/lib/checkIn";
import { habitColorWithAlpha } from "@/lib/habitDetailMock";
import { periodNoun, type HabitPeriod } from "@/lib/periodStreak";
import { SheetPortal } from "@/components/dashboard/SheetPortal";

export type CheckInHabitOption = {
  id: number;
  name: string;
  color: string;
};

type LogSessionModalProps = {
  open: boolean;
  habits: CheckInHabitOption[];
  initialHabitId?: number | null;
  initialDateKey?: string | null;
  initialMood?: number | null;
  initialNote?: string | null;
  mode?: "create" | "edit";
  streakByHabitId?: Record<number, number>;
  streakUnitByHabitId?: Record<number, HabitPeriod>;
  freezesRemaining?: number;
  onClose: () => void;
  onSubmit?: (draft: CheckInDraft) => void | Promise<void>;
  onRemove?: () => void | Promise<void>;
};

export function LogSessionModal({
  open,
  habits,
  initialHabitId = null,
  initialDateKey = null,
  initialMood = null,
  initialNote = null,
  mode = "create",
  streakByHabitId = {},
  streakUnitByHabitId = {},
  freezesRemaining = 3,
  onClose,
  onSubmit,
  onRemove,
}: LogSessionModalProps) {
  const todayKey = toDateKey(new Date());
  const [habitId, setHabitId] = useState<number | null>(null);
  const [dateKey, setDateKey] = useState(todayKey);
  const [mood, setMood] = useState(4);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = mode === "edit";
  const busy = loading || removing;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    if (!open) return;

    const fallbackId = habits[0]?.id ?? null;
    setHabitId(initialHabitId ?? fallbackId);
    setDateKey(initialDateKey ?? todayKey);
    setMood(initialMood ?? 4);
    setNote(initialNote ?? "");
    setLoading(false);
    setRemoving(false);
    setError(null);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyRef.current) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    open,
    habits,
    initialHabitId,
    initialDateKey,
    initialMood,
    initialNote,
    todayKey,
    onClose,
  ]);

  const selectedHabit = useMemo(
    () => habits.find((h) => h.id === habitId) ?? null,
    [habits, habitId],
  );

  const color = selectedHabit?.color ?? "#38bdf8";
  const streak = selectedHabit ? (streakByHabitId[selectedHabit.id] ?? 0) : 0;
  const streakUnit: HabitPeriod = selectedHabit
    ? (streakUnitByHabitId[selectedHabit.id] ?? "day")
    : "day";
  const streakUnitLabel = periodNoun(streakUnit, streak);
  const isBackfill = dateKey < todayKey;
  const moodLabel = MOODS.find((m) => m.n === mood)?.label ?? "";

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!habitId || !selectedHabit) {
      setError("Pick a habit to log.");
      return;
    }
    if (!isEdit && isBackfill && freezesRemaining < 1) {
      setError("No streak freezes left. You can only log today.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit?.({
        habitId,
        date: dateKey,
        mood,
        note: note.trim(),
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEdit
            ? "Could not update check-in."
            : "Could not log session.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    if (!onRemove) return;

    setRemoving(true);
    setError(null);

    try {
      await onRemove();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not remove check-in.",
      );
    } finally {
      setRemoving(false);
    }
  }

  const whenLabel = formatCheckInWhen(dateKey);
  const title = selectedHabit
    ? isEdit
      ? `Edit ${selectedHabit.name}`
      : `Log ${selectedHabit.name}`
    : isEdit
      ? "Edit check-in"
      : "Log a session";
  const mobileTitle = isEdit ? "Edit check-in" : "Log a session";
  const submitLabel = (() => {
    if (loading) return "Saving…";
    if (isEdit) return "Save changes";
    if (isBackfill) return `Log session for ${formatLogButtonDate(dateKey)}`;
    return `Log session · keeps your ${streak}-${streakUnitLabel} streak`;
  })();

  function moodButtonStyle(n: number) {
    // Scale fill by mood level so 5 is strongest and 1 is lightest.
    const fillAlpha = 0.12 + (n - 1) * 0.2; // 1→0.12 … 5→0.92
    const isSelected = n === mood;

    if (isSelected) {
      return {
        background:
          n >= 5
            ? `linear-gradient(160deg,${habitColorWithAlpha(color, 1)},${color})`
            : `linear-gradient(160deg,${habitColorWithAlpha(color, Math.min(1, fillAlpha + 0.18))},${habitColorWithAlpha(color, Math.min(1, fillAlpha + 0.08))})`,
        color: n >= 4 ? "#06283a" : habitColorWithAlpha(color, 0.95),
        boxShadow: `0 0 0 2px ${color}, 0 6px 16px -4px ${habitColorWithAlpha(color, 0.55)}`,
        border: "none",
      };
    }

    return {
      background: habitColorWithAlpha(color, fillAlpha),
      color: n >= 4 ? "#06283a" : habitColorWithAlpha(color, 0.9),
      border: "1px solid transparent",
      boxShadow: "none",
    };
  }

  return (
    <SheetPortal open={open}>
      <div className="log-session-modal fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-[rgba(8,9,11,0.62)]"
          disabled={busy}
          onClick={() => {
            if (!busy) onClose();
          }}
        />

        <form
          onSubmit={(e) => void handleSubmit(e)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="log-session-title"
          className="relative z-10 flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[28px] border border-white/[0.09] bg-[#13151a] shadow-[0_-20px_50px_-10px_rgba(0,0,0,0.6)] sm:rounded-[22px] sm:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)]"
        >
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5 pt-3.5 sm:px-[30px] sm:pb-7 sm:pt-[26px]">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#3a3e48] sm:hidden" />

          <div className="mb-5 flex items-start justify-between gap-3 sm:mb-[22px]">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="hidden h-2.5 w-2.5 flex-none rounded-[3px] sm:block"
                style={{
                  background: color,
                  boxShadow: `0 0 12px ${color}`,
                }}
              />
              <div className="min-w-0">
                <h2
                  id="log-session-title"
                  className="m-0 mb-1 text-[22px] font-extrabold tracking-[-0.02em] text-[#f4f5f7]"
                >
                  <span className="sm:hidden">{mobileTitle}</span>
                  <span className="hidden sm:inline">{title}</span>
                </h2>
                <p
                  className="m-0 font-mono text-[13px] font-medium"
                  style={{
                    color: isBackfill
                      ? habitColorWithAlpha(color, 0.85)
                      : "#6b7280",
                  }}
                >
                  {whenLabel}
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Close"
              disabled={busy}
              onClick={onClose}
              className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] border border-white/[0.07] bg-[#1b1e25] text-[16px] text-[#9aa0ab] transition hover:text-white disabled:opacity-50"
            >
              ×
            </button>
          </div>

          {habits.length > 1 ? (
            <>
              <div className="mb-2.5 text-[12px] font-semibold text-[#9aa0ab]">
                Which hobby?
              </div>
              <div className="mb-[22px] flex flex-wrap gap-2">
                {habits.map((habit) => {
                  const active = habit.id === habitId;
                  return (
                    <button
                      key={habit.id}
                      type="button"
                      onClick={() => setHabitId(habit.id)}
                      className="inline-flex items-center gap-[7px] rounded-[11px] border px-3.5 py-[9px] text-[13px] font-semibold transition"
                      style={
                        active
                          ? {
                              background: habitColorWithAlpha(habit.color, 0.15),
                              borderColor: habitColorWithAlpha(habit.color, 0.5),
                              color: "#cfe9fb",
                            }
                          : {
                              background: "#1b1e25",
                              borderColor: "rgba(255,255,255,0.07)",
                              color: "#9aa0ab",
                            }
                      }
                    >
                      <span
                        className="h-2 w-2 rounded-[2px]"
                        style={{ background: habit.color }}
                      />
                      {habit.name}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          <div className="mb-2.5 flex items-center justify-between gap-3">
            <span className="text-[12px] font-semibold text-[#9aa0ab] sm:text-[12.5px]">
              How did it feel?
            </span>
            <span
              className="text-[12px] font-semibold sm:text-[12.5px]"
              style={{ color: habitColorWithAlpha(color, 0.9) }}
            >
              {moodLabel}
            </span>
          </div>

          <div className="mb-[22px] flex gap-2.5 sm:mb-6 sm:gap-[11px]">
            {MOODS.map((item) => {
              const style = moodButtonStyle(item.n);
              return (
                <button
                  key={item.n}
                  type="button"
                  onClick={() => setMood(item.n)}
                  className="flex flex-1 aspect-square flex-col items-center justify-center gap-1.5 rounded-[13px] sm:rounded-[14px]"
                  style={style}
                >
                  <span className="font-mono text-[16px] font-bold sm:text-[18px]">
                    {item.n}
                  </span>
                  <span className="hidden text-[10px] font-medium sm:inline">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mb-2.5 text-[12px] font-semibold text-[#9aa0ab] sm:mb-[11px] sm:text-[12.5px]">
            Add a note
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="How did the session go?"
            className="mb-5 w-full resize-none rounded-[13px] border border-white/[0.08] bg-[#1b1e25] px-4 py-3.5 text-[14px] font-medium leading-relaxed text-[#cfd2d8] outline-none placeholder:text-[#5b6070] focus:border-white/[0.16] sm:mb-5"
          />

          {isBackfill && !isEdit ? (
            <div className="mb-5 flex items-start gap-3 rounded-[13px] border border-[rgba(251,113,133,0.28)] bg-[rgba(251,113,133,0.09)] px-4 py-3.5">
              <div className="mt-0.5 flex gap-[3px]">
                <div className="h-[13px] w-[10px] rounded-[3px] bg-gradient-to-b from-[#7dd3fc] to-[#38bdf8]" />
              </div>
              <p className="m-0 text-[12.5px] font-medium leading-snug text-[#f6a9b6]">
                {freezesRemaining < 1
                  ? "No freezes left — you can’t log past days. Log today instead."
                  : (
                    <>
                      Logging {formatLogButtonDate(dateKey)} spends{" "}
                      <span className="font-bold text-[#fb7185]">1 freeze token</span>{" "}
                      — your {streak}-{streakUnitLabel} streak stays intact.{" "}
                      {Math.max(0, freezesRemaining - 1)} left after this.
                    </>
                  )}
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-[#f87171]">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-none flex-col gap-2.5 border-t border-white/[0.06] bg-[#0e1014] px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:px-[30px] sm:pb-4">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button
              type="submit"
              disabled={
                busy ||
                !habitId ||
                (!isEdit && isBackfill && freezesRemaining < 1)
              }
              className="order-1 w-full flex-1 rounded-[14px] py-4 text-center text-[15px] font-bold disabled:opacity-50 sm:order-2 sm:py-[15px]"
              style={{
                background: `linear-gradient(180deg,${habitColorWithAlpha(color, 0.95)},${habitColorWithAlpha(color, 0.7)})`,
                color: "#06283a",
                boxShadow: `0 8px 22px -6px ${habitColorWithAlpha(color, 0.55)}, inset 0 1px 0 rgba(255,255,255,0.3)`,
              }}
            >
              {submitLabel}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="order-2 w-full rounded-[14px] border border-white/[0.07] bg-[#1b1e25] py-3.5 text-[14px] font-semibold text-[#9aa0ab] transition hover:text-white disabled:opacity-50 sm:order-1 sm:w-auto sm:flex-none sm:px-6 sm:py-[15px]"
            >
              Cancel
            </button>
          </div>
          {isEdit && onRemove && !isBackfill ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void handleRemove();
              }}
              className="w-full rounded-[14px] border border-[#f87171]/25 bg-[#f87171]/10 py-3 text-[13px] font-semibold text-[#f87171] transition hover:bg-[#f87171]/15 disabled:opacity-50"
            >
              {removing ? "Removing…" : "Remove check-in"}
            </button>
          ) : null}
        </div>
      </form>
      </div>
    </SheetPortal>
  );
}

export function isSameCalendarDay(a: string, b: Date = new Date()) {
  return a === toDateKey(b);
}
