"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandWordmark } from "@/components/BrandMark";
import {
  BadgesIcon,
  DashboardIcon,
  LogoutIcon,
  PanelLeftIcon,
  RemindersIcon,
  StatisticsIcon,
} from "@/components/dashboard/NavIcons";
import type { BadgeItem } from "@/lib/badges";

type IconComponent = (props: { className?: string }) => ReactNode;

function iconClass(active: boolean) {
  return active ? "text-[#aeb3f5]" : "text-[#6b7280]";
}

const NAV_ITEMS: {
  label: string;
  href: string;
  match: (pathname: string) => boolean;
  icon: IconComponent;
}[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    match: (pathname) =>
      pathname === "/dashboard" || pathname.startsWith("/dashboard/habits"),
    icon: DashboardIcon,
  },
  {
    label: "Statistics",
    href: "/dashboard/statistics",
    match: (pathname) => pathname.startsWith("/dashboard/statistics"),
    icon: StatisticsIcon,
  },
  {
    label: "Badges",
    href: "/dashboard/badges",
    match: (pathname) => pathname.startsWith("/dashboard/badges"),
    icon: BadgesIcon,
  },
  { label: "Reminders", href: "#", match: () => false, icon: RemindersIcon },
];

export function Sidebar({
  userName,
  userPlanLabel,
  onLogout,
  bestMonth,
  bestMonthPct,
  nextBadge,
}: {
  userName: string;
  userPlanLabel: string;
  onLogout: () => void;
  bestMonth?: string;
  bestMonthPct?: number;
  nextBadge?: BadgeItem | null;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const initial = userName.trim().charAt(0).toUpperCase() || "?";
  const widthClass = collapsed ? "w-[68px]" : "w-[232px]";
  const showBestMonth =
    Boolean(bestMonth) &&
    bestMonth !== "—" &&
    pathname.startsWith("/dashboard/statistics");
  const showNextBadge =
    Boolean(nextBadge) && pathname.startsWith("/dashboard/badges");

  return (
    <>
      <div
        aria-hidden="true"
        className={`sidebar-spacer hidden flex-none lg:block ${widthClass} transition-[width] duration-200`}
      />

      <aside
        className={`sidebar fixed inset-y-0 left-0 z-30 hidden h-dvh flex-col border-r border-white/[0.06] bg-[#0e1014] py-4 transition-[width] duration-200 lg:flex ${widthClass} ${
          collapsed ? "px-2.5" : "px-3.5"
        }`}
      >
        <div
          className={`mb-4 flex items-center ${
            collapsed ? "flex-col gap-2" : "justify-between gap-2 px-1"
          }`}
        >
          <div
            className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"}`}
          >
            <div className="relative h-8 w-8 flex-none rounded-full">
              <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_215deg,#38bdf8,#a78bfa,#fb923c,#34d399,#38bdf8)]" />
              <div className="absolute inset-[4px] rounded-full bg-[#0e1014]" />
              <div className="absolute inset-[12px] rounded-full bg-[conic-gradient(from_215deg,#38bdf8,#a78bfa,#fb923c,#34d399,#38bdf8)]" />
            </div>
            {collapsed ? null : <BrandWordmark className="text-[15px]" />}
          </div>

          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="sidebar-toggle flex h-9 w-9 flex-none items-center justify-center rounded-lg text-[#878c99] transition hover:bg-white/[0.06] hover:text-[#e8e9ec]"
          >
            <PanelLeftIcon />
          </button>
        </div>

        <nav className="scroll-area flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Link
                key={item.label}
                href={item.href}
                title={item.label}
                className={`nav-item group flex items-center rounded-lg transition ${
                  collapsed
                    ? "h-10 w-10 justify-center self-center"
                    : "gap-3 px-3 py-2.5"
                } ${
                  active
                    ? "bg-[rgba(111,123,255,0.14)] text-[#e8e9ff]"
                    : "text-[#878c99] hover:bg-white/[0.05] hover:text-[#d5d7de]"
                }`}
              >
                <Icon className={`flex-none ${iconClass(active)}`} />
                {collapsed ? null : (
                  <span
                    className={`text-[14px] ${
                      active ? "font-semibold" : "font-medium"
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 border-t border-white/[0.06] pt-3">
          {showBestMonth && !collapsed ? (
            <div className="mb-3 rounded-2xl border border-white/[0.06] bg-[#15171c] p-[15px]">
              <div className="mb-2 font-mono text-[10px] font-semibold tracking-[0.1em] text-[#6b7280]">
                BEST MONTH
              </div>
              <div className="mb-0.5 text-[19px] font-bold text-[#eceef1]">
                {bestMonth}
              </div>
              <div className="text-[11px] font-medium text-[#777c8a]">
                {bestMonthPct ?? 0}% of goals met
              </div>
            </div>
          ) : null}

          {showNextBadge && nextBadge && !collapsed ? (
            <div className="mb-3 rounded-2xl border border-white/[0.06] bg-[#15171c] p-[15px]">
              <div className="mb-2.5 font-mono text-[10px] font-semibold tracking-[0.1em] text-[#6b7280]">
                NEXT UP
              </div>
              <div className="mb-2.5 flex items-center gap-2.5">
                <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-[#2e323c] bg-[#191c22] font-mono text-[12px] font-bold text-[#454a56]">
                  {nextBadge.mark}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-bold text-[#dfe1e6]">
                    {nextBadge.label}
                  </div>
                  <div className="font-mono text-[10.5px] font-semibold text-[#6b7280]">
                    {nextBadge.progress}
                  </div>
                </div>
              </div>
              <div className="h-[5px] overflow-hidden rounded-[3px] bg-[#1b1e25]">
                <div
                  className="h-full rounded-[3px]"
                  style={{
                    width: `${Math.max(0, Math.min(100, nextBadge.pct))}%`,
                    background: "linear-gradient(90deg,#fcd34d,#f59e0b)",
                  }}
                />
              </div>
            </div>
          ) : null}

          <div
            className={`flex items-center rounded-lg ${
              collapsed ? "justify-center py-1" : "gap-2.5 px-2 py-2"
            }`}
          >
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-[#a78bfa] to-[#38bdf8]">
              <span className="text-[12px] font-bold text-[#0e1014]">
                {initial}
              </span>
            </div>
            {collapsed ? null : (
              <div className="min-w-0 flex-1 leading-snug">
                <div className="truncate text-[13px] font-semibold text-[#e8e9ec]">
                  {userName}
                </div>
                <div className="text-[11px] font-medium text-[#6b7280]">
                  {userPlanLabel}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Log out"
            className={`mt-1 flex items-center rounded-lg text-[13px] font-medium text-[#878c99] transition hover:bg-white/[0.05] hover:text-[#e8e9ec] ${
              collapsed
                ? "mx-auto h-10 w-10 justify-center"
                : "w-full gap-3 px-3 py-2.5"
            }`}
          >
            <LogoutIcon className="flex-none" />
            {collapsed ? null : <span>Log out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
