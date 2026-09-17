"use client";

import { memo, useId, useMemo, useState } from "react";

export type ConsistencyMonthBar = {
  label: string;
  shortLabel?: string;
  pct: number;
  fill: string;
  met?: number;
  total?: number;
  isBest?: boolean;
  isCurrent?: boolean;
  inRange?: boolean;
};

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function shortFor(month: ConsistencyMonthBar, index: number) {
  return month.shortLabel ?? MONTH_SHORT[index] ?? month.label;
}

export const ConsistencyChart = memo(function ConsistencyChart({
  months,
}: {
  months: ConsistencyMonthBar[];
}) {
  const tipId = useId();
  const [hovered, setHovered] = useState<number | null>(null);

  const summary = useMemo(() => {
    const withData = months.filter((m) => (m.total ?? 0) > 0);
    const met = withData.reduce((sum, m) => sum + (m.met ?? 0), 0);
    const total = withData.reduce((sum, m) => sum + (m.total ?? 0), 0);
    const overall =
      total === 0 ? 0 : Math.round((met / total) * 100);
    const best = months.find((m) => m.isBest) ?? null;
    return { met, total, overall, best, hasData: total > 0 || months.some((m) => m.pct > 0) };
  }, [months]);

  const active = hovered != null ? months[hovered] : null;
  const activeIndex = hovered ?? months.findIndex((m) => m.isCurrent);
  const focus =
    active ??
    (activeIndex >= 0 ? months[activeIndex] : summary.best) ??
    null;
  const focusIndex =
    activeIndex >= 0
      ? activeIndex
      : focus
        ? months.findIndex((m) => m === focus)
        : -1;

  return (
    <section className="relative overflow-hidden rounded-[16px] border border-border-soft bg-bg-elevated p-[20px]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-[0.55]"
        style={{
          background:
            "radial-gradient(120% 80% at 100% -10%, rgba(111,123,255,0.16), transparent 55%)",
        }}
      />

      <div className="relative mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-[14px] font-bold text-text-heading">
            Consistency
          </h3>
          <p className="m-0 mt-0.5 text-[11.5px] font-medium leading-snug text-text-muted">
            % of period goals met each month
          </p>
        </div>

        <div className="flex flex-none flex-col items-end gap-1.5">
          <span className="rounded-full border border-border-soft bg-bg-muted px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-text-dim">
            12 MONTHS
          </span>
          {summary.hasData ? (
            <span className="font-mono text-[11px] font-bold text-[color:var(--accent-stat)]">
              {summary.overall}% overall
            </span>
          ) : null}
        </div>
      </div>

      {!summary.hasData ? (
        <div className="relative rounded-[12px] border border-dashed border-border bg-bg-muted/50 px-4 py-9 text-center">
          <p className="m-0 text-[12.5px] font-medium text-text-muted">
            Log a few sessions and your monthly consistency will show up here.
          </p>
        </div>
      ) : (
        <>
          <div className="relative mb-3 flex flex-wrap items-center gap-2">
            {focus && focusIndex >= 0 ? (
              <div className="rounded-[10px] border border-border-soft bg-bg-muted/80 px-3 py-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] font-semibold text-text-body">
                    {shortFor(focus, focusIndex)}
                  </span>
                  <span className="font-mono text-[13px] font-bold text-[color:var(--accent-stat)]">
                    {(focus.total ?? 0) === 0 ? "—" : `${focus.pct}%`}
                  </span>
                </div>
                <p className="m-0 mt-0.5 font-mono text-[10.5px] font-medium text-text-dim">
                  {(focus.total ?? 0) === 0
                    ? "No closed periods"
                    : `${focus.met ?? 0} of ${focus.total} goals met`}
                  {focus.isBest ? " · best month" : ""}
                  {focus.isCurrent && !focus.isBest ? " · current" : ""}
                </p>
              </div>
            ) : null}

            {summary.best && summary.best !== focus ? (
              <div className="rounded-[10px] border border-[rgba(111,123,255,0.22)] bg-[rgba(111,123,255,0.1)] px-2.5 py-1.5">
                <span className="font-mono text-[10.5px] font-semibold text-[color:var(--accent-stat)]">
                  Best · {summary.best.pct}%
                </span>
              </div>
            ) : null}
          </div>

          <div
            className="relative mb-2 flex h-[132px] items-end gap-1.5"
            onMouseLeave={() => setHovered(null)}
          >
            {/* soft guide lines */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-[22px] top-0"
            >
              {[25, 50, 75, 100].map((mark) => (
                <div
                  key={mark}
                  className="absolute inset-x-0 border-t border-dashed border-border-soft/80"
                  style={{ bottom: `${mark}%` }}
                />
              ))}
            </div>

            {months.map((m, idx) => {
              const empty = (m.total ?? 0) === 0 && m.pct <= 0;
              const heightPct = empty ? 0 : Math.max(8, Math.min(100, m.pct));
              const isFocus = idx === focusIndex;
              const label = shortFor(m, idx);

              return (
                <button
                  key={`${m.label}-${idx}`}
                  type="button"
                  aria-describedby={tipId}
                  aria-label={`${label}: ${empty ? "no data" : `${m.pct}% · ${m.met ?? 0} of ${m.total ?? 0} goals met`}`}
                  onMouseEnter={() => setHovered(idx)}
                  onFocus={() => setHovered(idx)}
                  className="group relative z-[1] flex h-full flex-1 flex-col items-center justify-end gap-1.5 rounded-[8px] outline-none focus-visible:ring-2 focus-visible:ring-[rgba(111,123,255,0.45)]"
                >
                  <span
                    className="font-mono text-[9.5px] font-bold tabular-nums transition-opacity"
                    style={{
                      color: m.isBest
                        ? "var(--accent-stat)"
                        : "var(--text-muted)",
                      opacity: empty ? 0.35 : isFocus ? 1 : 0.72,
                    }}
                  >
                    {empty ? "·" : m.pct}
                  </span>

                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-[5px] transition-[height,box-shadow,opacity] duration-200"
                      style={{
                        height: empty ? "3px" : `${heightPct}%`,
                        background: empty ? "var(--heat-empty)" : m.fill,
                        opacity: m.inRange === false ? 0.35 : isFocus ? 1 : 0.82,
                        boxShadow: m.isBest
                          ? "0 8px 18px -8px rgba(111,123,255,0.55)"
                          : m.isCurrent
                            ? "0 0 0 1.5px rgba(111,123,255,0.4)"
                            : isFocus
                              ? "0 0 0 1px rgba(255,255,255,0.12)"
                              : undefined,
                      }}
                    />
                  </div>

                  <span
                    className="max-w-full truncate font-mono text-[9px] font-semibold leading-none tracking-tight transition-colors sm:text-[10px]"
                    style={{
                      color:
                        m.isCurrent || m.isBest
                          ? "var(--accent-stat)"
                          : "var(--text-dim)",
                    }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          <p id={tipId} className="sr-only">
            Hover or focus a month bar to see goals met for that month.
          </p>

          <div className="relative mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border-soft pt-3 text-[10.5px] font-medium text-text-dim">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-[2px]"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(52,211,153,0.85), rgba(52,211,153,0.35))",
                }}
              />
              80%+
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-[2px]"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(138,146,255,0.75), rgba(111,123,255,0.35))",
                }}
              />
              50–79%
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-[2px]"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(251,146,60,0.7), rgba(251,146,60,0.28))",
                }}
              />
              &lt;50%
            </span>
            {summary.total > 0 ? (
              <span className="ml-auto font-mono text-[10px] text-text-dim">
                {summary.met}/{summary.total} goals this year
              </span>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
});
