import Link from "next/link";
import { ReactNode } from "react";
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
    <Link
      href={href}
      className="flex flex-1 flex-col items-center gap-[5px]"
    >
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

export function MobileBottomNav() {
  return (
    <div className="bottom-nav fixed bottom-0 left-0 right-0 z-20 h-[70px] border-t border-white/[0.07] bg-[#0e1014] lg:hidden">
      <div className="flex h-full items-center px-[18px] pb-[10px]">
        <NavTab
          href="/dashboard"
          label="Home"
          active
          icon={<DashboardIcon />}
        />
        <NavTab href="#" label="Stats" icon={<StatisticsIcon />} />

        {/* Keep the floating add button exactly as designed */}
        <div className="flex w-[64px] flex-none justify-center">
          <button
            type="button"
            aria-label="Check in"
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
    </div>
  );
}
