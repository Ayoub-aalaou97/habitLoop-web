"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { AuthCard } from "@/components/AuthCard";
import { SheetPortal } from "@/components/dashboard/SheetPortal";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export type AuthMode = "login" | "register";

type AuthModalProps = {
  open: boolean;
  mode: AuthMode;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
};

const LoginForm = dynamic(
  () => import("@/components/auth/LoginForm").then((m) => m.LoginForm),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center py-16">
        <LoadingSpinner size="md" label="Loading…" />
      </div>
    ),
  },
);

const RegisterForm = dynamic(
  () => import("@/components/auth/RegisterForm").then((m) => m.RegisterForm),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center py-16">
        <LoadingSpinner size="md" label="Loading…" />
      </div>
    ),
  },
);

export function AuthModal({
  open,
  mode,
  onClose,
  onModeChange,
}: AuthModalProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <SheetPortal open={open}>
      <div
        className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6"
        role="presentation"
      >
        <button
          type="button"
          aria-label="Dismiss"
          className="absolute inset-0 bg-[rgba(8,9,11,0.62)] backdrop-blur-[2px] transition"
          onClick={onClose}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label={mode === "login" ? "Log in" : "Create account"}
          className="relative z-[1] w-full max-w-[400px] max-sm:max-h-[min(94dvh,760px)] max-sm:overflow-y-auto max-sm:rounded-t-[28px] max-sm:pb-[env(safe-area-inset-bottom,0px)] sm:overflow-visible"
        >
          <AuthCard variant="modal" onClose={onClose}>
            {mode === "login" ? (
              <LoginForm onSwitchToRegister={() => onModeChange("register")} />
            ) : (
              <RegisterForm onSwitchToLogin={() => onModeChange("login")} />
            )}
          </AuthCard>
        </div>
      </div>
    </SheetPortal>
  );
}
