"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  API_URL,
  AuthUser,
  clearToken,
  fetchCurrentUser,
  getToken,
} from "@/lib/auth";
import { BrandMark, BrandWordmark } from "@/components/BrandMark";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    fetchCurrentUser(token)
      .then(setUser)
      .catch(() => {
        clearToken();
        setError("Your session expired. Please log in again.");
      });
  }, [router]);

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

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 bg-bg p-8">
      <div className="flex items-center gap-3">
        <BrandMark size={32} />
        <BrandWordmark className="text-base" />
      </div>
      <h1 className="text-2xl font-extrabold tracking-[-0.02em]">
        Welcome, {user.first_name} {user.last_name}
      </h1>
      <p className="text-text-muted">{user.email}</p>
      <button
        type="button"
        onClick={logout}
        className="rounded-[13px] border border-white/[0.08] bg-bg-elevated px-4 py-2.5 text-sm font-semibold text-[#e8e9ec] transition hover:bg-bg-soft"
      >
        Log out
      </button>
    </main>
  );
}
