import { DashboardHobby } from "@/lib/dashboardMock";
import { MiniHeatmap } from "@/components/dashboard/MiniHeatmap";

export function HobbyCard({
  hobby,
  variant,
}: {
  hobby: DashboardHobby;
  variant: "desktop" | "mobile";
}) {
  if (variant === "mobile") {
    return (
      <div className="card hobby-card p-[14px] bg-bg-elevated border border-white/[0.06] rounded-[16px]">
        <div className="flex items-start justify-between gap-3 mb-[11px]">
          <div className="min-w-0">
            <div className="flex items-center gap-[10px]">
              <div
                className="w-[10px] h-[10px] rounded-[3px]"
                style={{
                  background: hobby.color,
                  boxShadow: `0 0 10px ${hobby.color}`,
                }}
              />
              <div>
                <div className="text-[14.5px] font-bold text-[#eceef1] leading-tight truncate">
                  {hobby.name}
                </div>
                <div className="text-[11px] font-medium text-[#777c8a]">
                  {hobby.goalLabel}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-baseline gap-1">
            <span
              className="font-bold text-[21px] leading-none"
              style={{ color: hobby.color }}
            >
              {hobby.streak}
            </span>
            <span className="text-[10.5px] font-medium text-[#8a8f9c]">
              day
            </span>
          </div>
        </div>

        <MiniHeatmap mini={hobby.mini} />
      </div>
    );
  }

  // desktop
  return (
    <div className="card hobby-card p-[18px] bg-bg-elevated border border-white/[0.06] rounded-[16px]">
      <div className="flex items-center justify-between mb-[14px]">
        <div className="flex items-center gap-[10px] min-w-0">
          <div
            className="w-[11px] h-[11px] rounded-[3px] shrink-0"
            style={{
              background: hobby.color,
              boxShadow: `0 0 12px ${hobby.color}`,
            }}
          />
            <div className="min-w-0">
            <div className="text-[15px] font-bold text-[#eceef1] leading-snug truncate">
              {hobby.name}
            </div>
            <div className="text-[11px] font-medium text-[#777c8a] leading-snug">
              {hobby.goalLabel}
            </div>
          </div>
        </div>

        <span className="font-bold text-[16px] text-[#4b5060] leading-none tracking-[1px]">
          ···
        </span>
      </div>

      <div className="flex items-baseline gap-[6px] mb-[14px]">
        <span
          className="font-bold text-[26px] font-mono"
          style={{ color: hobby.color }}
        >
          {hobby.streak}
        </span>
        <span className="text-[12px] font-semibold text-[#8a8f9c]">
          day streak
        </span>
      </div>

      <div className="flex items-center justify-between mb-[12px]">
        <span className="text-[11.5px] font-medium text-[#777c8a]">
          {hobby.unit}
        </span>
        <div className="flex gap-[5px]">
          {hobby.weekDots.map((d, idx) =>
            d.on ? (
              <div
                key={`wd-${idx}`}
                className="w-[9px] h-[9px] rounded-full"
                style={{
                  background: hobby.color,
                  boxShadow: `0 0 14px ${hobby.color}`,
                }}
              />
            ) : (
              <div
                key={`wd-${idx}`}
                className="w-[9px] h-[9px] rounded-full border border-[#34384280]"
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

