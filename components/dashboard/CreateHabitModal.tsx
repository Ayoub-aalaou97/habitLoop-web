"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { SheetPortal } from "@/components/dashboard/SheetPortal";

const ACCENT_COLORS = [
  "#38bdf8",
  "#a78bfa",
  "#34d399",
  "#fb923c",
  "#f472b6",
  "#facc15",
  "#f87171",
  "#818cf8",
] as const;

type Frequency = "daily" | "weekly" | "monthly";

export type CreateHabitDraft = {
  name: string;
  frage: string; // optional reminder question, e.g. "Did you read today?"
  color: string;
  frequency: Frequency;
  times: number;
  reminderEnabled: boolean;
  reminderTime: string;
};

type CreateHabitModalProps = {
  open: boolean;
  onClose: () => void;
  mode?: "create" | "edit";
  initialValues?: CreateHabitDraft | null;
  onCreate?: (draft: CreateHabitDraft) => void | Promise<void>;
};

function goalLabel(frequency: Frequency, times: number) {
  if (frequency === "daily") return "Daily";
  if (frequency === "weekly") return `${times}× / week`;
  return `${times}× / month`;
}

function timesUnit(frequency: Frequency) {
  if (frequency === "daily") return "Times per day";
  if (frequency === "weekly") return "Times per week";
  return "Times per month";
}

function emptyMini(color: string) {
  const hex = color.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const off = `rgba(${r},${g},${b},0.08)`;
  return Array.from({ length: 7 }, () => off);
}

export function CreateHabitModal({
  open,
  onClose,
  mode = "create",
  initialValues = null,
  onCreate,
}: CreateHabitModalProps) {
  const [name, setName] = useState("Reading");
  const [frage, setFrage] = useState("");
  const [color, setColor] = useState<string>(ACCENT_COLORS[4]);
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [times, setTimes] = useState(4);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState("8:00 PM");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;

    if (initialValues) {
      setName(initialValues.name);
      setFrage(initialValues.frage);
      setColor(initialValues.color);
      setFrequency(initialValues.frequency);
      setTimes(initialValues.times);
      setReminderEnabled(initialValues.reminderEnabled);
      setReminderTime(initialValues.reminderTime || "8:00 PM");
    } else {
      setName("Reading");
      setFrage("");
      setColor(ACCENT_COLORS[4]);
      setFrequency("weekly");
      setTimes(4);
      setReminderEnabled(true);
      setReminderTime("8:00 PM");
    }

    setLoading(false);
    setError(null);
  }, [open, initialValues]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const mini = useMemo(() => emptyMini(color), [color]);
  const label = goalLabel(frequency, times);
  const canCreate = name.trim().length > 0 && !loading;

  function selectFrequency(next: Frequency) {
    setFrequency(next);
    if (next === "daily") setTimes(1);
    else if (next === "weekly") setTimes(4);
    else setTimes(2);
  }

  async function submitDraft() {
    if (!canCreate) return;

    const draft: CreateHabitDraft = {
      name: name.trim(),
      frage: frage.trim(),
      color,
      frequency,
      times,
      reminderEnabled,
      reminderTime,
    };

    setError(null);
    setLoading(true);

    try {
      await onCreate?.(draft);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEdit
            ? "Could not update habit."
            : "Could not create habit.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submitDraft();
  }

  const title = isEdit ? "Edit habit" : "New habit";
  const subtitle = isEdit
    ? "Update this hobby on your loop"
    : "Add a hobby to your loop";
  const submitLabel = loading
    ? isEdit
      ? "Saving…"
      : "Creating…"
    : isEdit
      ? "Save changes"
      : "Create habit";

  return (
    <SheetPortal open={open}>
    <div className="create-habit-modal fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close modal backdrop"
        className="absolute inset-0 bg-[rgba(8,9,11,0.62)]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-habit-title"
        className="relative z-10 flex max-h-[92dvh] w-full max-w-[840px] flex-col overflow-hidden rounded-t-[22px] border border-white/[0.09] bg-[#13151a] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)] sm:mx-4 sm:max-h-[85dvh] sm:flex-row sm:rounded-[22px]"
      >
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <div className="mb-5 flex items-start justify-between gap-3 sm:mb-[22px]">
            <div>
              <h2
                id="create-habit-title"
                className="m-0 mb-1 text-[22px] font-extrabold tracking-[-0.02em] text-[#f4f5f7]"
              >
                {title}
              </h2>
              <p className="m-0 font-mono text-[13px] font-medium text-[#6b7280]">
                {subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] border border-white/[0.07] bg-[#1b1e25] text-[16px] text-[#9aa0ab] transition hover:text-white"
            >
              ×
            </button>
          </div>

          <label
            htmlFor="habit-name"
            className="mb-[9px] block text-[12px] font-semibold text-[#9aa0ab]"
          >
            Name
          </label>
          <input
            id="habit-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Reading"
            className="mb-4 w-full rounded-xl border bg-[#1b1e25] px-[15px] py-[13px] text-[15px] font-semibold text-[#eceef1] outline-none placeholder:text-[#5b6070] sm:mb-[16px]"
            style={{
              borderColor: `${color}80`,
              boxShadow: `0 0 0 3px ${color}1f`,
            }}
          />

          <div className="mb-[9px] flex items-center justify-between">
            <label
              htmlFor="habit-frage"
              className="block text-[12px] font-semibold text-[#9aa0ab]"
            >
              Frage
            </label>
            <span className="text-[11px] font-medium text-[#5b6070]">
              optional
            </span>
          </div>
          <input
            id="habit-frage"
            type="text"
            value={frage}
            onChange={(e) => setFrage(e.target.value)}
            placeholder="Did you read today?"
            className="mb-5 w-full rounded-xl border border-white/[0.08] bg-[#1b1e25] px-[15px] py-[13px] text-[15px] font-medium text-[#eceef1] outline-none placeholder:text-[#5b6070] focus:border-white/[0.16] sm:mb-[20px]"
          />
          <p className="-mt-3 mb-5 text-[11.5px] font-medium leading-snug text-[#6b7280] sm:-mt-3 sm:mb-[18px]">
            Used in reminders, e.g. “Did you read today?”
          </p>

          <label className="mb-[11px] block text-[12px] font-semibold text-[#9aa0ab]">
            Accent color
          </label>
          <div className="mb-5 flex flex-wrap gap-[11px] sm:mb-[22px]">
            {ACCENT_COLORS.map((c) => {
              const selected = c === color;
              return (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  onClick={() => setColor(c)}
                  className="h-[30px] w-[30px] rounded-[9px] transition"
                  style={{
                    background: c,
                    boxShadow: selected
                      ? `0 0 0 2px #13151a, 0 0 0 4px ${c}`
                      : undefined,
                  }}
                />
              );
            })}
          </div>

          <label className="mb-[11px] block text-[12px] font-semibold text-[#9aa0ab]">
            Goal frequency
          </label>
          <div className="mb-3.5 flex gap-1.5 rounded-xl border border-white/[0.06] bg-[#1b1e25] p-[5px]">
            {(
              [
                ["daily", "Daily"],
                ["weekly", "Weekly"],
                ["monthly", "Monthly"],
              ] as const
            ).map(([value, text]) => {
              const active = frequency === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectFrequency(value)}
                  className={`flex-1 rounded-lg py-[9px] text-center text-[13px] font-semibold transition ${
                    active
                      ? "bg-[#2a2e37] text-[#f2f3f5] shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
                      : "text-[#9aa0ab] hover:text-[#d5d7de]"
                  }`}
                >
                  {text}
                </button>
              );
            })}
          </div>

          <div className="mb-5 flex items-center justify-between rounded-xl bg-[#1b1e25] px-4 py-3 sm:mb-[22px]">
            <span className="text-[13px] font-semibold text-[#9aa0ab]">
              {timesUnit(frequency)}
            </span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label="Decrease"
                disabled={times <= 1}
                onClick={() => setTimes((t) => Math.max(1, t - 1))}
                className="text-[20px] font-light text-[#5b6070] transition enabled:hover:text-[#c9b0e8] disabled:opacity-40"
              >
                −
              </button>
              <span className="min-w-[1.5ch] text-center font-mono text-[16px] font-bold text-[#eceef1]">
                {times}
              </span>
              <button
                type="button"
                aria-label="Increase"
                disabled={times >= 14}
                onClick={() => setTimes((t) => Math.min(14, t + 1))}
                className="text-[20px] font-light transition disabled:opacity-40"
                style={{ color: color }}
              >
                +
              </button>
            </div>
          </div>

          <div className="mb-5 flex items-center justify-between rounded-xl bg-[#1b1e25] px-4 py-3.5 sm:mb-0">
            <div>
              <div className="mb-0.5 text-[13.5px] font-bold text-[#eceef1]">
                Set a reminder
              </div>
              <div className="font-mono text-[11.5px] font-medium text-[#777c8a]">
                Nudge me at {reminderTime}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={reminderEnabled}
              onClick={() => setReminderEnabled((v) => !v)}
              className="relative h-[25px] w-[42px] flex-none rounded-[13px] transition"
              style={{
                background: reminderEnabled ? color : "#23262f",
              }}
            >
              <span
                className={`absolute top-[2.5px] h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-[left] ${
                  reminderEnabled ? "left-[19.5px]" : "left-[2.5px]"
                }`}
              />
            </button>
          </div>

          {/* Mobile actions stay pinned under the form */}
          </div>
          <div className="flex flex-col gap-2.5 border-t border-white/[0.06] bg-[#0e1014] px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:hidden">
            {error ? (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-danger">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!canCreate}
              className="rounded-[13px] py-3.5 text-center text-[15px] font-bold disabled:opacity-50"
              style={{
                background: `linear-gradient(180deg, ${color}, ${color}cc)`,
                color: "#2a0a1c",
                boxShadow: `0 8px 22px -6px ${color}8c, inset 0 1px 0 rgba(255,255,255,0.28)`,
              }}
            >
              {submitLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-[13px] py-3 text-center text-[14px] font-semibold text-[#9aa0ab] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Live preview — desktop */}
        <aside className="hidden w-[288px] flex-none flex-col border-l border-white/[0.06] bg-[#0e1014] px-6 py-6 sm:flex">
          <div className="mb-4 font-mono text-[11px] font-semibold tracking-[0.1em] text-[#6b7280]">
            LIVE PREVIEW
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#15171c] p-[18px]">
            <div className="mb-3.5 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className="h-[11px] w-[11px] flex-none rounded-[3px]"
                  style={{
                    background: color,
                    boxShadow: `0 0 12px ${color}`,
                  }}
                />
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-bold text-[#eceef1]">
                    {name.trim() || "New habit"}
                  </div>
                  <div className="text-[11.5px] font-medium text-[#777c8a]">
                    {label}
                  </div>
                </div>
              </div>
              <span className="text-[16px] font-bold tracking-[1px] text-[#4b5060]">
                ···
              </span>
            </div>

            <div className="mb-3.5 flex items-baseline gap-1.5">
              <span
                className="font-mono text-[26px] font-bold"
                style={{ color }}
              >
                0
              </span>
              <span className="text-[12px] font-semibold text-[#8a8f9c]">
                day streak
              </span>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11.5px] font-medium text-[#777c8a]">
                this week
              </span>
              <div className="flex gap-[5px]">
                {Array.from({
                  length: frequency === "daily" ? 7 : Math.min(times, 7),
                }).map((_, idx) => (
                  <div
                    key={`dot-${idx}`}
                    className="h-[9px] w-[9px] rounded-full border-[1.5px] border-[#34384280]"
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {mini.map((cell, idx) => (
                <div
                  key={`c-${idx}`}
                  className="h-7 w-full rounded-[6px]"
                  style={{ background: cell }}
                />
              ))}
            </div>
          </div>

          <p className="mt-4 text-[12px] font-medium leading-relaxed text-[#777c8a]">
            Your week starts empty. Each day fills in as you check in.
          </p>

          <div className="mt-auto flex flex-col gap-2.5 pt-[22px]">
            {error ? (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-danger">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              disabled={!canCreate}
              onClick={() => {
                void submitDraft();
              }}
              className="rounded-[13px] py-3.5 text-center text-[15px] font-bold disabled:opacity-50"
              style={{
                background: `linear-gradient(180deg, ${color}, ${color}cc)`,
                color: "#2a0a1c",
                boxShadow: `0 8px 22px -6px ${color}8c, inset 0 1px 0 rgba(255,255,255,0.28)`,
              }}
            >
              {submitLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-[13px] py-3 text-center text-[14px] font-semibold text-[#9aa0ab] transition hover:text-[#d5d7de] disabled:opacity-50"
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
