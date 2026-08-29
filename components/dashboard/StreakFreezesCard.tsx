export function StreakFreezesCard({
  total,
  remaining,
  loading = false,
}: {
  total: number;
  remaining: number;
  loading?: boolean;
}) {
  // Design shows 4 tiles: filled freezes + one dashed next slot.
  const filled = loading ? 0 : Math.max(0, Math.min(3, remaining));
  const slots = 4;

  return (
    <section className="card freezes-card rounded-[16px] border border-white/[0.06] bg-bg-elevated p-[20px]">
      <div className="mb-[14px] flex items-center justify-between">
        <h3 className="m-0 text-[14px] font-bold text-[#e8e9ec]">
          Streak freezes
        </h3>
        <span className="font-mono text-[11px] font-semibold text-text-dim">
          {loading ? "—" : `${remaining} / ${total}`}
        </span>
      </div>

      <div className="mb-[13px] flex gap-[10px]">
        {Array.from({ length: slots }).map((_, idx) => {
          if (loading) {
            return (
              <div
                key={`f-${idx}`}
                className="freeze-tile aspect-square flex-1 animate-pulse rounded-[11px] bg-white/[0.04]"
              />
            );
          }

          const isFilled = idx < filled;
          const isDashed = !isFilled && idx === filled;

          if (isFilled) {
            return (
              <div
                key={`f-${idx}`}
                className="freeze-tile freeze-filled aspect-square flex-1 rounded-[11px]"
                style={{
                  background: "linear-gradient(160deg,#7dd3fc,#38bdf8)",
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
                className="freeze-tile freeze-dashed aspect-square flex-1 rounded-[11px]"
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
              className="freeze-tile freeze-empty aspect-square flex-1 rounded-[11px]"
              style={{
                border: "1.5px solid rgba(44,48,58,0.18)",
                background: "transparent",
              }}
            />
          );
        })}
      </div>

      <p className="m-0 text-[12px] font-medium leading-snug text-[#777c8a]">
        Miss a loop and a freeze still counts it — one missed day, week, or
        month stays on the streak.
      </p>
    </section>
  );
}
