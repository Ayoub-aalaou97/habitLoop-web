"use client";

import { useEffect } from "react";
import { getToken } from "@/lib/auth";
import {
  peekStaleDashboardCache,
  loadDashboardBundle,
} from "@/lib/dashboardData";
import {
  buildReminderRows,
  detectTimezone,
  fetchReminderSettings,
  updateReminderSettings,
  type ReminderSettings,
} from "@/lib/reminders";
import {
  cacheReminderSettings,
  nextOccurrenceAt,
  peekLocalReminderSchedule,
  peekReminderSettings,
  tickHabitNotifications,
  writeLocalReminderSchedule,
  type LocalReminderSchedule,
} from "@/lib/browserNotifications";
import { ensureWebPushSubscription, pushSupported } from "@/lib/webPush";

function resolveSchedule(
  settings: ReminderSettings | null,
): LocalReminderSchedule | null {
  const local = peekLocalReminderSchedule();
  if (local && local.rows.length > 0) {
    return {
      ...local,
      pushEnabled:
        local.pushEnabled || Boolean(settings?.push_enabled),
    };
  }

  const bundle = peekStaleDashboardCache();
  if (!bundle) return null;

  const questionsByHabitId: Record<number, string | null | undefined> = {};
  for (const habit of bundle.habits) {
    questionsByHabitId[habit.id] = habit.question;
  }

  return {
    rows: buildReminderRows(bundle.habits),
    pushEnabled: Boolean(settings?.push_enabled),
    questionsByHabitId,
    updatedAt: Date.now(),
  };
}

/**
 * Fires browser notifications at scheduled reminder times.
 * Uses exact timeouts (not only polling) so nudges aren't missed.
 */
export function ReminderNotifier() {
  useEffect(() => {
    if (!getToken()) return;

    let cancelled = false;
    let settings: ReminderSettings | null = peekReminderSettings();
    const timers: number[] = [];

    function clearTimers() {
      while (timers.length) {
        const id = timers.pop();
        if (id != null) window.clearTimeout(id);
      }
    }

    function fireDue() {
      const schedule = resolveSchedule(settings);
      if (!schedule) return;
      tickHabitNotifications({
        rows: schedule.rows,
        pushEnabled: schedule.pushEnabled || Boolean(settings?.push_enabled),
        questionsByHabitId: schedule.questionsByHabitId,
      });
    }

    function reschedule() {
      clearTimers();
      if (cancelled) return;

      const schedule = resolveSchedule(settings);
      if (!schedule) return;

      const pushOn =
        schedule.pushEnabled || Boolean(settings?.push_enabled);
      if (!pushOn) return;

      fireDue();

      const now = new Date();
      for (const row of schedule.rows) {
        if (!row.enabled) continue;
        const next = nextOccurrenceAt(row.days, row.time, now);
        if (!next) continue;
        const delay = next.getTime() - Date.now() + 250;
        if (delay < 0 || delay > 36 * 60 * 60 * 1000) continue;

        const timerId = window.setTimeout(() => {
          if (cancelled) return;
          fireDue();
          reschedule();
        }, delay);
        timers.push(timerId);
      }
    }

    async function refreshSettings() {
      try {
        const next = await fetchReminderSettings();
        if (cancelled) return;
        settings = next;
        cacheReminderSettings(next);
      } catch {
        // keep cached
      }
    }

    void (async () => {
      await refreshSettings();
      if (cancelled) return;

      try {
        const tz = detectTimezone();
        if (settings && settings.timezone !== tz) {
          const next = await updateReminderSettings({ timezone: tz });
          if (!cancelled) {
            settings = next;
            cacheReminderSettings(next);
          }
        }
      } catch {
        // ignore
      }

      if (!peekStaleDashboardCache()) {
        await loadDashboardBundle().catch(() => undefined);
      }

      // Seed local schedule from cache if empty.
      if (!peekLocalReminderSchedule()) {
        const seeded = resolveSchedule(settings);
        if (seeded) {
          writeLocalReminderSchedule(
            {
              rows: seeded.rows,
              pushEnabled: seeded.pushEnabled,
              questionsByHabitId: seeded.questionsByHabitId,
            },
            { silent: true },
          );
        }
      }

      if (!cancelled) reschedule();

      // Keep a server-side push subscription so nudges fire when minimized.
      if (
        !cancelled &&
        pushSupported() &&
        Notification.permission === "granted" &&
        (settings?.push_enabled || peekLocalReminderSchedule()?.pushEnabled)
      ) {
        void ensureWebPushSubscription().catch(() => undefined);
      }
    })();

    const poll = window.setInterval(() => {
      fireDue();
    }, 15_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fireDue();
        reschedule();
      }
    };
    const onUpdated = () => {
      settings = peekReminderSettings() ?? settings;
      void refreshSettings().then(() => {
        if (!cancelled) {
          reschedule();
          if (
            pushSupported() &&
            Notification.permission === "granted" &&
            (settings?.push_enabled ||
              peekLocalReminderSchedule()?.pushEnabled)
          ) {
            void ensureWebPushSubscription().catch(() => undefined);
          }
        }
      });
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("habitloop:reminders-updated", onUpdated);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      clearTimers();
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("habitloop:reminders-updated", onUpdated);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  return null;
}
