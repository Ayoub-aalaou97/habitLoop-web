import { ConsistencyMonth } from "@/lib/dashboardMock";

export function ConsistencyChart({
  months,
}: {
  months: ConsistencyMonth[];
}) {
  return (
    <section className="card consistency-card p-[20px] bg-bg-elevated border border-white/[0.06] rounded-[16px]">
      <div className="flex items-center justify-between mb-[18px]">
        <h3 className="m-0 text-[14px] font-bold text-[#e8e9ec]">
          Consistency
        </h3>
        <span className="text-[11px] font-semibold font-mono text-text-dim">
          12 MONTHS
        </span>
      </div>

      <div className="flex items-end gap-[7px] h-[110px]">
        {months.map((m, idx) => (
          <div
            key={`${m.label}-${idx}`}
            className={`month month-${idx} flex-1 h-full flex flex-col items-center justify-end`}
          >
            <div
              className="month-fill w-full rounded-[4px] min-h-[4px]"
              style={{
                height: `${Math.max(2, Math.min(100, m.pct))}%`,
                background: m.fill,
              }}
            />
            <span className="month-label mt-[7px] text-[10px] font-semibold font-mono text-text-dim">
              {m.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

