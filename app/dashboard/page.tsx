"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, clearToken, fetchCurrentUser, getToken } from "@/lib/auth";

type User = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
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
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-red-600">{error}</p>
        <a href="/login" className="underline">
          Back to login
        </a>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">
        Welcome, {user.first_name} {user.last_name}
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">{user.email}</p>

      <button
        type="button"
        onClick={logout}
        className="rounded border border-black/20 px-4 py-2 hover:bg-black/5 dark:border-white/30 dark:hover:bg-white/10"
      >
        Log out
      </button>
    </main>
  );
}
