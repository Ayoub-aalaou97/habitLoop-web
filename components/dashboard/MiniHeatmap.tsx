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

function cellLabel(
  cell: MiniHeatCell,
  todayKey: string,
  interactive: boolean,
): string | null {
  if (!cell.dateKey) return null;
  const [y, m, d] = cell.dateKey.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d ?? 1);
  const when =
    cell.dateKey === todayKey ? "Today" : DATE_TOOLTIP.format(date);
  if (cell.locked) return `${when} · locked`;
  if (cell.checked) {
    return interactive
      ? `${when} · checked in · click to edit`
      : `${when} · checked in`;
  }
  if (cell.dateKey > todayKey) return `${when} · upcoming`;
  return interactive ? `${when} · click to check in` : when;
}

type Tip = { x: number; y: number; text: string };

export function MiniHeatmap({
  mini,
  onCellClick,
}: {
  mini: MiniHeatCell[][];
  onCellClick?: (cell: {
    dateKey: string;
    checked: boolean;
    locked?: boolean;
  }) => void;
}) {
  const week = mini[mini.length - 1] ?? [];
  const todayKey = toTodayKey();
  const [tip, setTip] = useState<Tip | null>(null);

  return (
    <div className="relative w-full">
      <div className="grid grid-cols-7 gap-1.5">
        {week.map((cell, idx) => {
          const isToday = cell.dateKey === todayKey;
          const isFuture = Boolean(cell.dateKey && cell.dateKey > todayKey);
          const isPastChecked =
            Boolean(cell.checked) &&
            cell.dateKey != null &&
            cell.dateKey < todayKey;
          const canClick =
            Boolean(onCellClick) &&
            Boolean(cell.dateKey) &&
            !cell.locked &&
            !isFuture &&
            !isPastChecked;
          const label = cellLabel(cell, todayKey, canClick);

          return (
            <div
              key={cell.dateKey ?? `d-${idx}`}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className={`font-mono text-[10px] font-semibold ${
                  isToday ? "text-[#e8e9ec]" : "text-[#6b7280]"
                }`}
              >
                {DOW[idx]}
              </span>
              <div
                role={canClick ? "button" : undefined}
                tabIndex={canClick ? 0 : undefined}
                className={`rounded-[3px] ${
                  canClick
                    ? "cursor-pointer hover:brightness-125"
                    : isFuture || cell.locked
                      ? ""
                      : "hover:brightness-125"
                }`}
                style={{
                  width: 14,
                  height: 14,
                  boxSizing: "border-box",
                  background: cell.locked
                    ? "repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 4px)"
                    : cell.color,
                  border: cell.locked
                    ? "1px dashed rgba(255,255,255,0.12)"
                    : "1px solid rgba(255,255,255,0.04)",
                  opacity: cell.locked ? 0.55 : 1,
                  outline: isToday
                    ? "1px solid rgba(255,255,255,0.45)"
                    : "none",
                  outlineOffset: 0,
                }}
                onClick={(event) => {
                  if (!canClick || !cell.dateKey) return;
                  event.stopPropagation();
                  onCellClick?.({
                    dateKey: cell.dateKey,
                    checked: Boolean(cell.checked),
                    locked: cell.locked,
                  });
                }}
                onKeyDown={(event) => {
                  if (!canClick || !cell.dateKey) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    onCellClick?.({
                      dateKey: cell.dateKey,
                      checked: Boolean(cell.checked),
                      locked: cell.locked,
                    });
                  }
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
