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
import { continueWithGoogle, registerWithEmail, saveToken } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () =>
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      email.trim().length > 0 &&
      password.length > 0 &&
      confirmPassword.length > 0 &&
      !loading,
    [firstName, lastName, email, password, confirmPassword, loading],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await registerWithEmail({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
        password_confirmation: confirmPassword,
      });
      saveToken(data.token);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      <AuthHeader
        title="Start your loop"
        subtitle="Create an account and build habits that stick."
      />
      <AuthToggle active="register" />

      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="mb-2.5 flex gap-2.5">
          <div className="flex min-w-0 flex-1 flex-col">
            <label htmlFor="first_name" className={fieldLabelClass}>
              First name
            </label>
            <input
              id="first_name"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Maya"
              className={fieldInputClass}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <label htmlFor="last_name" className={fieldLabelClass}>
              Last name
            </label>
            <input
              id="last_name"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Rivers"
              className={fieldInputClass}
            />
          </div>
        </div>

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
          className={`${fieldInputClass} mb-2.5`}
        />

        <label htmlFor="password" className={fieldLabelClass}>
          Password
        </label>
        <div className={`${fieldBoxClass} mb-2.5`}>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] font-medium text-text-body outline-none placeholder:text-text-dim"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="shrink-0 text-[11px] font-semibold text-brand-soft transition hover:text-text"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <label htmlFor="password_confirmation" className={fieldLabelClass}>
          Confirm password
        </label>
        <input
          id="password_confirmation"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat your password"
          className={`${fieldInputClass} mb-3`}
        />

        {error ? (
          <p className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[13px] text-danger">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={!canSubmit} className={primaryButtonClass}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <div className="my-2.5 flex items-center gap-3">
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
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand-soft transition hover:text-text"
        >
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
