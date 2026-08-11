import { ReactNode } from "react";
import Link from "next/link";
import { BrandMark, BrandWordmark } from "@/components/BrandMark";

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

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <div
        className={`flex w-full max-w-[368px] flex-col overflow-hidden rounded-3xl border border-white/[0.07] bg-bg shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] ${CARD_HEIGHT}`}
      >
        <div className="flex flex-1 flex-col px-6 pb-4 pt-5">{children}</div>

        <div className="shrink-0 border-t border-white/[0.06] px-6 py-2.5">
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
      <div className="mb-4 flex items-center gap-2.5">
        <BrandMark size={28} />
        <BrandWordmark className="text-[16px]" />
      </div>

      <h1 className="mb-1 text-[22px] font-extrabold leading-tight tracking-[-0.03em] text-[#f4f5f7]">
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
    "flex-1 rounded-lg bg-bg-soft py-1.5 text-center text-[13px] font-semibold text-[#f2f3f5] shadow-[0_1px_2px_rgba(0,0,0,0.3)]";
  const inactiveClass =
    "flex-1 rounded-lg py-1.5 text-center text-[13px] font-semibold text-[#777c8a] transition hover:text-text-soft";

  return (
    <div className="mb-3 flex gap-1.5 rounded-xl border border-white/[0.06] bg-bg-elevated p-1">
      {active === "login" ? (
        <div className={activeClass}>Log in</div>
      ) : (
        <Link href="/login" className={inactiveClass}>
          Log in
        </Link>
      )}

      {active === "register" ? (
        <div className={activeClass}>Sign up</div>
      ) : (
        <Link href="/register" className={inactiveClass}>
          Sign up
        </Link>
      )}
    </div>
  );
}

export const fieldLabelClass =
  "mb-0.5 text-[11px] font-semibold text-text-soft";

export const fieldInputClass =
  "w-full rounded-lg border border-white/[0.08] bg-bg-elevated px-3.5 py-2 text-[13.5px] font-medium text-[#e3e5e9] outline-none placeholder:text-text-dim focus:border-[rgba(111,123,255,0.45)] focus:shadow-[0_0_0_3px_rgba(111,123,255,0.12)]";

export const fieldBoxClass =
  "flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-bg-elevated px-3.5 py-2 focus-within:border-[rgba(111,123,255,0.45)] focus-within:shadow-[0_0_0_3px_rgba(111,123,255,0.12)]";

export const primaryButtonClass =
  "rounded-xl bg-gradient-to-b from-brand to-brand-strong py-2.5 text-center text-[14px] font-bold text-white shadow-[0_8px_22px_-6px_rgba(111,123,255,0.6),inset_0_1px_0_rgba(255,255,255,0.25)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60";

export const googleButtonClass =
  "w-full rounded-xl border border-white/[0.08] bg-bg-elevated py-2.5 text-center text-[13px] font-semibold text-[#e8e9ec] transition hover:bg-bg-soft";
