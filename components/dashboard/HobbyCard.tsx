"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { DashboardHobby } from "@/lib/dashboardMock";
import { MiniHeatmap } from "@/components/dashboard/MiniHeatmap";

function LoopRing({
  done,
  target,
  color,
}: {
  done: number;
  target: number;
  color: string;
}) {
  const size = 44;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, done / target) : 0;

  return (
    <div className="relative h-11 w-11 flex-none">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-bold text-text-heading">
        {done}/{target}
      </span>
    </div>
  );
}

export function HobbyCard({
  hobby,
  variant,
  href,
  onEdit,
  onDelete,
  onMiniCellClick,
}: {
  hobby: DashboardHobby;
  variant: "desktop" | "mobile";
  href?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onMiniCellClick?: (cell: {
    dateKey: string;
    checked: boolean;
    locked?: boolean;
  }) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function openDetail() {
    if (href) router.push(href);
  }

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  const menu = (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Habit actions"
        aria-expanded={menuOpen}
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        className="px-1 font-bold text-[16px] leading-none tracking-[1px] text-[#4b5060] transition hover:text-brand-soft"
      >
        ···
      </button>

      {menuOpen ? (
        <div
          className="absolute right-0 top-full z-20 mt-2 min-w-[140px] overflow-hidden rounded-xl border border-border bg-bg-muted py-1 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="block w-full px-3.5 py-2 text-left text-[13px] font-semibold text-text-heading transition hover:bg-bg-muted"
            onClick={() => {
              setMenuOpen(false);
              onEdit?.();
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="block w-full px-3.5 py-2 text-left text-[13px] font-semibold text-[#f87171] transition hover:bg-bg-muted"
            onClick={() => {
              setMenuOpen(false);
              onDelete?.();
            }}
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );

  const interactiveProps = href
    ? {
        role: "link" as const,
        tabIndex: 0,
        onClick: openDetail,
        onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openDetail();
          }
        },
      }
    : {};

  const risk = hobby.atRisk ? (
    <div className="mb-3 rounded-[10px] border border-[#fbbf24]/25 bg-[#fbbf24]/10 px-2.5 py-1.5 font-mono text-[10.5px] font-semibold text-[#fbbf24]">
      {hobby.riskLabel}
    </div>
  ) : null;

  if (variant === "mobile") {
    return (
      <div
        className={`card hobby-card rounded-[16px] border border-border-soft bg-bg-elevated p-[14px] transition ${
          href ? "cursor-pointer hover:border-border" : ""
        }`}
        {...interactiveProps}
      >
        <div className="mb-[11px] flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-[10px]">
              <div
                className="h-[10px] w-[10px] rounded-[3px]"
                style={{
                  background: hobby.color,
                  boxShadow: `0 0 10px ${hobby.color}`,
                }}
              />
              <div className="min-w-0">
                <div className="truncate text-[14.5px] font-bold leading-tight text-text-body">
                  {hobby.name}
                </div>
                <div className="text-[11px] font-medium text-text-muted">
                  {hobby.goalLabel}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LoopRing done={hobby.done} target={hobby.target} color={hobby.color} />
            {menu}
          </div>
        </div>

        <div className="mb-2.5 flex items-baseline gap-1.5">
          <span
            className="font-mono text-[22px] font-bold leading-none"
            style={{ color: hobby.color }}
          >
            {hobby.streak}
          </span>
          <span className="text-[11px] font-semibold text-text-muted">
            {hobby.unit}
          </span>
        </div>

        {risk}
        <MiniHeatmap mini={hobby.mini} onCellClick={onMiniCellClick} />
      </div>
    );
  }

  return (
    <div
      className={`card hobby-card rounded-[16px] border border-border-soft bg-bg-elevated p-[18px] transition ${
        href ? "cursor-pointer hover:border-border" : ""
      }`}
      {...interactiveProps}
    >
      <div className="mb-[14px] flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-[10px]">
          <div
            className="h-[11px] w-[11px] shrink-0 rounded-[3px]"
            style={{
              background: hobby.color,
              boxShadow: `0 0 12px ${hobby.color}`,
            }}
          />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold leading-snug text-text-body">
              {hobby.name}
            </div>
            <div className="text-[11px] font-medium leading-snug text-text-muted">
              {hobby.goalLabel}
            </div>
          </div>
        </div>

        {menu}
      </div>

      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-[6px]">
          <span
            className="font-mono text-[26px] font-bold"
            style={{ color: hobby.color }}
          >
            {hobby.streak}
          </span>
          <span className="text-[12px] font-semibold text-text-muted">
            {hobby.unit}
          </span>
        </div>
        <LoopRing done={hobby.done} target={hobby.target} color={hobby.color} />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11.5px] font-medium text-text-muted">
          {hobby.periodLabel}
        </span>
        <span className="font-mono text-[11px] font-semibold text-text-dim">
          {hobby.consistency}% consistency
        </span>
      </div>

      {risk}
      <MiniHeatmap mini={hobby.mini} onCellClick={onMiniCellClick} />
    </div>
  );
}
