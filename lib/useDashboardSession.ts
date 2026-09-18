"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AuthUser,
  clearToken,
  fetchCurrentUser,
  getCachedUser,
  getToken,
} from "@/lib/auth";
import {
  DashboardBundle,
  invalidateDashboardCache,
  loadDashboardBundle,
  peekStaleDashboardCache,
  revalidateDashboardBundle,
} from "@/lib/dashboardData";

/**
 * Boots dashboard screens from session cache first, then refreshes in background.
 * Avoids full-page loaders on revisits / tab switches.
 */
export function useDashboardSession() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bundle, setBundle] = useState<DashboardBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    const cachedUser = getCachedUser();
    const cachedBundle = peekStaleDashboardCache();
    const hadPaint = Boolean(cachedUser && cachedBundle);

    if (hadPaint && cachedUser && cachedBundle) {
      setUser(cachedUser);
      setBundle(cachedBundle);
      setBooting(false);
      Promise.all([fetchCurrentUser(token), revalidateDashboardBundle()])
        .then(([nextUser, nextBundle]) => {
          if (cancelled) return;
          setUser(nextUser);
          setBundle(nextBundle);
        })
        .catch(() => {
          if (cancelled) return;
          clearToken();
          invalidateDashboardCache();
          setError("Your session expired. Please log in again.");
        });
      return () => {
        cancelled = true;
      };
    }

    Promise.all([fetchCurrentUser(token), loadDashboardBundle()])
      .then(([nextUser, nextBundle]) => {
        if (cancelled) return;
        setUser(nextUser);
        setBundle(nextBundle);
        setBooting(false);
      })
      .catch(() => {
        if (cancelled) return;
        clearToken();
        invalidateDashboardCache();
        setError("Your session expired. Please log in again.");
        setBooting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return {
    user,
    setUser,
    bundle,
    setBundle,
    error,
    setError,
    booting,
  };
}
