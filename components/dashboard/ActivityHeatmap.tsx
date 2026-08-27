"use client";

import { useEffect, useRef, useState } from "react";
import type { ActivityWeek } from "@/lib/habitDetailMock";
import { habitColorWithAlpha } from "@/lib/habitDetailMock";

const LABEL_W = 32;
const GAP = 3;
const MIN_CELL = 10;
const SCROLL_CELL = 12;
const MAX_CELL = 16;

const DATE_TOOLTIP = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function cellTitle(
  dateKey: string | null,
  checked: boolean,
): string | undefined {
  if (!dateKey) return undefined;
  const [y, m, d] = dateKey.split("-").map(Number);
  const label = DATE_TOOLTIP.format(new Date(y!, (m ?? 1) - 1, d ?? 1));
  return checked ? `${label} · checked in` : label;
}

function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const measure = () => setWidth(node.clientWidth);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

export function ActivityHeatmap({
  weeks,
  dayLabels,
  color,
}: {
  weeks: ActivityWeek[];
  dayLabels: string[];
  color: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { ref: measureRef, width } = useContainerWidth();
  const legend = [0.045, 0.2, 0.42, 0.68, 0.95];

  const available = Math.max(0, width - LABEL_W);
  const minGridWidth =
    weeks.length * MIN_CELL + Math.max(0, weeks.length - 1) * GAP;
  const needsScroll = width > 0 && available < minGridWidth;

  const cell = (() => {
    if (needsScroll || width === 0 || weeks.length === 0) return SCROLL_CELL;
    const fitted = Math.floor(
      (available - Math.max(0, weeks.length - 1) * GAP) / weeks.length,
    );
    return Math.min(MAX_CELL, Math.max(MIN_CELL, fitted));
  })();

  const gridWidth =
    weeks.length * cell + Math.max(0, weeks.length - 1) * GAP;

  useEffect(() => {
    if (!needsScroll) return;
    const node = scrollRef.current;
    if (!node) return;
    node.scrollLeft = node.scrollWidth;
  }, [needsScroll, weeks.length, cell]);

  return (
    <section className="rounded-[18px] border border-white/[0.06] bg-bg-elevated px-4 py-5 sm:px-[26px] sm:py-[24px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
        <div className="flex items-baseline gap-2">
          <h3 className="m-0 text-[15px] font-bold text-[#e8e9ec] sm:text-[16px]">
            Activity
          </h3>
          <span className="font-mono text-[11px] font-semibold text-[#6b7280]">
            {new Date().getFullYear()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-medium text-[#6b7280] sm:text-[11px]">
            Less
          </span>
          <div className="flex gap-[3px]">
            {legend.map((alpha, idx) => (
              <div
                key={`lg-${idx}`}
                className="h-2.5 w-2.5 rounded-[2px] sm:h-3 sm:w-3 sm:rounded-[3px]"
                style={{
                  background:
                    idx === 0
                      ? "rgba(255,255,255,0.045)"
                      : habitColorWithAlpha(color, alpha),
                }}
              />
            ))}
          </div>
          <span className="font-mono text-[10px] font-medium text-[#6b7280] sm:text-[11px]">
            More
          </span>
        </div>
      </div>

      {needsScroll ? (
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[10px] font-medium text-[#5b6070]">
            Swipe to explore the year
          </span>
          <span className="font-mono text-[10px] font-medium text-[#6b7280]">
            →
          </span>
        </div>
      ) : null}

      <div ref={measureRef} className="w-full">
        <div className="flex w-full">
          <div
            className="flex flex-none flex-col"
            style={{ width: LABEL_W, paddingTop: 16, gap: GAP }}
          >
            {dayLabels.map((label, idx) => (
              <div
                key={`dl-${idx}`}
                className="flex items-center font-mono text-[9px] font-medium text-[#5b6070] sm:text-[10px]"
                style={{ height: cell }}
              >
                {label}
              </div>
            ))}
          </div>

          <div
            ref={scrollRef}
            className={`min-w-0 flex-1 pb-1 ${
              needsScroll
                ? "overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
                : "overflow-hidden"
            }`}
            style={
              needsScroll
                ? {
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgba(255,255,255,0.18) transparent",
                  }
                : undefined
            }
          >
            <div style={{ width: gridWidth, maxWidth: "100%" }}>
              <div
                className="relative mb-1"
                style={{ height: 14, width: gridWidth }}
              >
                {weeks.map((week, idx) =>
                  week.label ? (
                    <span
                      key={`ml-${idx}`}
                      className="absolute top-0 whitespace-nowrap font-mono text-[9px] font-medium text-[#6b7280] sm:text-[10px]"
                      style={{ left: idx * (cell + GAP) }}
                    >
                      {week.label}
                    </span>
                  ) : null,
                )}
              </div>

              <div className="flex" style={{ gap: GAP, width: gridWidth }}>
                {weeks.map((week, wIdx) => (
                  <div
                    key={`wk-${wIdx}`}
                    className="flex flex-col"
                    style={{ width: cell, gap: GAP }}
                  >
                    {week.days.map((day, dIdx) => {
                      const isEmpty = day.color === "transparent";
                      return (
                        <div
                          key={`c-${wIdx}-${dIdx}`}
                          title={cellTitle(day.dateKey, day.checked)}
                          className={`rounded-[2px] sm:rounded-[3px] ${
                            isEmpty ? "opacity-0" : "cursor-default"
                          }`}
                          style={{
                            width: cell,
                            height: cell,
                            background: isEmpty ? "transparent" : day.color,
                            boxSizing: "border-box",
                            border: isEmpty
                              ? "none"
                              : "1px solid rgba(255,255,255,0.04)",
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
