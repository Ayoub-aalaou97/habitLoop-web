"use client";

import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
      className={`inline-flex items-center justify-center rounded-[11px] border border-border-soft bg-bg-elevated text-text-muted transition hover:text-text hover:bg-bg-muted ${
        compact ? "h-9 w-9" : "h-10 w-10"
      } ${className}`}
    >
      {isLight ? (
        /* Currently light → show moon (action: go dark) */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        /* Currently dark → show sun (action: go light) */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 3v1.6M12 19.4V21M4.6 12H3M21 12h-1.6M6.2 6.2l1.1 1.1M16.7 16.7l1.1 1.1M17.8 6.2l-1.1 1.1M7.3 16.7l-1.1 1.1"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
