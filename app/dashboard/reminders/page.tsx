"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  API_URL,
  AuthUser,
  clearToken,
  fetchCurrentUser,
  getCachedUser,
  getToken,
} from "@/lib/auth";
import { ApiHabit, fromApiReminderTime, toApiReminderTime } from "@/lib/habits";
import {
  peekStaleDashboardCache,
  loadDashboardBundle,
  revalidateDashboardBundle,
  writeDashboardCache,
} from "@/lib/dashboardData";
import {
  buildReminderRows,
  buildUpNext,
  detectTimezone,
  fetchReminderSettings,
  formatDaysSubtitle,
  formatQuietHoursLabel,
  hexToRgb,
  ReminderChannel,
  ReminderGeneral,
  ReminderRow,
  ReminderSettings,
  settingsToChannels,
  settingsToGeneral,
  shiftReminderTime,
  updateHabitReminder,
  updateReminderSettings,
} from "@/lib/reminders";
import {
  cacheReminderSettings,
  ensureNotificationPermission,
  nextOccurrenceAt,
  notificationPermission,
  notifyRemindersUpdated,
  pushChannelDetail,
  TIME_PRESETS,
  writeLocalReminderSchedule,
} from "@/lib/browserNotifications";
import {
  ensureWebPushSubscription,
  pushSupported,
  removeWebPushSubscription,
} from "@/lib/webPush";
import { PageLoader } from "@/components/LoadingSpinner";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { MobileNavSpacer } from "@/components/dashboard/MobileNavSpacer";
import { ThemeToggle } from "@/components/ThemeToggle";

const DAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const EVERY_DAY = [true, true, true, true, true, true, true];
const WEEKDAYS = [false, true, true, true, true, true, false];
const WEEKEND = [true, false, false, false, false, false, true];

function daysEqual(a: boolean[], b: boolean[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function relativeWhen(at: Date, now = new Date()) {
  const mins = Math.max(0, Math.round((at.getTime() - now.getTime()) / 60_000));
  if (mins < 1) return "now";
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "tomorrow" : `in ${days}d`;
}

function ReminderTimeControl({
  time,
  color,
  onChange,
}: {
  time: string;
  color: string;
  onChange: (next: string) => void;
}) {
  const [draft, setDraft] = useState(time);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setDraft(time);
    setInvalid(false);
  }, [time]);

  function commitDraft(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setDraft(time);
      setInvalid(false);
      return;
    }
    const api = toApiReminderTime(trimmed);
    if (!api) {
      setInvalid(true);
      return;
    }
    const next = fromApiReminderTime(api);
    setInvalid(false);
    setDraft(next);
    if (toApiReminderTime(next) === toApiReminderTime(time)) return;
    onChange(next);
  }

  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">
        Exact time
      </div>
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          aria-label="Earlier by 1 minute"
          onClick={() => onChange(shiftReminderTime(time, -1))}
          className="flex h-12 w-12 flex-none items-center justify-center rounded-[12px] border border-border bg-bg-elevated text-[22px] font-light text-text-muted transition hover:text-text"
        >
          −
        </button>
        <input
          type="text"
          inputMode="text"
          spellCheck={false}
          value={draft}
          aria-label="Type reminder time"
          aria-invalid={invalid}
          placeholder="8:30 PM"
          onChange={(e) => {
            setDraft(e.target.value);
            setInvalid(false);
          }}
          onBlur={() => commitDraft(draft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft(draft);
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              onChange(shiftReminderTime(time, 1));
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              onChange(shiftReminderTime(time, -1));
            }
          }}
          className={`h-12 min-w-0 flex-1 rounded-[14px] border bg-bg-elevated px-3 text-center font-mono text-[20px] font-bold tracking-tight text-text-heading outline-none transition placeholder:text-text-dim ${
            invalid
              ? "border-danger focus:border-danger"
              : "border-border focus:border-[#6f7bff]"
          }`}
        />
        <button
          type="button"
          aria-label="Later by 1 minute"
          onClick={() => onChange(shiftReminderTime(time, 1))}
          className="flex h-12 w-12 flex-none items-center justify-center rounded-[12px] border border-border bg-bg-elevated text-[22px] font-light text-text-muted transition hover:text-text"
        >
          +
        </button>
      </div>
      <p
        className={`mb-2.5 text-center text-[11px] ${
          invalid ? "text-danger" : "text-text-dim"
        }`}
      >
        {invalid
          ? "Use a time like 8:30 PM or 20:30"
          : "Type a time, or use − / + for 1 minute"}
      </p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {TIME_PRESETS.map((preset) => {
          const active = time === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value)}
              className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold transition ${
                active
                  ? "text-white"
                  : "bg-bg-muted text-text-muted hover:text-text-body"
              }`}
              style={active ? { background: color } : undefined}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
      className="relative h-[26px] w-[44px] flex-none rounded-[13px] transition"
      style={{
        background: on ? (color ?? "#6f7bff") : "var(--toggle-off)",
        boxShadow: on
          ? "inset 0 1px 2px rgba(0,0,0,0.2)"
          : "inset 0 1px 2px rgba(15,18,26,0.06)",
      }}
    >
      <span
        className="absolute top-[3px] h-5 w-5 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-[left,background]"
        style={{
          left: on ? 20 : 3,
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
  onClick,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  const rgb = hexToRgb(color);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 flex-1 items-center justify-center rounded-[11px] text-[12px] font-bold transition"
      style={
        active
          ? {
              background: `rgba(${rgb.r},${rgb.g},${rgb.b},0.22)`,
              border: `1.5px solid ${color}`,
              color,
            }
          : {
              background: "var(--bg-muted)",
              border: "1.5px solid transparent",
              color: "var(--text-dim)",
            }
      }
    >
      {label}
    </button>
  );
}

function emptySettings(email = ""): ReminderSettings {
  return {
    timezone: detectTimezone(),
    email_enabled: false,
    push_enabled: false,
    weekly_summary: false,
    quiet_hours: true,
    quiet_hours_start: "22:00",
    quiet_hours_end: "07:00",
    streak_risk: true,
    freeze_suggestions: false,
    email,
  };
}

export default function RemindersPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [habits, setHabits] = useState<ApiHabit[]>([]);
  const [rows, setRows] = useState<ReminderRow[]>([]);
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [general, setGeneral] = useState<ReminderGeneral>(() =>
    settingsToGeneral(emptySettings()),
  );
  const [channels, setChannels] = useState<ReminderChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [permTick, setPermTick] = useState(0);
  const [settingsDirty, setSettingsDirty] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    const cachedUser = getCachedUser();
    const stale = peekStaleDashboardCache();
    const hadPaint = Boolean(cachedUser && stale?.habits);

    if (hadPaint && cachedUser && stale) {
      setUser(cachedUser);
      setHabits(stale.habits);
      setRows(buildReminderRows(stale.habits));
      setLoading(false);
      setChannels(
        settingsToChannels(emptySettings(cachedUser.email)).map((c) => ({
          ...c,
          detail: pushChannelDetail(),
        })),
      );
    }

    Promise.all([
      fetchCurrentUser(token),
      hadPaint && stale ? revalidateDashboardBundle() : loadDashboardBundle(),
      fetchReminderSettings().catch(() => null),
    ])
      .then(async ([currentUser, bundle, nextSettings]) => {
        if (cancelled) return;
        setUser(currentUser);
        setHabits(bundle.habits);
        const nextRows = buildReminderRows(bundle.habits);
        setRows(nextRows);
        const firstOn = nextRows.find((r) => r.enabled);
        setExpandedId(firstOn?.habitId ?? nextRows[0]?.habitId ?? null);

        let settingsOut = nextSettings ?? emptySettings(currentUser.email);
        if (settingsOut.email_enabled || settingsOut.weekly_summary) {
          try {
            settingsOut = await updateReminderSettings({
              email_enabled: false,
              weekly_summary: false,
            });
          } catch {
            settingsOut = {
              ...settingsOut,
              email_enabled: false,
              weekly_summary: false,
            };
          }
        }

        setSettings(settingsOut);
        cacheReminderSettings(settingsOut);
        setGeneral(settingsToGeneral(settingsOut));
        setChannels(
          settingsToChannels(settingsOut).map((c) => ({
            ...c,
            detail: pushChannelDetail(),
          })),
        );
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        clearToken();
        setError("Your session expired. Please log in again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const activeCount = rows.filter((row) => row.enabled).length;
  const upNext = useMemo(() => buildUpNext(rows), [rows]);
  const quietLabel = settings
    ? formatQuietHoursLabel(
        settings.quiet_hours_start,
        settings.quiet_hours_end,
      )
    : "10:00 PM – 7:00 AM";
  const pushOn = channels.find((c) => c.id === "push")?.on ?? false;
  const notifPerm = notificationPermission();
  const notifReady = pushOn && notifPerm === "granted";

  useEffect(() => {
    const questionsByHabitId: Record<number, string | null | undefined> = {};
    for (const habit of habits) {
      questionsByHabitId[habit.id] = habit.question;
    }
    writeLocalReminderSchedule({
      rows,
      pushEnabled: pushOn || Boolean(settings?.push_enabled),
      questionsByHabitId,
    });
  }, [rows, pushOn, habits, settings?.push_enabled]);

  function markSettingsDirty() {
    setSettingsDirty(true);
    setSaveMessage(null);
  }

  function patchRow(habitId: number, patch: Partial<ReminderRow>) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.habitId !== habitId) return row;
        const next = { ...row, ...patch };
        const unchanged =
          next.enabled === row.enabled &&
          next.time === row.time &&
          daysEqual(next.days, row.days);
        if (unchanged) return row;
        return { ...next, dirty: true };
      }),
    );
    setSaveMessage(null);
  }

  async function ensurePushOn(): Promise<boolean> {
    const permission = await ensureNotificationPermission();
    setPermTick((n) => n + 1);
    if (permission !== "granted") {
      setError(
        permission === "denied"
          ? "Notifications are blocked. Allow them in your browser settings, then try again."
          : "Allow notifications when prompted so nudges can fire.",
      );
      setChannels((prev) =>
        prev.map((c) =>
          c.id === "push" ? { ...c, detail: pushChannelDetail() } : c,
        ),
      );
      return false;
    }

    setError(null);
    setChannels((prev) =>
      prev.map((c) =>
        c.id === "push"
          ? { ...c, on: true, detail: pushChannelDetail() }
          : c,
      ),
    );
    try {
      if (pushSupported()) {
        await ensureWebPushSubscription();
      }
      const next = await updateReminderSettings({
        push_enabled: true,
        email_enabled: false,
        weekly_summary: false,
      });
      setSettings(next);
      cacheReminderSettings(next);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not enable browser notifications.",
      );
      markSettingsDirty();
      return false;
    }
    return true;
  }

  async function toggleHabitReminder(row: ReminderRow) {
    const enabling = !row.enabled;
    if (enabling) {
      const ok = await ensurePushOn();
      if (!ok && notifPerm === "denied") return;
      setExpandedId(row.habitId);
    }
    patchRow(row.habitId, { enabled: enabling });
  }

  function toggleDay(habitId: number, dayIndex: number) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.habitId !== habitId || !row.enabled) return row;
        const days = row.days.map((on, i) => (i === dayIndex ? !on : on));
        if (!days.some(Boolean)) return row;
        if (daysEqual(days, row.days)) return row;
        return { ...row, days, dirty: true };
      }),
    );
    setSaveMessage(null);
  }

  function applyDays(habitId: number, days: boolean[]) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.habitId !== habitId) return row;
        if (daysEqual(days, row.days)) return row;
        return { ...row, days, dirty: true };
      }),
    );
    setSaveMessage(null);
  }

  async function togglePush() {
    if (pushOn) {
      setChannels((prev) =>
        prev.map((c) =>
          c.id === "push"
            ? { ...c, on: false, detail: pushChannelDetail() }
            : c,
        ),
      );
      void removeWebPushSubscription();
      markSettingsDirty();
      return;
    }
    await ensurePushOn();
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const updatedHabits = [...habits];

      for (const row of rows) {
        if (!row.dirty) continue;
        const updated = await updateHabitReminder(row.habitId, {
          timeUi: row.enabled ? row.time : null,
          days: row.days,
        });
        const idx = updatedHabits.findIndex((h) => h.id === row.habitId);
        if (idx >= 0) updatedHabits[idx] = updated;
      }

      if (pushOn) {
        const permission = await ensureNotificationPermission();
        setPermTick((n) => n + 1);
        if (permission !== "granted") {
          throw new Error("Allow browser notifications to save reminders.");
        }
        if (pushSupported()) {
          await ensureWebPushSubscription();
        }
      } else {
        void removeWebPushSubscription();
      }

      const nextSettings = await updateReminderSettings({
        timezone: detectTimezone(),
        email_enabled: false,
        push_enabled: pushOn,
        weekly_summary: false,
        quiet_hours: general.quietHours,
        quiet_hours_start: settings?.quiet_hours_start ?? "22:00",
        quiet_hours_end: settings?.quiet_hours_end ?? "07:00",
        streak_risk: general.streakRisk,
        freeze_suggestions: general.freezeSuggestions,
      });

      setSettings(nextSettings);
      cacheReminderSettings(nextSettings);
      setGeneral(settingsToGeneral(nextSettings));
      setChannels(
        settingsToChannels(nextSettings).map((c) => ({
          ...c,
          detail: pushChannelDetail(),
        })),
      );
      setHabits(updatedHabits);
      setRows(buildReminderRows(updatedHabits));
      setSettingsDirty(false);
      const cached = peekStaleDashboardCache();
      writeDashboardCache({
        habits: updatedHabits,
        checkInsByHabit: cached?.checkInsByHabit ?? {},
        freezes: cached?.freezes ?? {
          remaining: 3,
          total: 3,
          by_habit: {},
        },
      });
      notifyRemindersUpdated();
      setSaveMessage(
        pushOn
          ? "Saved. Nudges work even when the browser is minimized."
          : "Reminders saved.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save reminders.");
    } finally {
      setSaving(false);
    }
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
  void permTick;

  const nextSoon = rows
    .filter((r) => r.enabled)
    .map((r) => {
      const at = nextOccurrenceAt(r.days, r.time);
      return at ? { row: r, at } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a!.at.getTime() - b!.at.getTime())[0];

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar
        userName={displayName}
        userPlanLabel="Free plan"
        onLogout={logout}
        quietHoursLabel={general.quietHours ? quietLabel : undefined}
      />

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 border-b border-border-soft bg-bg/95 px-[18px] py-3 backdrop-blur-md sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.025em] text-text">
                Reminders
              </h1>
              <p className="m-0 mt-0.5 font-mono text-[11px] font-medium text-text-dim">
                {activeCount} of {rows.length} on
                {nextSoon
                  ? ` · next ${relativeWhen(nextSoon.at)}`
                  : ""}
              </p>
            </div>
            <ThemeToggle compact />
          </div>
        </div>

        <div className="px-[18px] pb-9 pt-5 sm:px-[34px] sm:pb-12 sm:pt-[30px]">
          <div className="mb-5 hidden items-end justify-between gap-4 sm:mb-6 sm:flex">
            <div>
              <h1 className="m-0 mb-1.5 text-[28px] font-extrabold tracking-[-0.03em] text-text">
                Reminders
              </h1>
              <p className="m-0 max-w-lg text-[14px] leading-snug text-text-muted">
                One notification per hobby, at the time you pick. Keep HabitLoop
                open in this browser.
              </p>
            </div>
            <ThemeToggle compact />
          </div>

          {error ? (
            <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-danger">
              {error}
            </p>
          ) : null}
          {saveMessage ? (
            <p className="mb-4 rounded-xl border border-[#6f7bff]/25 bg-[#6f7bff]/10 px-3.5 py-2.5 text-[13px] text-brand-soft">
              {saveMessage}
            </p>
          ) : null}

          {!notifReady ? (
            <section className="mb-5 flex flex-col gap-3 rounded-[18px] border border-[rgba(111,123,255,0.28)] bg-[rgba(111,123,255,0.08)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-[14.5px] font-bold text-text-heading">
                  {notifPerm === "denied"
                    ? "Notifications are blocked"
                    : "Allow notifications to get nudged"}
                </div>
                <p className="m-0 mt-1 text-[12.5px] leading-snug text-text-muted">
                  {notifPerm === "denied"
                    ? "Open your browser site settings and turn notifications on for HabitLoop."
                    : "We’ll only ping you at the times you set for each hobby."}
                </p>
              </div>
              {notifPerm !== "denied" ? (
                <button
                  type="button"
                  onClick={() => {
                    void ensurePushOn();
                  }}
                  className="flex-none rounded-[12px] px-4 py-2.5 text-[13px] font-bold text-white"
                  style={{
                    background: "linear-gradient(180deg,#7a86ff,#5d69f0)",
                  }}
                >
                  Allow notifications
                </button>
              ) : null}
            </section>
          ) : null}

          <section className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 lg:grid-cols-4">
            <div className="rounded-[16px] border border-border-soft bg-bg-elevated px-4 py-3.5">
              <div className="mb-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-text-dim">
                STATUS
              </div>
              <div className="text-[16px] font-bold text-text-heading">
                {notifReady ? "Ready" : pushOn ? "Needs permission" : "Off"}
              </div>
              <div className="mt-0.5 truncate text-[11.5px] text-text-muted">
                {pushChannelDetail()}
              </div>
            </div>
            <div className="rounded-[16px] border border-border-soft bg-bg-elevated px-4 py-3.5">
              <div className="mb-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-text-dim">
                ACTIVE
              </div>
              <div className="font-mono text-[22px] font-bold text-text-heading">
                {activeCount}
                <span className="text-[13px] text-text-dim">/{rows.length}</span>
              </div>
              <div className="mt-0.5 text-[11.5px] text-text-muted">
                hobbies notifying
              </div>
            </div>
            <div className="rounded-[16px] border border-border-soft bg-bg-elevated px-4 py-3.5">
              <div className="mb-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-text-dim">
                NEXT
              </div>
              <div className="truncate text-[16px] font-bold text-text-heading">
                {nextSoon ? relativeWhen(nextSoon.at) : "—"}
              </div>
              <div className="mt-0.5 truncate text-[11.5px] text-text-muted">
                {nextSoon
                  ? `${nextSoon.row.name} · ${nextSoon.row.time}`
                  : "No schedule yet"}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[16px] border border-border-soft bg-bg-elevated px-4 py-3.5">
              <div className="min-w-0">
                <div className="mb-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-text-dim">
                  ALL NUDGES
                </div>
                <div className="text-[16px] font-bold text-text-heading">
                  {pushOn ? "On" : "Paused"}
                </div>
                <div className="mt-0.5 text-[11.5px] text-text-muted">
                  this device
                </div>
              </div>
              <Toggle
                on={pushOn}
                ariaLabel="Toggle all notifications"
                onClick={() => {
                  void togglePush();
                }}
              />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.7fr)]">
            <div>
              <div className="mb-3 flex items-end justify-between">
                <h2 className="m-0 text-[15px] font-bold text-text-heading">
                  Your hobbies
                </h2>
                <span className="text-[12px] text-text-dim">
                  Tap a card to set days and time
                </span>
              </div>

              {rows.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-border bg-bg-elevated px-5 py-10 text-center">
                  <p className="mb-3 text-[14px] text-text-muted">
                    No hobbies yet. Create one on the dashboard first.
                  </p>
                  <Link
                    href="/dashboard"
                    className="text-[14px] font-semibold text-brand-soft"
                  >
                    Go to dashboard
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {rows.map((row) => {
                    const expanded = expandedId === row.habitId;
                    const nextAt = row.enabled
                      ? nextOccurrenceAt(row.days, row.time)
                      : null;
                    const subtitleRow = row.enabled
                      ? `${formatDaysSubtitle(row.days)} · ${row.time}${
                          nextAt ? ` · ${relativeWhen(nextAt)}` : ""
                        }`
                      : "Off — tap to schedule";

                    return (
                      <article
                        key={row.habitId}
                        className={`overflow-hidden rounded-[18px] border bg-bg-elevated transition ${
                          row.enabled
                            ? "border-[rgba(111,123,255,0.3)]"
                            : "border-border-soft"
                        } ${expanded ? "shadow-[0_16px_40px_-24px_rgba(111,123,255,0.55)]" : ""}`}
                      >
                        <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            onClick={() =>
                              setExpandedId(expanded ? null : row.habitId)
                            }
                          >
                            <span
                              className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] text-[13px] font-extrabold text-white"
                              style={{
                                background: row.enabled
                                  ? row.color
                                  : "var(--bg-muted)",
                                color: row.enabled
                                  ? "#fff"
                                  : "var(--text-dim)",
                              }}
                            >
                              {row.name.trim().charAt(0).toUpperCase() || "?"}
                            </span>
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span
                                  className={`block truncate text-[15px] font-bold ${
                                    row.enabled
                                      ? "text-text-heading"
                                      : "text-text-muted"
                                  }`}
                                >
                                  {row.name}
                                </span>
                                {row.dirty ? (
                                  <span className="rounded-full bg-[#6f7bff]/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-brand-soft">
                                    EDIT
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-0.5 block truncate text-[12px] text-text-dim">
                                {subtitleRow}
                              </span>
                            </span>
                          </button>
                          <span className="hidden text-[18px] text-text-dim sm:block">
                            {expanded ? "▾" : "▸"}
                          </span>
                          <Toggle
                            on={row.enabled}
                            color={row.color}
                            ariaLabel={`Toggle reminder for ${row.name}`}
                            onClick={() => {
                              void toggleHabitReminder(row);
                            }}
                          />
                        </div>

                        {expanded ? (
                          <div className="border-t border-border-soft px-4 py-4 sm:px-5">
                            {row.enabled ? (
                              <>
                                <div className="mb-2 flex items-center justify-between">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                                    Days
                                  </span>
                                  <div className="flex gap-1">
                                    {(
                                      [
                                        ["Daily", EVERY_DAY],
                                        ["Weekdays", WEEKDAYS],
                                        ["Weekend", WEEKEND],
                                      ] as const
                                    ).map(([label, preset]) => {
                                      const on = daysEqual(row.days, [...preset]);
                                      return (
                                        <button
                                          key={label}
                                          type="button"
                                          onClick={() =>
                                            applyDays(row.habitId, [...preset])
                                          }
                                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                            on
                                              ? "bg-[#6f7bff]/18 text-brand-soft"
                                              : "text-text-dim hover:text-text-body"
                                          }`}
                                        >
                                          {label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="mb-4 flex gap-1.5">
                                  {DAY_SHORT.map((label, dayIdx) => (
                                    <DayChip
                                      key={`${row.habitId}-${dayIdx}`}
                                      label={label}
                                      active={row.days[dayIdx]!}
                                      color={row.color}
                                      onClick={() =>
                                        toggleDay(row.habitId, dayIdx)
                                      }
                                    />
                                  ))}
                                </div>
                                <ReminderTimeControl
                                  time={row.time}
                                  color={row.color}
                                  onChange={(next) =>
                                    patchRow(row.habitId, { time: next })
                                  }
                                />
                                {row.dirty ? (
                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => {
                                      void handleSave();
                                    }}
                                    className="mt-3.5 w-full rounded-[12px] py-2.5 text-[13px] font-bold text-white disabled:opacity-45"
                                    style={{
                                      background:
                                        "linear-gradient(180deg,#7a86ff,#5d69f0)",
                                    }}
                                  >
                                    {saving ? "Saving…" : "Save"}
                                  </button>
                                ) : null}
                              </>
                            ) : (
                              <p className="m-0 text-[13px] leading-snug text-text-muted">
                                Turn this on to pick days and a time. You’ll get
                                a browser notification — no email.
                              </p>
                            )}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <aside className="flex flex-col gap-4">
              <section className="rounded-[18px] border border-border-soft bg-bg-elevated px-4 py-5 sm:px-5">
                <h2 className="m-0 mb-0.5 text-[15px] font-bold text-text-heading">
                  Up next
                </h2>
                <p className="m-0 mb-4 text-[12px] text-text-dim">
                  Soonest scheduled nudges
                </p>
                {upNext.length === 0 ? (
                  <p className="m-0 rounded-[12px] bg-bg-muted px-3.5 py-4 text-[13px] text-text-muted">
                    Nothing scheduled. Turn on a hobby and pick a time.
                  </p>
                ) : (
                  <div className="relative flex flex-col gap-0">
                    {upNext.map((item, idx) => {
                      const row = rows.find((r) => r.name === item.name);
                      const at = row
                        ? nextOccurrenceAt(row.days, row.time)
                        : null;
                      return (
                        <div
                          key={`${item.name}-${idx}`}
                          className="flex items-center gap-3 py-2.5"
                        >
                          <div className="flex w-2 flex-col items-center">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ background: item.color }}
                            />
                            {idx < upNext.length - 1 ? (
                              <span className="mt-1 h-6 w-px bg-border" />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-semibold text-text-body">
                              {item.name}
                            </div>
                            <div className="font-mono text-[11px] text-text-dim">
                              {item.when} · {item.time}
                            </div>
                          </div>
                          <span className="flex-none rounded-full bg-bg-muted px-2 py-0.5 font-mono text-[10.5px] font-bold text-brand-soft">
                            {at ? relativeWhen(at) : item.when}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-[18px] border border-border-soft bg-bg-elevated px-4 py-5 sm:px-5">
                <h2 className="m-0 mb-0.5 text-[15px] font-bold text-text-heading">
                  Preferences
                </h2>
                <p className="m-0 mb-4 text-[12px] text-text-dim">
                  Optional extras — saved with your schedule
                </p>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-3 rounded-[12px] bg-bg-muted px-3.5 py-3">
                    <div className="min-w-0 pr-2">
                      <div className="text-[13px] font-bold text-text-body">
                        Quiet hours
                      </div>
                      <div className="font-mono text-[11.5px] text-text-muted">
                        {quietLabel}
                      </div>
                    </div>
                    <Toggle
                      on={general.quietHours}
                      ariaLabel="Quiet hours"
                      onClick={() => {
                        setGeneral((prev) => ({
                          ...prev,
                          quietHours: !prev.quietHours,
                        }));
                        markSettingsDirty();
                      }}
                    />
                  </div>
                  {(
                    [
                      {
                        key: "streakRisk" as const,
                        title: "Streak-risk alerts",
                        detail: "Warn before a streak breaks",
                      },
                      {
                        key: "freezeSuggestions" as const,
                        title: "Freeze suggestions",
                        detail: "Offer a freeze after a miss",
                      },
                    ] as const
                  ).map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-3 rounded-[12px] bg-bg-muted px-3.5 py-3"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-[13px] font-bold text-text-body">
                          {item.title}
                        </div>
                        <div className="text-[11.5px] text-text-muted">
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
                          markSettingsDirty();
                        }}
                      />
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>

        <MobileNavSpacer />
      </div>

      <MobileBottomNav onAddClick={() => router.push("/dashboard")} />
    </div>
  );
}
