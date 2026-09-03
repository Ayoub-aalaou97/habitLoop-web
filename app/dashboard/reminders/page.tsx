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
import {
  buildReminderRows,
  buildUpNext,
  DAY_LABELS,
  formatDaysSubtitle,
  hexToRgb,
  readChannels,
  readGeneral,
  ReminderChannel,
  ReminderGeneral,
  ReminderRow,
  shiftReminderTime,
  updateHabitReminderTime,
  writeChannels,
  writeDaysMap,
  writeGeneral,
} from "@/lib/reminders";
import { PageLoader } from "@/components/LoadingSpinner";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { MobileNavSpacer } from "@/components/dashboard/MobileNavSpacer";
import { ThemeToggle } from "@/components/ThemeToggle";

function Toggle({
  on,
  color,
  onClick,
  ariaLabel,
}: {
  on: boolean;
  color?: string;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={onClick}
      className="relative h-[25px] w-[42px] flex-none rounded-[13px] transition"
      style={{
        background: on ? (color ?? "#6f7bff") : "var(--toggle-off)",
        boxShadow: on
          ? "inset 0 1px 2px rgba(0,0,0,0.2)"
          : "inset 0 1px 2px rgba(15,18,26,0.06)",
      }}
    >
      <span
        className="absolute top-[2.5px] h-5 w-5 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-[left,background]"
        style={{
          left: on ? 19.5 : 2.5,
          background: on ? "#fff" : "var(--text-dim)",
        }}
      />
    </button>
  );
}

function DayChip({
  label,
  active,
  color,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  color: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const rgb = hexToRgb(color);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 flex-1 items-center justify-center rounded-[9px] text-[12.5px] font-semibold transition disabled:opacity-40 sm:h-9"
      style={
        active
          ? {
              background: `rgba(${rgb.r},${rgb.g},${rgb.b},0.18)`,
              border: `1px solid rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`,
              color,
            }
          : {
              background: "var(--bg-muted)",
              border: "1px solid transparent",
              color: "var(--text-dim)",
            }
      }
    >
      {label}
    </button>
  );
}

export default function RemindersPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [habits, setHabits] = useState<ApiHabit[]>([]);
  const [rows, setRows] = useState<ReminderRow[]>([]);
  const [general, setGeneral] = useState<ReminderGeneral>(readGeneral());
  const [channels, setChannels] = useState<ReminderChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchHabits();
      setHabits(next);
      setRows(buildReminderRows(next));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load reminders.",
      );
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
        setChannels(
          readChannels(
            currentUser.email ? currentUser.email : "your email",
          ),
        );
        setGeneral(readGeneral());
        return load();
      })
      .catch(() => {
        clearToken();
        setError("Your session expired. Please log in again.");
        setLoading(false);
      });
  }, [router, load]);

  const activeCount = rows.filter((row) => row.enabled).length;
  const upNext = useMemo(() => buildUpNext(rows), [rows]);
  const subtitle = `${activeCount} of ${rows.length} hobbies will nudge you · quiet hours respected`;

  function patchRow(habitId: number, patch: Partial<ReminderRow>) {
    setRows((prev) =>
      prev.map((row) =>
        row.habitId === habitId ? { ...row, ...patch, dirty: true } : row,
      ),
    );
    setSaveMessage(null);
  }

  function toggleDay(habitId: number, dayIndex: number) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.habitId !== habitId || !row.enabled) return row;
        const days = row.days.map((on, i) => (i === dayIndex ? !on : on));
        return { ...row, days, dirty: true };
      }),
    );
    setSaveMessage(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const daysMap: Record<string, boolean[]> = {};
      const updatedHabits = [...habits];

      for (const row of rows) {
        daysMap[String(row.habitId)] = row.days;
        if (!row.dirty) continue;

        const updated = await updateHabitReminderTime(
          row.habitId,
          row.enabled ? row.time : null,
        );
        const idx = updatedHabits.findIndex((h) => h.id === row.habitId);
        if (idx >= 0) updatedHabits[idx] = updated;
      }

      writeDaysMap(daysMap);
      writeGeneral(general);
      writeChannels(channels);
      setHabits(updatedHabits);
      setRows(buildReminderRows(updatedHabits).map((row) => {
        const local = rows.find((r) => r.habitId === row.habitId);
        return local
          ? { ...row, days: local.days, dirty: false }
          : { ...row, dirty: false };
      }));
      setSaveMessage("Reminders saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save reminders.");
    } finally {
      setSaving(false);
    }
  }

  function handleTest() {
    const next = upNext[0];
    setSaveMessage(
      next
        ? `Test nudge queued for ${next.name} (${next.time}).`
        : "Enable a reminder to send a test nudge.",
    );
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
    return <PageLoader label="Loading reminders…" />;
  }

  const displayName = `${user.first_name} ${user.last_name}`;

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar
        userName={displayName}
        userPlanLabel="Free plan"
        onLogout={logout}
        quietHoursLabel={
          general.quietHours ? "10:00 PM – 7:00 AM" : undefined
        }
      />

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-border-soft bg-bg/95 px-[18px] py-3 backdrop-blur-md sm:hidden">
          <div>
            <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.025em] text-text">
              Reminders
            </h1>
            <p className="m-0 mt-1 font-mono text-[11px] font-medium text-text-dim">
              {activeCount} of {rows.length} active
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
          {saveMessage ? (
            <p className="mb-4 rounded-lg border border-[#6f7bff]/25 bg-[#6f7bff]/10 px-3 py-2 text-[13px] text-brand-soft">
              {saveMessage}
            </p>
          ) : null}

          <div className="mb-5 hidden items-start justify-between gap-4 sm:mb-6 sm:flex">
            <div>
              <h1 className="m-0 mb-1 text-[27px] font-extrabold tracking-[-0.025em] text-text">
                Reminders
              </h1>
              <p className="m-0 font-mono text-[13px] font-medium text-text-dim">
                {subtitle}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleTest}
                className="rounded-[12px] border border-border bg-bg-elevated px-4 py-2.5 text-[13px] font-semibold text-text-soft transition hover:text-text"
              >
                Send test
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  void handleSave();
                }}
                className="rounded-[12px] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
                style={{
                  background: "linear-gradient(180deg,#7a86ff,#5d69f0)",
                  boxShadow:
                    "0 8px 20px -6px rgba(111,123,255,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
                }}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <ThemeToggle compact />
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="font-mono text-[11px] font-semibold tracking-[0.1em] text-text-dim">
              PER HOBBY
            </div>
            <span className="hidden font-mono text-[11px] font-medium text-text-dim sm:inline">
              tap a day to toggle it
            </span>
          </div>

          <section className="mb-5 overflow-hidden rounded-[18px] border border-border-soft bg-bg-elevated sm:mb-[22px]">
            {rows.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] font-medium text-text-muted">
                No hobbies yet. Create one on the dashboard to set reminders.
              </p>
            ) : (
              rows.map((row, idx) => {
                const isLast = idx === rows.length - 1;
                const subtitleRow = row.enabled
                  ? `${formatDaysSubtitle(row.days)} · ${row.time}`
                  : "No reminder set";
                const expanded = expandedId === row.habitId;

                return (
                  <div
                    key={row.habitId}
                    className={`${isLast ? "" : "border-b border-border-soft"}`}
                  >
                    {/* Desktop row */}
                    <div className="hidden items-center gap-6 px-[22px] py-[18px] lg:flex">
                      <div className="w-11 flex-none">
                        <Toggle
                          on={row.enabled}
                          color={row.color}
                          ariaLabel={`Toggle reminder for ${row.name}`}
                          onClick={() =>
                            patchRow(row.habitId, { enabled: !row.enabled })
                          }
                        />
                      </div>
                      <div className="flex w-[214px] flex-none items-center gap-3">
                        <div
                          className="h-2.5 w-2.5 flex-none rounded-[3px]"
                          style={{
                            background: row.enabled ? row.color : "var(--text-dim)",
                            boxShadow: row.enabled
                              ? `0 0 8px ${row.color}`
                              : "none",
                          }}
                        />
                        <div className="min-w-0">
                          <div
                            className={`truncate text-[14.5px] font-bold ${
                              row.enabled ? "text-text-body" : "text-text-muted"
                            }`}
                          >
                            {row.name}
                          </div>
                          <div className="truncate font-mono text-[11.5px] font-medium text-text-muted">
                            {subtitleRow}
                          </div>
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-1 gap-1.5">
                        {DAY_LABELS.map((label, dayIdx) => (
                          <DayChip
                            key={`${row.habitId}-${dayIdx}`}
                            label={label}
                            active={row.enabled && row.days[dayIdx]!}
                            color={row.color}
                            disabled={!row.enabled}
                            onClick={() => toggleDay(row.habitId, dayIdx)}
                          />
                        ))}
                      </div>
                      <div className="flex w-[186px] flex-none items-center justify-between rounded-[11px] bg-bg-muted px-3.5 py-2">
                        <button
                          type="button"
                          disabled={!row.enabled}
                          onClick={() =>
                            patchRow(row.habitId, {
                              time: shiftReminderTime(row.time, -30),
                            })
                          }
                          className="text-[18px] font-light text-text-dim disabled:opacity-40"
                        >
                          −
                        </button>
                        <span
                          className={`font-mono text-[14px] font-bold ${
                            row.enabled ? "text-text-body" : "text-text-dim"
                          }`}
                        >
                          {row.enabled ? row.time : "—"}
                        </span>
                        <button
                          type="button"
                          disabled={!row.enabled}
                          onClick={() =>
                            patchRow(row.habitId, {
                              time: shiftReminderTime(row.time, 30),
                            })
                          }
                          className="text-[18px] font-light text-text-soft disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                      <div
                        className={`w-[74px] flex-none text-right font-mono text-[11px] font-semibold ${
                          row.enabled ? "text-[#8a92ff]" : "text-[#4b5060]"
                        }`}
                      >
                        {row.enabled ? "PUSH" : "OFF"}
                      </div>
                    </div>

                    {/* Mobile / tablet card */}
                    <div className="px-4 py-4 lg:hidden">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          onClick={() =>
                            setExpandedId(expanded ? null : row.habitId)
                          }
                        >
                          <div
                            className="h-2.5 w-2.5 flex-none rounded-[3px]"
                            style={{
                              background: row.enabled ? row.color : "var(--text-dim)",
                              boxShadow: row.enabled
                                ? `0 0 8px ${row.color}`
                                : "none",
                            }}
                          />
                          <div className="min-w-0">
                            <div className="truncate text-[14px] font-bold text-text-body">
                              {row.name}
                            </div>
                            <div className="truncate font-mono text-[11.5px] font-medium text-text-muted">
                              {subtitleRow}
                            </div>
                          </div>
                        </button>
                        <Toggle
                          on={row.enabled}
                          color={row.color}
                          ariaLabel={`Toggle reminder for ${row.name}`}
                          onClick={() =>
                            patchRow(row.habitId, { enabled: !row.enabled })
                          }
                        />
                      </div>

                      {(expanded || row.enabled) && row.enabled ? (
                        <div className="mt-3.5">
                          <div className="mb-3.5 flex gap-1.5">
                            {DAY_LABELS.map((label, dayIdx) => (
                              <DayChip
                                key={`m-${row.habitId}-${dayIdx}`}
                                label={label}
                                active={row.days[dayIdx]!}
                                color={row.color}
                                onClick={() => toggleDay(row.habitId, dayIdx)}
                              />
                            ))}
                          </div>
                          <div className="flex items-center justify-between rounded-[11px] bg-bg-muted px-3.5 py-2.5">
                            <span className="text-[12.5px] font-semibold text-text-soft">
                              Time
                            </span>
                            <div className="flex items-center gap-3.5">
                              <button
                                type="button"
                                onClick={() =>
                                  patchRow(row.habitId, {
                                    time: shiftReminderTime(row.time, -30),
                                  })
                                }
                                className="text-[18px] font-light text-text-dim"
                              >
                                −
                              </button>
                              <span className="font-mono text-[15px] font-bold text-text-body">
                                {row.time}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  patchRow(row.habitId, {
                                    time: shiftReminderTime(row.time, 30),
                                  })
                                }
                                className="text-[18px] font-light text-text-soft"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </section>

          <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.9fr_0.85fr]">
            <section className="rounded-[18px] border border-border-soft bg-bg-elevated px-4 py-5 sm:px-[22px] sm:py-5">
              <h2 className="m-0 mb-0.5 text-[14.5px] font-bold text-text-body">
                General
              </h2>
              <p className="m-0 mb-4 font-mono text-[11px] font-medium text-text-dim">
                applies to every hobby
              </p>
              <div className="flex flex-col gap-3">
                {(
                  [
                    {
                      key: "streakRisk" as const,
                      title: "Streak-risk alerts",
                      detail: "Nudge me if a streak is about to break",
                      mono: false,
                    },
                    {
                      key: "quietHours" as const,
                      title: "Quiet hours",
                      detail: "10:00 PM – 7:00 AM",
                      mono: true,
                    },
                    {
                      key: "freezeSuggestions" as const,
                      title: "Freeze suggestions",
                      detail: "Offer a freeze token when I miss a day",
                      mono: false,
                    },
                  ] as const
                ).map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-3 rounded-[12px] bg-bg-muted px-4 py-3.5"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="mb-0.5 text-[13.5px] font-bold text-text-body">
                        {item.title}
                      </div>
                      <div
                        className={`text-[11.5px] font-medium leading-snug text-text-muted ${
                          item.mono ? "font-mono" : ""
                        }`}
                      >
                        {item.detail}
                      </div>
                    </div>
                    <Toggle
                      on={general[item.key]}
                      ariaLabel={item.title}
                      onClick={() => {
                        setGeneral((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key],
                        }));
                        setSaveMessage(null);
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[18px] border border-border-soft bg-bg-elevated px-4 py-5 sm:px-[22px] sm:py-5">
              <h2 className="m-0 mb-0.5 text-[14.5px] font-bold text-text-body">
                Delivery
              </h2>
              <p className="m-0 mb-4 font-mono text-[11px] font-medium text-text-dim">
                where nudges arrive
              </p>
              <div className="flex flex-col gap-2.5">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="flex items-center justify-between gap-3 rounded-[12px] bg-bg-muted px-4 py-3.5"
                  >
                    <div className="min-w-0 pr-3">
                      <div
                        className={`mb-0.5 text-[13px] font-bold ${
                          channel.on ? "text-text-body" : "text-text-soft"
                        }`}
                      >
                        {channel.name}
                      </div>
                      <div className="font-mono text-[11px] font-medium text-text-muted">
                        {channel.detail}
                      </div>
                    </div>
                    <Toggle
                      on={channel.on}
                      ariaLabel={channel.name}
                      onClick={() => {
                        setChannels((prev) =>
                          prev.map((c) =>
                            c.id === channel.id ? { ...c, on: !c.on } : c,
                          ),
                        );
                        setSaveMessage(null);
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[18px] border border-border-soft bg-bg-elevated px-4 py-5 sm:px-[22px] sm:py-5">
              <h2 className="m-0 mb-0.5 text-[14.5px] font-bold text-text-body">
                Up next
              </h2>
              <p className="m-0 mb-4 font-mono text-[11px] font-medium text-text-dim">
                scheduled nudges
              </p>
              {upNext.length === 0 ? (
                <p className="m-0 text-[13px] font-medium text-text-muted">
                  No nudges scheduled. Turn on a hobby reminder to fill this list.
                </p>
              ) : (
                <div className="flex flex-col">
                  {upNext.map((item, idx) => (
                    <div
                      key={`${item.name}-${idx}`}
                      className={`flex items-center gap-3 py-2.5 ${
                        idx === upNext.length - 1
                          ? ""
                          : "border-b border-border-soft"
                      }`}
                    >
                      <div
                        className="h-2.5 w-2.5 flex-none rounded-[3px]"
                        style={{ background: item.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-text-body">
                          {item.name}
                        </div>
                        <div className="font-mono text-[10.5px] font-medium text-text-dim">
                          {item.when}
                        </div>
                      </div>
                      <span className="flex-none font-mono text-[11.5px] font-bold text-text-muted">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="flex flex-col gap-2.5 sm:hidden">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                void handleSave();
              }}
              className="rounded-[13px] py-3.5 text-center text-[15px] font-bold text-white disabled:opacity-50"
              style={{
                background: "linear-gradient(180deg,#7a86ff,#5d69f0)",
                boxShadow:
                  "0 8px 20px -6px rgba(111,123,255,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={handleTest}
              className="rounded-[13px] border border-border bg-bg-elevated py-3 text-center text-[14px] font-semibold text-text-soft"
            >
              Send test
            </button>
          </div>
        </div>

        <MobileNavSpacer />
      </div>

      <MobileBottomNav onAddClick={() => router.push("/dashboard")} />
    </div>
  );
}
