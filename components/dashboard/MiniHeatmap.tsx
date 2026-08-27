"use client";

import { useState } from "react";
import { MiniHeatCell } from "@/lib/dashboardMock";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DATE_TOOLTIP = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

function toTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function cellLabel(cell: MiniHeatCell, todayKey: string): string | null {
  if (!cell.dateKey) return null;
  const [y, m, d] = cell.dateKey.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d ?? 1);
  const when =
    cell.dateKey === todayKey ? "Today" : DATE_TOOLTIP.format(date);
  if (cell.checked) return `${when} · checked in`;
  if (cell.dateKey > todayKey) return `${when} · upcoming`;
  return when;
}

type Tip = { x: number; y: number; text: string };

export function MiniHeatmap({ mini }: { mini: MiniHeatCell[][] }) {
  const week = mini[mini.length - 1] ?? [];
  const todayKey = toTodayKey();
  const [tip, setTip] = useState<Tip | null>(null);

  return (
    <div className="relative w-full">
      <div className="grid grid-cols-7 gap-1.5">
        {week.map((cell, idx) => {
          const isToday = cell.dateKey === todayKey;
          const isFuture = Boolean(cell.dateKey && cell.dateKey > todayKey);
          const label = cellLabel(cell, todayKey);

          return (
            <div key={cell.dateKey ?? `d-${idx}`} className="flex flex-col items-center gap-1.5">
              <span
                className={`font-mono text-[10px] font-semibold ${
                  isToday ? "text-[#e8e9ec]" : "text-[#6b7280]"
                }`}
              >
                {DOW[idx]}
              </span>
              <div
                className={`h-7 w-full max-w-[28px] rounded-[6px] transition-[transform,filter] duration-100 hover:z-10 hover:scale-110 hover:brightness-125 ${
                  isFuture ? "opacity-35" : ""
                }`}
                style={{
                  background: cell.color,
                  boxShadow: cell.checked
                    ? "inset 0 0 0 1px rgba(255,255,255,0.16)"
                    : undefined,
                  outline: isToday
                    ? "1.5px solid rgba(255,255,255,0.65)"
                    : "1px solid rgba(255,255,255,0.05)",
                  outlineOffset: 0,
                }}
                onMouseEnter={(event) => {
                  if (!label) return;
                  setTip({
                    x: event.clientX,
                    y: event.clientY,
                    text: label,
                  });
                }}
                onMouseMove={(event) => {
                  if (!label) return;
                  setTip({
                    x: event.clientX,
                    y: event.clientY,
                    text: label,
                  });
                }}
                onMouseLeave={() => setTip(null)}
              />
            </div>
          );
        })}
      </div>

      {tip ? (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-md border border-white/10 bg-[#16181f] px-2 py-1 font-mono text-[11px] font-medium text-[#e8e9ec] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)]"
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.text}
        </div>
      ) : null}
    </div>
  );
}
