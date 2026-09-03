"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AuthCard,
  AuthHeader,
  AuthToggle,
  fieldBoxClass,
  fieldInputClass,
  fieldLabelClass,
  googleButtonClass,
  primaryButtonClass,
} from "@/components/AuthCard";
import { continueWithGoogle, loginWithEmail, saveToken } from "@/lib/auth";

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
    <AuthCard>
      <AuthHeader
        title="Welcome back"
        subtitle="Keep the loop going. Pick up right where you left off."
      />
      <AuthToggle active="login" />

      <form onSubmit={handleSubmit} className="flex flex-col">
        <label htmlFor="email" className={fieldLabelClass}>
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="maya.rivers@gmail.com"
          className={`${fieldInputClass} mb-3`}
        />

        <label htmlFor="password" className={fieldLabelClass}>
          Password
        </label>
        <div className={fieldBoxClass}>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] font-medium tracking-[0.08em] text-text-body outline-none placeholder:tracking-[0.2em] placeholder:text-text-dim"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="shrink-0 text-[11px] font-semibold text-brand-soft transition hover:text-text"
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

        <button type="submit" disabled={!canSubmit} className={primaryButtonClass}>
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <div className="my-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-bg-muted" />
        <span className="text-[11px] font-medium text-text-dim">or</span>
        <div className="h-px flex-1 bg-bg-muted" />
      </div>

      <button
        type="button"
        onClick={continueWithGoogle}
        className={googleButtonClass}
      >
        Continue with Google
      </button>

      <p className="mt-auto pt-3 text-center text-[12.5px] text-text-muted">
        New here?{" "}
        <Link
          href="/register"
          className="font-semibold text-brand-soft transition hover:text-text"
          prefetch
        >
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
