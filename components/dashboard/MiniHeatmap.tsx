"use client";

import { useEffect, useRef, useState } from "react";
import { MiniHeatCell } from "@/lib/dashboardMock";

const CELL_PX = 9;
const GAP_PX = 2.5;
const DEFAULT_WEEKS = 13;

/**
 * Renders the most recent weeks that fit the available width, so the grid
 * always reaches the right edge of the card instead of leaving a gap.
 */
function useVisibleWeekCount(maxWeeks: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [weekCount, setWeekCount] = useState(DEFAULT_WEEKS);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const measure = () => {
      const width = element.clientWidth;
      if (!width) return;

      const fits = Math.floor((width + GAP_PX) / (CELL_PX + GAP_PX));
      setWeekCount(Math.max(1, Math.min(maxWeeks, fits)));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, [maxWeeks]);

  return { containerRef, weekCount };
}

export function MiniHeatmap({ mini }: { mini: MiniHeatCell[][] }) {
  const { containerRef, weekCount } = useVisibleWeekCount(mini.length);
  const weeks = mini.slice(-weekCount);

  return (
    <div
      ref={containerRef}
      className="mini-heatmap flex w-full justify-between gap-[2.5px] overflow-hidden"
    >
      {weeks.map((week, wIdx) => (
        <div
          key={`wk-${wIdx}`}
          className="mini-heatmap-week flex flex-none flex-col gap-[2.5px]"
        >
          {week.map((cell, dIdx) => (
            <div
              key={`c-${wIdx}-${dIdx}`}
              className="mini-heatmap-cell h-[9px] w-[9px] flex-none rounded-[2px]"
              style={{ background: cell }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
