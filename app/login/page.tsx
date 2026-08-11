"use client";

import { API_URL } from "@/lib/auth";

export default function LoginPage() {
  function continueWithGoogle() {
    window.location.href = `${API_URL}/api/auth/google`;
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Log in to HabitLoop</h1>

      <button
        type="button"
        onClick={continueWithGoogle}
        className="rounded border border-black/20 px-5 py-3 text-base font-medium hover:bg-black/5 dark:border-white/30 dark:hover:bg-white/10"
      >
        Continue with Google
      </button>
    </main>
  );
}
