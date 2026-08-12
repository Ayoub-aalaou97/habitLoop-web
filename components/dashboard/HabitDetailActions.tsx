"use client";

import { useEffect, useId, useRef, useState } from "react";

function PencilIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function MoreIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}

export function HabitDetailActions({
  onEdit,
  onDelete,
  compact,
}: {
  onEdit: () => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const triggerClass = compact
    ? "flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/[0.08] bg-[#15171c] text-[#b9bdc6] transition hover:border-white/[0.14] hover:bg-[#1b1e25] hover:text-white active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6f7bff]"
    : "inline-flex h-[38px] w-[38px] items-center justify-center rounded-[11px] border border-white/[0.08] bg-[#15171c] text-[#9aa0ab] transition hover:border-white/[0.14] hover:bg-[#1b1e25] hover:text-white active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6f7bff]";

  return (
    <div ref={menuRef} className="relative flex-none">
      <button
        type="button"
        aria-label="Habit actions"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        title="Habit actions"
        onClick={() => setMenuOpen((v) => !v)}
        className={triggerClass}
      >
        <MoreIcon />
      </button>

      {menuOpen ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#1b1e25] py-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.75)]"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#e8e9ec] transition hover:bg-white/[0.05]"
            onClick={() => {
              setMenuOpen(false);
              onEdit();
            }}
          >
            <PencilIcon className="text-[#9aa0ab]" />
            Edit habit
          </button>
          <div className="mx-2 my-1 h-px bg-white/[0.06]" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#f87171] transition hover:bg-red-500/10"
            onClick={() => {
              setMenuOpen(false);
              onDelete();
            }}
          >
            <TrashIcon />
            Delete habit
          </button>
        </div>
      ) : null}
    </div>
  );
}
