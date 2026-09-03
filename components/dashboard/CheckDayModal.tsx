"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildMonthGrid,
  formatLogButtonDate,
  formatMonthTitle,
  formatSelectedDay,
  toDateKey,
} from "@/lib/checkIn";
import { habitColorWithAlpha } from "@/lib/habitDetailMock";
import { periodNoun, type HabitPeriod } from "@/lib/periodStreak";
import { SheetPortal } from "@/components/dashboard/SheetPortal";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

type CheckDayModalProps = {
  open: boolean;
  habitName: string;
  habitColor: string;
  habitId: number;
  streak?: number;
  streakUnit?: HabitPeriod;
  freezesRemaining?: number;
  /** Real completed days from API (YYYY-MM-DD). */
  loggedDateKeys?: Set<string>;
  /** YYYY-MM-DD — days before this cannot be logged. */
  createdDateKey?: string | null;
  onClose: () => void;
  onConfirm: (dateKey: string) => void;
};

export function CheckDayModal({
  open,
  habitName,
  habitColor,
  habitId: _habitId,
  streak = 0,
  streakUnit = "day",
  freezesRemaining = 3,
  loggedDateKeys,
  createdDateKey = null,
  onClose,
  onConfirm,
}: CheckDayModalProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, [open]);

  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setSelectedKey(toDateKey(today));

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, today]);

  const loggedKeys = useMemo(() => {
    if (!loggedDateKeys) return new Set<string>();

    const monthKeys = new Set<string>();
    for (const key of loggedDateKeys) {
      const [y, m] = key.split("-").map(Number);
      if (y === cursor.year && (m ?? 0) - 1 === cursor.month) {
        monthKeys.add(key);
      }
    }
    return monthKeys;
  }, [loggedDateKeys, cursor.year, cursor.month]);

  const minDateKey = createdDateKey?.slice(0, 10) ?? null;

  const canGoPrevMonth = useMemo(() => {
    if (!minDateKey) return true;
    const minYear = Number(minDateKey.slice(0, 4));
    const minMonth = Number(minDateKey.slice(5, 7)) - 1;
    return (
      cursor.year > minYear ||
      (cursor.year === minYear && cursor.month > minMonth)
    );
  }, [cursor.year, cursor.month, minDateKey]);

  const cells = useMemo(
    () =>
      buildMonthGrid({
        year: cursor.year,
        monthIndex: cursor.month,
        selectedKey,
        loggedKeys,
        minDateKey,
      }),
    [cursor.year, cursor.month, selectedKey, loggedKeys, minDateKey],
  );

  const selectedIsLocked = Boolean(
    selectedKey && minDateKey && selectedKey < minDateKey,
  );
  const selectedIsToday =
    selectedKey !== null && selectedKey === toDateKey(today);
  const selectedIsPast =
    selectedKey !== null &&
    selectedKey < toDateKey(today) &&
    !selectedIsLocked;
  const selectedIsLogged = Boolean(
    selectedKey && loggedKeys.has(selectedKey),
  );
  const canLog =
    selectedKey !== null &&
    !selectedIsLocked &&
    ((selectedIsToday && selectedIsLogged) ||
      (!selectedIsLogged &&
        (selectedIsToday || (selectedIsPast && freezesRemaining > 0))));
  const pastLockedNoFreeze =
    selectedIsPast && !selectedIsLogged && freezesRemaining < 1;
  const pastLoggedLocked = selectedIsPast && selectedIsLogged;

  const selectedLabel = selectedKey ? formatSelectedDay(selectedKey) : "—";
  const ctaLabel = selectedKey
    ? pastLoggedLocked
      ? "Already logged"
      : pastLockedNoFreeze
        ? "No freezes left"
        : selectedIsToday && selectedIsLogged
          ? `Edit ${formatLogButtonDate(selectedKey)}`
          : selectedIsToday
            ? `Log ${formatLogButtonDate(selectedKey)}`
            : `Log ${formatLogButtonDate(selectedKey)} · restores your streak`
    : "Select a day";

  function shiftMonth(delta: number) {
    setCursor((prev) => {
      const date = new Date(prev.year, prev.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  function dayStyle(status: (typeof cells)[number]["status"]) {
    switch (status) {
      case "logged":
        return {
          background: habitColorWithAlpha(habitColor, 0.9),
          border: "none",
          color: "#06283a",
        };
      case "selected":
        return {
          background: habitColorWithAlpha(habitColor, 0.16),
          border: `1.5px solid ${habitColor}`,
          color: "#e6f5fd",
        };
      case "missed":
        return {
          background: "var(--bg-muted)",
          border: "1px solid var(--border)",
          color: "var(--text-muted)",
        };
      case "locked":
        return {
          background:
            "repeating-linear-gradient(135deg, color-mix(in srgb, var(--text) 8%, transparent) 0 4px, var(--bg-muted) 4px 8px)",
          border: "1px dashed var(--border)",
          color: "var(--text-dim)",
        };
      case "future":
        return {
          background: "transparent",
          border: "none",
          color: "var(--text-dim)",
        };
      default:
        return {
          background: "transparent",
          border: "none",
          color: "transparent",
        };
    }
  }

  const calendar = (
    <>
      <div className="mb-4 flex items-center justify-between sm:mb-[18px]">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canGoPrevMonth}
          onClick={() => shiftMonth(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[20px] font-light text-text-muted transition hover:bg-bg-muted hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
        >
          ‹
        </button>
        <span className="text-[15px] font-bold text-text-body sm:text-[16px]">
          {formatMonthTitle(cursor.year, cursor.month)}
        </span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => shiftMonth(1)}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[20px] font-light text-text-muted transition hover:bg-bg-muted hover:text-text"
        >
          ›
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1.5 sm:mb-2.5 sm:gap-2">
        {DOW.map((d, idx) => (
          <div
            key={`${d}-${idx}`}
            className="text-center font-mono text-[10px] font-semibold text-text-dim sm:text-[11px]"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map((cell) => {
          const style = dayStyle(cell.status);
          const todayKey = toDateKey(today);
          const isPastMissed =
            cell.date !== null &&
            cell.status === "missed" &&
            cell.date < todayKey;
          const isPastLogged =
            cell.date !== null &&
            cell.status === "logged" &&
            cell.date < todayKey;
          const freezeLocked = isPastMissed && freezesRemaining < 1;
          const disabled =
            !cell.date ||
            cell.status === "future" ||
            cell.status === "empty" ||
            cell.status === "locked" ||
            freezeLocked ||
            isPastLogged;

          return (
            <button
              key={cell.key}
              type="button"
              disabled={disabled}
              title={
                cell.status === "locked"
                  ? "Locked · before this habit existed"
                  : isPastLogged
                    ? "Past check-ins can’t be changed"
                    : freezeLocked
                      ? "No freezes left · past days locked"
                      : undefined
              }
              onClick={() => {
                if (cell.date) setSelectedKey(cell.date);
              }}
              className="relative aspect-square rounded-[9px] sm:rounded-[11px] disabled:cursor-not-allowed"
              style={{
                background: style.background,
                border: style.border,
                color: style.color,
              }}
            >
              {cell.status === "locked" ? (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="text-text-dim"
                  >
                    <path
                      d="M7 11V8a5 5 0 0 1 10 0v3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <rect
                      x="5"
                      y="11"
                      width="14"
                      height="10"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  <span className="text-[9px] font-semibold leading-none sm:text-[10px]">
                    {cell.day}
                  </span>
                </span>
              ) : (
                cell.day ?? ""
              )}
            </button>
          );
        })}
      </div>
    </>
  );

  const legend = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-2">
        <div
          className="h-[11px] w-[11px] rounded-[3px] sm:h-[15px] sm:w-[15px] sm:rounded"
          style={{ background: habitColor }}
        />
        <span className="font-mono text-[11px] text-text-muted sm:font-sans sm:text-[12.5px] sm:text-text-soft">
          Logged
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-[11px] w-[11px] rounded-[3px] border border-border bg-bg-muted sm:h-[15px] sm:w-[15px] sm:rounded" />
        <span className="font-mono text-[11px] text-text-muted sm:font-sans sm:text-[12.5px] sm:text-text-soft">
          Missed
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="h-[11px] w-[11px] rounded-[3px] sm:h-[15px] sm:w-[15px] sm:rounded"
          style={{
            background:
              "repeating-linear-gradient(135deg, color-mix(in srgb, var(--text) 10%, transparent) 0 3px, var(--bg-muted) 3px 6px)",
            border: "1px dashed var(--border)",
          }}
        />
        <span className="font-mono text-[11px] text-text-muted sm:font-sans sm:text-[12.5px] sm:text-text-soft">
          Locked
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="h-[11px] w-[11px] rounded-[3px] sm:h-[15px] sm:w-[15px] sm:rounded"
          style={{
            background: habitColorWithAlpha(habitColor, 0.16),
            border: `1.5px solid ${habitColor}`,
          }}
        />
        <span className="font-mono text-[11px] text-text-muted sm:font-sans sm:text-[12.5px] sm:text-text-soft">
          Selected
        </span>
      </div>
    </div>
  );

  const selectedCard = (
    <div
      className="rounded-2xl border px-4 py-4"
      style={{
        background: "var(--bg-elevated)",
        borderColor: habitColorWithAlpha(habitColor, 0.3),
      }}
    >
      <div
        className="mb-1 font-mono text-[11px] font-medium tracking-wide"
        style={{ color: habitColorWithAlpha(habitColor, 0.85) }}
      >
        SELECTED
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[16px] font-bold text-text-body sm:text-[17px]">
          {selectedLabel}
        </div>
        {selectedIsPast ? (
          <div className="inline-flex items-center gap-1.5 rounded-[10px] border border-[rgba(251,113,133,0.35)] bg-[rgba(251,113,133,0.12)] px-3 py-2 text-[11.5px] font-semibold text-[#fb7185]">
            −1 freeze token
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <SheetPortal open={open}>
      <div className="check-day-modal fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-[rgba(8,9,11,0.62)]"
          onClick={onClose}
        />

        {/* Mobile */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="check-day-title-mobile"
          className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-b-0 border-border bg-bg shadow-[0_-20px_50px_-10px_rgba(0,0,0,0.6)] sm:hidden"
        >
          <div className="flex items-center gap-3 px-[22px] pb-3 pt-4">
            <button
              type="button"
              aria-label="Back"
              onClick={onClose}
              className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] border border-border bg-bg-elevated text-[15px] font-semibold text-text-soft"
            >
              ←
            </button>
            <div className="min-w-0">
              <h2
                id="check-day-title-mobile"
                className="m-0 text-[20px] font-extrabold tracking-[-0.02em] text-text"
              >
                Check a day
              </h2>
              <p className="m-0 font-mono text-[11.5px] font-medium text-text-dim">
                {habitName} · backfill a missed day
              </p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-[22px] pb-4">
            <div className="rounded-[20px] border border-border-soft bg-bg-elevated px-4 py-5">
              {calendar}
            </div>
            <div className="mx-1 mb-5 mt-4">{legend}</div>
            {selectedCard}
            {selectedIsPast ? (
              <p className="mt-3 text-[12px] font-medium leading-relaxed text-text-muted">
                {freezesRemaining < 1
                  ? "No freezes left — past days stay locked. You can still log today."
                  : `Logging a past day spends a freeze to keep your ${streak}-${periodNoun(streakUnit, streak)} streak unbroken. ${freezesRemaining} left after this.`}
              </p>
            ) : null}
          </div>

          <div className="flex-none space-y-2.5 border-t border-border-soft bg-bg px-[22px] pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
            <button
              type="button"
              disabled={!canLog}
              onClick={() => {
                if (selectedKey && canLog) onConfirm(selectedKey);
              }}
              className="w-full rounded-[14px] py-4 text-center text-[15px] font-bold disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: `linear-gradient(180deg,${habitColorWithAlpha(habitColor, 0.95)},${habitColorWithAlpha(habitColor, 0.7)})`,
                color: "#06283a",
                boxShadow: `0 8px 22px -6px ${habitColorWithAlpha(habitColor, 0.55)}, inset 0 1px 0 rgba(255,255,255,0.3)`,
              }}
            >
              {ctaLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-[14px] border border-border bg-bg-muted py-3.5 text-center text-[14px] font-semibold text-text-soft"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Desktop */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="check-day-title-desktop"
          className="relative z-10 hidden w-full max-w-[840px] overflow-hidden rounded-[22px] border border-border bg-bg-elevated shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)] sm:flex"
        >
          <div className="min-w-0 flex-1 px-7 py-[26px]">
            <div className="mb-[22px] flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="h-2.5 w-2.5 rounded-[3px]"
                  style={{
                    background: habitColor,
                    boxShadow: `0 0 12px ${habitColor}`,
                  }}
                />
                <div>
                  <h2
                    id="check-day-title-desktop"
                    className="m-0 mb-[3px] text-[22px] font-extrabold tracking-[-0.02em] text-text"
                  >
                    Check a day
                  </h2>
                  <p className="m-0 font-mono text-[13px] font-medium text-text-dim">
                    {habitName} · backfill a missed day
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] border border-border bg-bg-muted text-[16px] text-text-soft transition hover:text-text"
              >
                ×
              </button>
            </div>
            {calendar}
          </div>

          <aside className="flex w-[288px] flex-none flex-col border-l border-border-soft bg-bg-sidebar px-6 py-[26px]">
            <div className="mb-4 font-mono text-[11px] font-semibold tracking-[0.1em] text-text-dim">
              LEGEND
            </div>
            <div className="mb-6 flex flex-col gap-3">{legend}</div>
            {selectedCard}
            <p className="mt-3.5 text-[12px] font-medium leading-relaxed text-text-muted">
              {freezesRemaining < 1
                ? "No freezes left — past days stay locked. You can still log today."
                : `Logging a past day spends a freeze to keep your ${streak}-${periodNoun(streakUnit, streak)} streak unbroken.`}
            </p>

            <div className="mt-auto flex flex-col gap-2.5 pt-[22px]">
              <button
                type="button"
                disabled={!canLog}
                onClick={() => {
                  if (selectedKey && canLog) onConfirm(selectedKey);
                }}
                className="rounded-[13px] py-3.5 text-center text-[15px] font-bold disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: `linear-gradient(180deg,${habitColorWithAlpha(habitColor, 0.95)},${habitColorWithAlpha(habitColor, 0.7)})`,
                  color: "#06283a",
                  boxShadow: `0 8px 22px -6px ${habitColorWithAlpha(habitColor, 0.55)}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                }}
              >
                {ctaLabel}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-[13px] py-3 text-center text-[14px] font-semibold text-text-soft transition hover:text-text"
              >
                Cancel
              </button>
            </div>
          </aside>
        </div>
      </div>
    </SheetPortal>
  );
}
