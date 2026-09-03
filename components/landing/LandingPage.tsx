"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark, BrandWordmark } from "@/components/BrandMark";
import { PageLoader } from "@/components/LoadingSpinner";
import { getToken } from "@/lib/auth";
import {
  landFeatures,
  landNav,
  landPeriods,
  landProof,
  landSteps,
  landingHabits,
  loginStrip,
} from "@/lib/landingMock";

const btnPrimary =
  "inline-flex items-center justify-center rounded-[13px] bg-gradient-to-b from-[#7a86ff] to-[#5d69f0] px-[26px] py-4 text-[16px] font-bold text-white shadow-[0_12px_28px_-8px_rgba(111,123,255,0.65),inset_0_1px_0_rgba(255,255,255,0.25)] transition hover:brightness-110";
const btnGhost =
  "inline-flex items-center justify-center rounded-[13px] border border-white/10 bg-[#15171c] px-6 py-4 text-[16px] font-semibold text-[#d3d6de] transition hover:border-white/16 hover:text-white";

function FreezePips({ size = "sm" }: { size?: "sm" | "md" }) {
  const w = size === "sm" ? "h-[11px] w-[8px]" : "h-[14px] w-[11px]";
  return (
    <div className="flex gap-[2.5px]">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className={`${w} rounded-[2px] bg-gradient-to-b from-[#7dd3fc] to-[#38bdf8]`}
        />
      ))}
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="landing-preview rounded-[18px] border border-white/[0.08] bg-[#0e1014] px-[22px] py-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)] sm:px-[26px]">
      <div className="mb-[22px] flex items-end justify-between gap-4">
        <div>
          <div className="text-[17px] font-bold tracking-[-0.02em] text-[#f2f3f5]">
            This week on the loop
          </div>
          <div className="mt-1 font-mono text-[12px] font-medium text-[#6b7280]">
            30 weeks of history · 4 habits
          </div>
        </div>
        <div className="flex flex-none items-center gap-[7px] rounded-[10px] border border-[rgba(56,189,248,0.25)] bg-[#15171c] px-[11px] py-[7px]">
          <FreezePips />
          <span className="text-[12px] font-semibold text-[#cfe9fb]">
            3 freezes
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        {landingHabits.map((h) => (
          <div
            key={h.name}
            className="flex items-center gap-3 rounded-[13px] border border-white/[0.06] bg-[#12141a] px-3.5 py-3 sm:gap-4 sm:px-[15px]"
          >
            <div className="w-[88px] flex-none sm:w-[118px]">
              <div className="mb-1 flex items-center gap-2">
                <div
                  className="h-[7px] w-[7px] rounded-[2px]"
                  style={{ background: h.color }}
                />
                <span className="truncate text-[13px] font-semibold text-[#e8e9ec] sm:text-[14px]">
                  {h.name}
                </span>
              </div>
              <div className="pl-[15px] font-mono text-[10px] font-medium text-[#6b7280] sm:text-[11px]">
                {h.goalLabel}
              </div>
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex w-max max-w-none gap-[2.5px]">
                {h.mini.map((week, wi) => (
                  <div
                    key={wi}
                    className="flex shrink-0 flex-col gap-[2.5px]"
                  >
                    {week.map((c, di) => (
                      <div
                        key={di}
                        className="h-[9px] w-[9px] shrink-0 rounded-[2px]"
                        style={{
                          width: 9,
                          height: 9,
                          background: c,
                          border: "1px solid rgba(255,255,255,0.04)",
                          boxSizing: "border-box",
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="w-[58px] flex-none text-right sm:w-[74px]">
              <div
                className="text-[17px] font-bold tracking-[-0.02em] sm:text-[19px]"
                style={{ color: h.color }}
              >
                {h.streak}
              </div>
              <div className="font-mono text-[10px] font-medium tracking-[0.04em] text-[#5f6472]">
                LOOPS
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token) {
      router.replace("/dashboard");
      return;
    }
    setChecking(false);
  }, [router]);

  if (checking) {
    return <PageLoader label="Loading…" />;
  }

  return (
    <div className="landing min-h-dvh overflow-x-hidden bg-bg text-text">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-360px] h-[700px] w-[min(1200px,160vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(111,123,255,0.20),rgba(111,123,255,0))]"
        />

        <header className="relative flex h-[64px] items-center justify-between border-b border-white/[0.06] px-5 sm:h-[76px] sm:px-8 lg:px-14">
          <Link href="/" className="flex items-center gap-[11px]">
            <BrandMark size={30} />
            <BrandWordmark className="text-[17px]" />
          </Link>

          <nav className="hidden items-center gap-[30px] md:flex">
            {landNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[14px] font-medium text-[#8d92a0] transition hover:text-[#d5d8ff]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden px-1 py-[9px] text-[14px] font-semibold text-[#b6bac6] transition hover:text-white sm:inline"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-[11px] bg-gradient-to-b from-[#7a86ff] to-[#5d69f0] px-3.5 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(111,123,255,0.7),inset_0_1px_0_rgba(255,255,255,0.25)] sm:px-[18px] sm:text-[14px]"
            >
              Start free
            </Link>
            <button
              type="button"
              aria-label="Menu"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-[10px] border border-white/[0.08] text-[#9aa0ab] md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="font-mono text-[18px]">{menuOpen ? "×" : "☰"}</span>
            </button>
          </div>
        </header>

        {menuOpen ? (
          <div className="relative border-b border-white/[0.06] bg-[#0e1014] px-5 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              {landNav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-[15px] font-medium text-[#c3c7d1]"
                >
                  {item.label}
                </a>
              ))}
              <Link
                href="/login"
                className="text-[15px] font-semibold text-[#aeb3f5]"
                onClick={() => setMenuOpen(false)}
              >
                Log in
              </Link>
            </div>
          </div>
        ) : null}

        <section className="relative grid items-center gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pb-[78px] sm:pt-[56px] lg:grid-cols-[minmax(0,560px)_1fr] lg:gap-16 lg:px-14 lg:pt-[74px]">
          <div className="landing-hero-copy max-w-[540px]">
            <div className="mb-6 inline-flex items-center gap-[9px] rounded-full border border-[rgba(56,189,248,0.28)] bg-[rgba(56,189,248,0.10)] py-[7px] pl-[9px] pr-[13px]">
              <FreezePips />
              <span className="font-mono text-[11px] font-semibold tracking-[0.04em] text-[#a9dcf5] sm:text-[12px]">
                FREEZE TOKENS ARE LIVE
              </span>
            </div>

            <h1 className="mb-5 text-[40px] font-extrabold leading-[1.03] tracking-[-0.038em] text-[#f6f7f9] text-pretty sm:mb-5 sm:text-[52px] lg:text-[60px]">
              Count habits in loops,
              <br className="hidden sm:block" /> not days.
            </h1>
            <p className="mb-8 max-w-[480px] text-[16px] font-normal leading-relaxed text-[#868b99] text-pretty sm:mb-[34px] sm:text-[18px]">
              Daily, weekly, monthly — every habit follows one rule. Hit the
              target before the period ends and the loop closes. Your streak is
              the number of periods you kept closing.
            </p>

            <div className="mb-5 flex flex-col gap-3 sm:mb-[22px] sm:flex-row sm:items-center sm:gap-3.5">
              <Link href="/register" className={btnPrimary}>
                Start your first loop
              </Link>
              <Link href="/login" className={btnGhost}>
                See the dashboard
              </Link>
            </div>
            <p className="font-mono text-[12px] font-medium tracking-[0.01em] text-[#5f6472] sm:text-[13px]">
              3 habits free forever · no card · export anytime
            </p>
          </div>

          <div className="landing-hero-visual min-w-0">
            <HeroPreview />
          </div>
        </section>
      </div>

      {/* Proof strip */}
      <div
        id="product"
        className="grid border-y border-white/[0.06] bg-[#0a0b0e] sm:grid-cols-3"
      >
        {landProof.map((p, i) => (
          <div
            key={p.label}
            className={`flex items-baseline gap-3 px-5 py-6 sm:gap-3 sm:px-8 sm:py-[26px] lg:px-14 ${
              i > 0 ? "border-t border-white/[0.05] sm:border-t-0 sm:border-l" : ""
            }`}
          >
            <span className="text-[26px] font-extrabold tracking-[-0.03em] text-[#f2f3f5] sm:text-[30px]">
              {p.value}
            </span>
            <span className="text-[13px] leading-snug text-[#767b89] sm:text-[13.5px]">
              {p.label}
            </span>
          </div>
        ))}
      </div>

      {/* Periods */}
      <section className="px-5 py-16 sm:px-8 sm:py-[82px] lg:px-14">
        <div className="mb-10 max-w-[640px] sm:mb-11">
          <div className="mb-3.5 font-mono text-[11px] font-semibold tracking-[0.18em] text-[#6f7bff] sm:text-[11.5px]">
            ONE RULE, EVERY RHYTHM
          </div>
          <h2 className="mb-3.5 text-[32px] font-extrabold leading-[1.1] tracking-[-0.032em] text-[#f4f5f7] text-pretty sm:text-[40px]">
            A period is closed, or it isn&apos;t.
          </h2>
          <p className="m-0 text-[16px] leading-relaxed text-[#868b99] text-pretty sm:text-[17px]">
            Most trackers punish you for having a habit that isn&apos;t daily.
            HabitLoop counts consecutive satisfied periods, so a monthly habit
            gets a real streak too.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {landPeriods.map((p) => (
            <div
              key={p.kind}
              className="rounded-2xl border border-white/[0.07] bg-[#0e1014] px-[26px] pb-6 pt-[26px]"
            >
              <div className="mb-5 flex items-center justify-between">
                <span
                  className="font-mono text-[11px] font-bold tracking-[0.16em] sm:text-[11.5px]"
                  style={{ color: p.color }}
                >
                  {p.kind}
                </span>
                <span className="font-mono text-[12px] font-medium text-[#5f6472]">
                  {p.habit}
                </span>
              </div>
              <div className="mb-[22px] flex flex-wrap gap-[2.5px]">
                {p.cells.map((c, i) => (
                  <div
                    key={i}
                    className="h-[9px] w-[9px] shrink-0 rounded-[2px]"
                    style={{
                      background: c.bg,
                      border: c.border,
                      boxShadow: c.glow,
                    }}
                  />
                ))}
              </div>
              <div className="mb-1.5 text-[15px] font-semibold text-[#e8e9ec]">
                {p.rule}
              </div>
              <div className="text-[13.5px] text-[#767b89]">
                Streak reads{" "}
                <span className="font-semibold" style={{ color: p.color }}>
                  {p.streak}
                </span>{" "}
                — in its own unit, never faked into days.
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="px-5 pb-16 sm:px-8 sm:pb-[88px] lg:px-14"
      >
        <div className="grid gap-5 md:grid-cols-2">
          {landFeatures.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/[0.07] bg-[#0e1014] px-7 py-7 sm:px-[30px] sm:py-7"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-[11px]">
                  <div
                    className="h-[9px] w-[9px] rounded-[3px]"
                    style={{
                      background: f.accent,
                      boxShadow: `0 0 12px -1px ${f.accent}`,
                    }}
                  />
                  <span className="text-[18px] font-bold tracking-[-0.02em] text-[#f2f3f5] sm:text-[19px]">
                    {f.title}
                  </span>
                </div>
                <span className="flex-none rounded-[7px] bg-[#15171c] px-[9px] py-[5px] font-mono text-[10px] font-semibold tracking-[0.08em] text-[#6b7280] sm:text-[11px]">
                  {f.tag}
                </span>
              </div>
              <p className="m-0 text-[15px] leading-relaxed text-[#868b99] text-pretty">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how"
        className="px-5 pb-16 sm:px-8 sm:pb-[92px] lg:px-14"
      >
        <div className="rounded-[18px] border border-white/[0.06] bg-[#0a0b0e] px-6 py-10 sm:px-12 sm:py-11">
          <div className="mb-[30px] font-mono text-[11px] font-semibold tracking-[0.18em] text-[#6f7bff] sm:text-[11.5px]">
            HOW IT WORKS
          </div>
          <div className="grid gap-8 md:grid-cols-3 md:gap-8">
            {landSteps.map((s) => (
              <div
                key={s.n}
                className="border-t border-white/10 pt-5"
              >
                <div className="mb-3 font-mono text-[13px] font-bold tracking-[0.06em] text-[#8a92ff]">
                  {s.n}
                </div>
                <div className="mb-[9px] text-[20px] font-bold tracking-[-0.022em] text-[#f2f3f5]">
                  {s.title}
                </div>
                <p className="m-0 text-[15px] leading-relaxed text-[#868b99] text-pretty">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-t border-white/[0.06] px-5 py-16 sm:px-8 sm:py-[84px] lg:px-14">
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-420px] left-1/2 h-[640px] w-[min(1100px,160vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(111,123,255,0.18),rgba(111,123,255,0))]"
        />
        <div className="relative mx-auto max-w-[620px] text-center">
          <h2 className="mb-4 text-[32px] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#f6f7f9] text-pretty sm:text-[42px]">
            Close your first loop tonight.
          </h2>
          <p className="mb-[30px] text-[16px] leading-relaxed text-[#868b99] sm:text-[17px]">
            Pick a habit, set a rhythm, log one session. The streak starts at
            one.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-3.5">
            <Link href="/register" className={btnPrimary}>
              Start free
            </Link>
            <Link href="/login" className={btnGhost}>
              Log in
            </Link>
          </div>
        </div>

        <div className="relative mt-14 flex gap-1 sm:mt-16">
          {loginStrip.map((c, i) => (
            <div
              key={i}
              className="h-3 flex-1 rounded-[3px] sm:h-4"
              style={{ background: c }}
            />
          ))}
        </div>
        <p className="relative mt-3 text-center font-mono text-[11px] font-medium tracking-[0.02em] text-[#5b6070] sm:text-[11.5px]">
          every square is a period you closed
        </p>
      </section>

      <footer className="flex h-[70px] flex-col items-start justify-center gap-3 border-t border-white/[0.06] bg-[#0a0b0e] px-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-14">
        <span className="font-mono text-[12px] font-medium text-[#5f6472] sm:text-[12.5px]">
          © 2026 HabitLoop
        </span>
        <div className="flex flex-wrap gap-5 sm:gap-[26px]">
          {["Privacy", "Terms", "Changelog", "Contact"].map((label) => (
            <span
              key={label}
              className="text-[13px] font-medium text-[#767b89]"
            >
              {label}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}
