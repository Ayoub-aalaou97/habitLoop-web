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
  locked?: boolean,
  interactive?: boolean,
): string | undefined {
  if (!dateKey) return undefined;
  const [y, m, d] = dateKey.split("-").map(Number);
  const label = DATE_TOOLTIP.format(new Date(y!, (m ?? 1) - 1, d ?? 1));
  if (locked) return `${label} · locked`;
  if (checked) {
    return interactive
      ? `${label} · checked in · click to edit`
      : `${label} · checked in`;
  }
  return interactive
    ? `${label} · click to check in`
    : `${label} · rest`;
}

function loopBarColor(status: ActivityWeek["loopStatus"]): string | null {
  if (status === "satisfied") return "#34d399";
  if (status === "missed") return "#f87171";
  if (status === "progress") return "transparent";
  return null;
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
  onDayClick,
}: {
  weeks: ActivityWeek[];
  dayLabels: string[];
  color: string;
  onDayClick?: (day: {
    dateKey: string;
    checked: boolean;
    locked?: boolean;
  }) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { ref: measureRef, width } = useContainerWidth();
  const legend = [0.045, 0.2, 0.42, 0.68, 0.95];
  const todayKey = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  })();

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
                      const isFuture = Boolean(
                        day.dateKey && day.dateKey > todayKey,
                      );
                      const isPastChecked =
                        Boolean(day.checked) &&
                        Boolean(day.dateKey) &&
                        day.dateKey < todayKey;
                      const canClick =
                        Boolean(onDayClick) &&
                        Boolean(day.dateKey) &&
                        !isEmpty &&
                        !day.locked &&
                        !isFuture &&
                        !isPastChecked;

                      return (
                        <div
                          key={`c-${wIdx}-${dIdx}`}
                          title={cellTitle(
                            day.dateKey,
                            day.checked,
                            day.locked,
                            canClick,
                          )}
                          role={canClick ? "button" : undefined}
                          tabIndex={canClick ? 0 : undefined}
                          onClick={() => {
                            if (!canClick || !day.dateKey) return;
                            onDayClick?.({
                              dateKey: day.dateKey,
                              checked: day.checked,
                              locked: day.locked,
                            });
                          }}
                          onKeyDown={(event) => {
                            if (!canClick || !day.dateKey) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onDayClick?.({
                                dateKey: day.dateKey,
                                checked: day.checked,
                                locked: day.locked,
                              });
                            }
                          }}
                          className={`rounded-[2px] sm:rounded-[3px] ${
                            isEmpty
                              ? "opacity-0"
                              : canClick
                                ? "cursor-pointer hover:brightness-125"
                                : "cursor-default"
                          }`}
                          style={{
                            width: cell,
                            height: cell,
                            background: isEmpty
                              ? "transparent"
                              : day.locked
                                ? "repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 4px)"
                                : day.color,
                            boxSizing: "border-box",
                            border: isEmpty
                              ? "none"
                              : day.locked
                                ? "1px dashed rgba(255,255,255,0.12)"
                                : "1px solid rgba(255,255,255,0.04)",
                            opacity: day.locked ? 0.55 : undefined,
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              {weeks.some((week) => week.loopStatus) ? (
                <div
                  className="mt-[5px] flex"
                  style={{ gap: GAP, width: gridWidth }}
                >
                  {weeks.map((week, wIdx) => {
                    const fill = loopBarColor(week.loopStatus);
                    return (
                      <div
                        key={`loop-${wIdx}`}
                        title={
                          week.loopStatus === "satisfied"
                            ? "Loop closed"
                            : week.loopStatus === "missed"
                              ? "Loop missed"
                              : week.loopStatus === "progress"
                                ? "Loop in progress"
                                : undefined
                        }
                        className="rounded-full"
                        style={{
                          width: cell,
                          height: 3,
                          background: fill ?? "transparent",
                          boxSizing: "border-box",
                          border:
                            week.loopStatus === "progress"
                              ? "1px solid rgba(255,255,255,0.35)"
                              : "none",
                        }}
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
