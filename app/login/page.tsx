"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark, BrandWordmark } from "@/components/BrandMark";
import { continueWithGoogle, loginWithEmail, saveToken } from "@/lib/auth";

const LOGIN_STRIP = [
  "rgba(56,189,248,0.85)",
  "rgba(167,139,250,0.55)",
  "rgba(251,146,60,0.32)",
  "rgba(52,211,153,0.85)",
  "rgba(56,189,248,0.32)",
  "rgba(167,139,250,0.85)",
  "rgba(251,146,60,0.55)",
  "rgba(52,211,153,0.14)",
  "rgba(56,189,248,0.55)",
  "rgba(167,139,250,0.14)",
  "rgba(251,146,60,0.85)",
  "rgba(52,211,153,0.55)",
  "rgba(56,189,248,0.14)",
  "rgba(167,139,250,0.32)",
  "rgba(251,146,60,0.14)",
  "rgba(52,211,153,0.32)",
  "rgba(56,189,248,0.85)",
  "rgba(167,139,250,0.55)",
  "rgba(251,146,60,0.32)",
  "rgba(52,211,153,0.85)",
  "rgba(56,189,248,0.32)",
  "rgba(167,139,250,0.85)",
  "rgba(251,146,60,0.55)",
  "rgba(52,211,153,0.14)",
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !loading,
    [email, password, loading],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setLoading(true);

    try {
      const data = await loginWithEmail(email.trim(), password);
      saveToken(data.token);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <div className="w-full max-w-[368px] overflow-hidden rounded-3xl border border-white/[0.07] bg-bg shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
        <div className="px-6 pb-5 pt-6">
          <div className="mb-5 flex items-center gap-2.5">
            <BrandMark size={30} />
            <BrandWordmark className="text-[17px]" />
          </div>

          <h1 className="mb-1 text-[23px] font-extrabold leading-tight tracking-[-0.03em] text-[#f4f5f7]">
            Welcome back
          </h1>
          <p className="mb-4 text-[13px] leading-snug text-text-muted">
            Keep the loop going. Pick up right where you left off.
          </p>

          <div className="mb-4 flex gap-1.5 rounded-xl border border-white/[0.06] bg-bg-elevated p-1">
            <div className="flex-1 rounded-lg bg-bg-soft py-1.5 text-center text-[13px] font-semibold text-[#f2f3f5] shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
              Log in
            </div>
            <Link
              href="/register"
              className="flex-1 rounded-lg py-1.5 text-center text-[13px] font-semibold text-[#777c8a] transition hover:text-text-soft"
            >
              Sign up
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col">
            <label
              htmlFor="email"
              className="mb-1 text-[11px] font-semibold text-text-soft"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maya.rivers@gmail.com"
              className="mb-3 w-full rounded-lg border border-white/[0.08] bg-bg-elevated px-3.5 py-2.5 text-[14px] font-medium text-[#e3e5e9] outline-none placeholder:text-text-dim focus:border-[rgba(111,123,255,0.45)] focus:shadow-[0_0_0_3px_rgba(111,123,255,0.12)]"
            />

            <label
              htmlFor="password"
              className="mb-1 text-[11px] font-semibold text-text-soft"
            >
              Password
            </label>
            <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-bg-elevated px-3.5 py-2.5 focus-within:border-[rgba(111,123,255,0.45)] focus-within:shadow-[0_0_0_3px_rgba(111,123,255,0.12)]">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="min-w-0 flex-1 bg-transparent text-[14px] font-medium tracking-[0.08em] text-[#e3e5e9] outline-none placeholder:tracking-[0.2em] placeholder:text-text-dim"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="shrink-0 text-[11px] font-semibold text-brand-soft transition hover:text-white"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <Link
              href="/forgot-password"
              className="mb-3.5 mt-2 self-end text-[12px] font-semibold text-text-muted transition hover:text-text-soft"
            >
              Forgot password?
            </Link>

            {error ? (
              <p className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[13px] text-danger">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-gradient-to-b from-brand to-brand-strong py-3 text-center text-[14px] font-bold text-white shadow-[0_8px_22px_-6px_rgba(111,123,255,0.6),inset_0_1px_0_rgba(255,255,255,0.25)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>

          <div className="my-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-[11px] font-medium text-text-dim">or</span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          <button
            type="button"
            onClick={continueWithGoogle}
            className="w-full rounded-xl border border-white/[0.08] bg-bg-elevated py-2.5 text-center text-[13px] font-semibold text-[#e8e9ec] transition hover:bg-bg-soft"
          >
            Continue with Google
          </button>

          <p className="mt-4 text-center text-[13px] text-text-muted">
            New here?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#aeb3f5] transition hover:text-white"
            >
              Create an account
            </Link>
          </p>
        </div>

        <div className="border-t border-white/[0.06] px-6 py-3">
          <div className="mb-1.5 flex gap-1">
            {LOGIN_STRIP.map((color, index) => (
              <div
                key={`${color}-${index}`}
                className="h-2.5 flex-1 rounded-[3px]"
                style={{ background: color }}
              />
            ))}
          </div>
          <p className="text-center font-mono text-[10.5px] font-medium tracking-[0.02em] text-text-dim">
            every square is a day you showed up
          </p>
        </div>
      </div>
    </main>
  );
}
