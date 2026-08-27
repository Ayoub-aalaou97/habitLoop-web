export function StreakFreezesCard({
  total,
  remaining,
}: {
  total: number;
  remaining: number;
}) {
  // Design shows 4 tiles: 3 filled gradients and 1 dashed (when 3/3).
  // So treat `remaining` as the number of available freezes to fill.
  const filled = Math.max(0, Math.min(3, remaining));
  const slots = 4;

  return (
    <section className="card freezes-card p-[20px] bg-bg-elevated border border-white/[0.06] rounded-[16px]">
      <div className="flex items-center justify-between mb-[14px]">
        <h3 className="m-0 text-[14px] font-bold text-[#e8e9ec]">
          Streak freezes
        </h3>
        <span className="text-[11px] font-semibold font-mono text-text-dim">
          {remaining} / {total}
        </span>
      </div>

      <div className="flex gap-[10px] mb-[13px]">
        {Array.from({ length: slots }).map((_, idx) => {
          const isFilled = idx < filled;
          const isDashed = !isFilled && idx === filled;

          if (isFilled) {
            return (
              <div
                key={`f-${idx}`}
                className="freeze-tile freeze-filled flex-1 aspect-square rounded-[11px]"
                style={{
                  background:
                    "linear-gradient(160deg,#7dd3fc,#38bdf8)",
                  boxShadow:
                    "inset 0 2px 0 rgba(255,255,255,0.45),0 6px 16px -6px rgba(56,189,248,0.5)",
                }}
              />
            );
          }

          if (isDashed) {
            return (
              <div
                key={`f-${idx}`}
                className="freeze-tile freeze-dashed flex-1 aspect-square rounded-[11px]"
                style={{
                  border: "1.5px dashed #2c303a",
                  background: "transparent",
                }}
              />
            );
          }

          return (
            <div
              key={`f-${idx}`}
              className="freeze-tile freeze-empty flex-1 aspect-square rounded-[11px]"
              style={{
                border: "1.5px solid rgba(44,48,58,0.18)",
                background: "transparent",
              }}
            />
          );
        })}
      </div>

      <p className="m-0 text-[12px] leading-snug font-medium text-[#777c8a]">
        Miss a loop and a freeze still counts it — one missed day, week, or
        month stays on the streak.
      </p>
    </section>
  );
}

