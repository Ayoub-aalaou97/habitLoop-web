"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { DashboardHobby } from "@/lib/dashboardMock";
import { MiniHeatmap } from "@/components/dashboard/MiniHeatmap";

export function HobbyCard({
  hobby,
  variant,
  href,
  onEdit,
  onDelete,
}: {
  hobby: DashboardHobby;
  variant: "desktop" | "mobile";
  href?: string;
  onEdit?: () => void;
  onDelete?: () => void;
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
        className="px-1 font-bold text-[16px] leading-none tracking-[1px] text-[#4b5060] transition hover:text-[#aeb3f5]"
      >
        ···
      </button>

      {menuOpen ? (
        <div
          className="absolute right-0 top-full z-20 mt-2 min-w-[140px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#1b1e25] py-1 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="block w-full px-3.5 py-2 text-left text-[13px] font-semibold text-[#e8e9ec] transition hover:bg-white/[0.05]"
            onClick={() => {
              setMenuOpen(false);
              onEdit?.();
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="block w-full px-3.5 py-2 text-left text-[13px] font-semibold text-[#f87171] transition hover:bg-white/[0.05]"
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

  if (variant === "mobile") {
    return (
      <div
        className={`card hobby-card rounded-[16px] border border-white/[0.06] bg-bg-elevated p-[14px] transition ${
          href ? "cursor-pointer hover:border-white/[0.12]" : ""
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
                <div className="truncate text-[14.5px] font-bold leading-tight text-[#eceef1]">
                  {hobby.name}
                </div>
                <div className="text-[11px] font-medium text-[#777c8a]">
                  {hobby.goalLabel}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-baseline gap-1">
              <span
                className="text-[21px] font-bold leading-none"
                style={{ color: hobby.color }}
              >
                {hobby.streak}
              </span>
              <span className="text-[10.5px] font-medium text-[#8a8f9c]">
                day
              </span>
            </div>
            {menu}
          </div>
        </div>

        <MiniHeatmap mini={hobby.mini} />
      </div>
    );
  }

  return (
    <div
      className={`card hobby-card rounded-[16px] border border-white/[0.06] bg-bg-elevated p-[18px] transition ${
        href ? "cursor-pointer hover:border-white/[0.12]" : ""
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
            <div className="truncate text-[15px] font-bold leading-snug text-[#eceef1]">
              {hobby.name}
            </div>
            <div className="text-[11px] font-medium leading-snug text-[#777c8a]">
              {hobby.goalLabel}
            </div>
          </div>
        </div>

        {menu}
      </div>

      <div className="mb-[14px] flex items-baseline gap-[6px]">
        <span
          className="font-mono text-[26px] font-bold"
          style={{ color: hobby.color }}
        >
          {hobby.streak}
        </span>
        <span className="text-[12px] font-semibold text-[#8a8f9c]">
          day streak
        </span>
      </div>

      <div className="mb-[12px] flex items-center justify-between">
        <span className="text-[11.5px] font-medium text-[#777c8a]">
          {hobby.unit}
        </span>
        <div className="flex gap-[5px]">
          {hobby.weekDots.map((d, idx) =>
            d.on ? (
              <div
                key={`wd-${idx}`}
                className="h-[9px] w-[9px] rounded-full"
                style={{
                  background: hobby.color,
                  boxShadow: `0 0 14px ${hobby.color}`,
                }}
              />
            ) : (
              <div
                key={`wd-${idx}`}
                className="h-[9px] w-[9px] rounded-full border border-[#34384280]"
                style={{ borderWidth: "1.5px", background: "transparent" }}
              />
            ),
          )}
        </div>
      </div>

      <MiniHeatmap mini={hobby.mini} />
    </div>
  );
}
