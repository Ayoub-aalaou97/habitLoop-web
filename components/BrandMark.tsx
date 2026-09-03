type BrandMarkProps = {
  size?: number;
};

export function BrandMark({ size = 38 }: BrandMarkProps) {
  const insetOuter = Math.round(size * 0.13);
  const insetInner = Math.round(size * 0.37);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: "var(--mark-conic)" }}
      />
      <div
        className="absolute rounded-full bg-bg"
        style={{ inset: insetOuter }}
      />
      <div
        className="absolute rounded-full"
        style={{
          inset: insetInner,
          background: "var(--mark-conic)",
        }}
      />
    </div>
  );
}

export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-bold tracking-[-0.02em] text-text-heading ${className}`}
    >
      Habit<span className="text-text-soft">Loop</span>
    </span>
  );
}
