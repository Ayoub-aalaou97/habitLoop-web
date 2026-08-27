"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  BadgesIcon,
  DashboardIcon,
  RemindersIcon,
  StatisticsIcon,
} from "@/components/dashboard/NavIcons";

function NavTab({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active?: boolean;
  icon: ReactNode;
}) {
  return (
    <Link href={href} className="flex flex-1 flex-col items-center gap-[5px]">
      <span className={active ? "text-[#aeb3f5]" : "text-[#5b6070]"}>
        {icon}
      </span>
      <span
        className={`text-[10px] font-semibold ${
          active ? "text-[#aeb3f5]" : "text-[#777c8a]"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

export function MobileBottomNav({ onAddClick }: { onAddClick?: () => void }) {
  const pathname = usePathname();
  const onDashboard =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/habits");
  const onStats = pathname.startsWith("/dashboard/statistics");

  return (
    <nav
      className="bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.07] bg-[#0e1014] lg:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      aria-label="Primary"
    >
      <div className="flex h-[70px] items-center px-[18px] pb-[10px]">
        <NavTab
          href="/dashboard"
          label="Home"
          active={onDashboard}
          icon={<DashboardIcon />}
        />
        <NavTab
          href="/dashboard/statistics"
          label="Stats"
          active={onStats}
          icon={<StatisticsIcon />}
        />

        <div className="flex w-[64px] flex-none justify-center">
          <button
            type="button"
            aria-label="Add new habit"
            onClick={onAddClick}
            className="-mt-[18px] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gradient-to-b from-[#7a86ff] to-[#5d69f0] text-white shadow-[0_8px_20px_-4px_rgba(111,123,255,0.6),inset_0_1px_0_rgba(255,255,255,0.25)]"
          >
            <span className="-mt-[2px] text-[28px] font-light leading-[0]">
              +
            </span>
          </button>
        </div>

        <NavTab href="#" label="Badges" icon={<BadgesIcon />} />
        <NavTab href="#" label="Alerts" icon={<RemindersIcon />} />
      </div>
    </nav>
  );
}
