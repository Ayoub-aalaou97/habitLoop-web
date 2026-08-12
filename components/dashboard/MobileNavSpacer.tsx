/** Invisible spacer so the last habit card clears the fixed mobile tab bar. */
export function MobileNavSpacer() {
  return (
    <div
      aria-hidden="true"
      className="w-full shrink-0 lg:hidden"
      style={{
        height: "calc(70px + env(safe-area-inset-bottom, 0px) + 28px)",
      }}
    />
  );
}
