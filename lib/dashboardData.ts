import type { ApiCheckIn } from "@/lib/checkInsApi";
import { fetchHabitCheckIns } from "@/lib/checkInsApi";
import type { FreezesResponse } from "@/lib/freezesApi";
import { fetchFreezes } from "@/lib/freezesApi";
import type { ApiHabit } from "@/lib/habits";
import { fetchHabits } from "@/lib/habits";

export type DashboardBundle = {
  habits: ApiHabit[];
  checkInsByHabit: Record<number, ApiCheckIn[]>;
  freezes: FreezesResponse;
  fetchedAt: number;
};

/** Serve from memory without refetch. */
const FRESH_TTL_MS = 90_000;
/** Still paint instantly, then revalidate in the background. */
const STALE_TTL_MS = 30 * 60_000;
const STORAGE_KEY = "habitloop_dashboard_bundle_v1";

let cache: DashboardBundle | null = null;
let inflight: Promise<DashboardBundle> | null = null;
let hydrated = false;

function isBrowser() {
  return typeof window !== "undefined";
}

function readStored(): DashboardBundle | null {
  if (!isBrowser()) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardBundle;
    if (!parsed?.fetchedAt || !Array.isArray(parsed.habits)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(bundle: DashboardBundle) {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function clearStored() {
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function hydrateFromStorage() {
  if (hydrated) return;
  hydrated = true;
  if (cache) return;
  const stored = readStored();
  if (!stored) return;
  if (Date.now() - stored.fetchedAt > STALE_TTL_MS) {
    clearStored();
    return;
  }
  cache = stored;
}

function ageMs(bundle: DashboardBundle) {
  return Date.now() - bundle.fetchedAt;
}

/** Fresh cache only (no network needed). */
export function peekDashboardCache(): DashboardBundle | null {
  hydrateFromStorage();
  if (!cache) return null;
  if (ageMs(cache) > FRESH_TTL_MS) return null;
  return cache;
}

/** Stale-ok cache for instant first paint. */
export function peekStaleDashboardCache(): DashboardBundle | null {
  hydrateFromStorage();
  if (!cache) return null;
  if (ageMs(cache) > STALE_TTL_MS) {
    cache = null;
    clearStored();
    return null;
  }
  return cache;
}

export function invalidateDashboardCache() {
  cache = null;
  clearStored();
}

export function writeDashboardCache(
  next: Omit<DashboardBundle, "fetchedAt">,
): DashboardBundle {
  cache = { ...next, fetchedAt: Date.now() };
  persist(cache);
  return cache;
}

export function patchDashboardCache(
  patch: (current: DashboardBundle) => DashboardBundle | null,
) {
  hydrateFromStorage();
  if (!cache) return;
  const next = patch(cache);
  cache = next;
  if (next) persist(next);
  else clearStored();
}

async function fetchBundle(): Promise<DashboardBundle> {
  const [habits, freezes] = await Promise.all([
    fetchHabits(),
    fetchFreezes().catch(
      (): FreezesResponse => ({ remaining: 0, total: 3, by_habit: {} }),
    ),
  ]);

  const pairs = await Promise.all(
    habits.map(async (habit) => {
      try {
        const checkIns = await fetchHabitCheckIns(habit.id);
        return [habit.id, checkIns] as const;
      } catch {
        return [habit.id, [] as ApiCheckIn[]] as const;
      }
    }),
  );

  return writeDashboardCache({
    habits,
    checkInsByHabit: Object.fromEntries(pairs),
    freezes,
  });
}

/**
 * Shared habits/check-ins/freezes loader.
 * Dedupes concurrent calls, short-TTL memory cache, sessionStorage paint cache.
 */
export async function loadDashboardBundle(opts?: {
  force?: boolean;
}): Promise<DashboardBundle> {
  hydrateFromStorage();

  if (!opts?.force) {
    const hit = peekDashboardCache();
    if (hit) return hit;
    if (inflight) return inflight;
  }

  inflight = fetchBundle().finally(() => {
    inflight = null;
  });

  return inflight;
}

/** Kick a silent refresh when we painted from stale cache. */
export function revalidateDashboardBundle() {
  hydrateFromStorage();
  if (inflight) return inflight;
  const fresh = peekDashboardCache();
  if (fresh) return Promise.resolve(fresh);
  return loadDashboardBundle({ force: true });
}
