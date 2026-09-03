import { ReactNode } from "react";
import Link from "next/link";
import { BrandMark, BrandWordmark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";

const STRIP = [
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

/**
 * Both auth pages share this floor so they render at the same height.
 * It is a minimum, not a fixed height: content is never clipped or scrolled,
 * it just grows the card (e.g. when a validation banner appears).
 */
const CARD_HEIGHT = "sm:min-h-[620px]";

function BackArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 6 9 12l6 6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-bg p-4">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 sm:left-6 sm:top-6">
        <Link
          href="/"
          aria-label="Back to HabitLoop home"
          className="inline-flex h-10 items-center gap-1.5 rounded-[11px] border border-border-soft bg-bg-elevated px-3 text-[13px] font-semibold text-text-muted transition hover:border-border hover:bg-bg-muted hover:text-text"
        >
          <BackArrowIcon />
          <span className="hidden sm:inline">Back</span>
        </Link>
      </div>

      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div
        className={`flex w-full max-w-[368px] flex-col overflow-hidden rounded-3xl border border-border bg-bg-elevated shadow-[var(--shadow-card)] ${CARD_HEIGHT}`}
      >
        <div className="flex flex-1 flex-col px-6 pb-4 pt-5">{children}</div>

        <div className="shrink-0 border-t border-border-soft px-6 py-2.5">
          <div className="mb-1.5 flex gap-1">
            {STRIP.map((color, index) => (
              <div
                key={`${color}-${index}`}
                className="h-2 flex-1 rounded-[3px]"
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

export function AuthHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <>
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-2.5 rounded-lg outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[rgba(111,123,255,0.35)]"
        aria-label="HabitLoop home"
      >
        <BrandMark size={28} />
        <BrandWordmark className="text-[16px]" />
      </Link>

      <h1 className="mb-1 text-[22px] font-extrabold leading-tight tracking-[-0.03em] text-text">
        {title}
      </h1>
      <p className="mb-3 text-[12.5px] leading-snug text-text-muted">
        {subtitle}
      </p>
    </>
  );
}

export function AuthToggle({ active }: { active: "login" | "register" }) {
  const activeClass =
    "flex-1 rounded-lg bg-bg-elevated py-1.5 text-center text-[13px] font-semibold text-text-heading shadow-[0_1px_2px_rgba(15,18,26,0.08)]";
  const inactiveClass =
    "flex-1 rounded-lg py-1.5 text-center text-[13px] font-semibold text-text-muted transition hover:text-text-soft";

  return (
    <div
      className="mb-3 flex gap-1.5 rounded-xl border border-border-soft bg-bg-soft p-1"
      role="tablist"
      aria-label="Account options"
    >
      {active === "login" ? (
        <div className={activeClass} role="tab" aria-selected="true">
          Log in
        </div>
      ) : (
        <Link
          href="/login"
          className={inactiveClass}
          role="tab"
          aria-selected="false"
          prefetch
        >
          Log in
        </Link>
      )}

      {active === "register" ? (
        <div className={activeClass} role="tab" aria-selected="true">
          Sign up
        </div>
      ) : (
        <Link
          href="/register"
          className={inactiveClass}
          role="tab"
          aria-selected="false"
          prefetch
        >
          Sign up
        </Link>
      )}
    </div>
  );
}

export const fieldLabelClass =
  "mb-0.5 text-[11px] font-semibold text-text-soft";

export const fieldInputClass =
  "w-full rounded-lg border border-border bg-bg-soft px-3.5 py-2 text-[13.5px] font-medium text-text-body outline-none placeholder:text-text-dim focus:border-[rgba(111,123,255,0.45)] focus:shadow-[0_0_0_3px_rgba(111,123,255,0.12)]";

export const fieldBoxClass =
  "flex items-center gap-2.5 rounded-lg border border-border bg-bg-soft px-3.5 py-2 focus-within:border-[rgba(111,123,255,0.45)] focus-within:shadow-[0_0_0_3px_rgba(111,123,255,0.12)]";

export const primaryButtonClass =
  "rounded-xl bg-gradient-to-b from-brand to-brand-strong py-2.5 text-center text-[14px] font-bold text-white shadow-[0_8px_22px_-6px_rgba(111,123,255,0.6),inset_0_1px_0_rgba(255,255,255,0.25)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60";

export const googleButtonClass =
  "w-full rounded-xl border border-border bg-bg-soft py-2.5 text-center text-[13px] font-semibold text-text-heading transition hover:bg-bg-muted";
