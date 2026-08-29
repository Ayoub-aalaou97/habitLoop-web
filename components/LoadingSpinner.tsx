type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
};

const SIZES = {
  sm: { outer: 28, inset: 5, core: 10 },
  md: { outer: 40, inset: 6, core: 14 },
  lg: { outer: 56, inset: 8, core: 20 },
} as const;

export function LoadingSpinner({
  size = "md",
  className = "",
  label,
}: LoadingSpinnerProps) {
  const dim = SIZES[size];

  return (
    <div
      className={`inline-flex flex-col items-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label ?? "Loading"}
    >
      <div
        className="hl-spinner relative"
        style={{ width: dim.outer, height: dim.outer }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 215deg,#38bdf8,#a78bfa,#fb923c,#34d399,#38bdf8)",
          }}
        />
        <div
          className="absolute rounded-full bg-bg"
          style={{ inset: dim.inset }}
        />
        <div
          className="absolute rounded-full opacity-90"
          style={{
            inset: dim.core,
            background:
              "conic-gradient(from 215deg,#38bdf8,#a78bfa,#fb923c,#34d399,#38bdf8)",
          }}
        />
      </div>
      {label ? (
        <span className="font-mono text-[12px] font-medium tracking-[0.06em] text-[#6b7280]">
          {label}
        </span>
      ) : null}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}

export function PageLoader({
  label = "Loading…",
}: {
  label?: string;
}) {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-1 bg-bg p-8">
      <LoadingSpinner size="lg" label={label} />
    </main>
  );
}
