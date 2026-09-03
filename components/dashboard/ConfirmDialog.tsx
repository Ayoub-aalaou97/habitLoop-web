"use client";

import { useEffect } from "react";
import { SheetPortal } from "@/components/dashboard/SheetPortal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) onCancel();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onCancel]);

  return (
    <SheetPortal open={open}>
      <div className="confirm-dialog fixed inset-0 z-[100] flex items-center justify-center p-4">
        <button
          type="button"
          aria-label="Close confirmation"
          className="absolute inset-0 bg-[rgba(8,9,11,0.72)]"
          disabled={loading}
          onClick={() => {
            if (!loading) onCancel();
          }}
        />

        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-message"
          className="relative z-10 w-full max-w-[400px] overflow-hidden rounded-[22px] border border-border bg-bg-elevated shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)]"
        >
          <div className="px-6 pb-5 pt-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div
                className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${
                  danger
                    ? "bg-red-500/15 text-[#f87171]"
                    : "bg-[rgba(111,123,255,0.15)] text-brand-soft"
                }`}
              >
                {danger ? (
                  <svg
                    width="18"
                    height="18"
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
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v5" />
                    <path d="M12 16h.01" />
                  </svg>
                )}
              </div>

              <button
                type="button"
                aria-label="Close"
                disabled={loading}
                onClick={onCancel}
                className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] border border-border bg-bg-muted text-[16px] text-text-soft transition hover:text-text disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <h2
              id="confirm-dialog-title"
              className="m-0 mb-2 text-[20px] font-extrabold tracking-[-0.02em] text-text"
            >
              {title}
            </h2>
            <p
              id="confirm-dialog-message"
              className="m-0 text-[14px] leading-relaxed text-text-muted"
            >
              {message}
            </p>
          </div>

          <div className="flex gap-2.5 border-t border-border-soft bg-bg-sidebar px-6 py-4">
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              className="flex-1 rounded-[13px] border border-border bg-bg-muted py-3 text-center text-[14px] font-semibold text-text-body transition hover:bg-bg-soft disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className={`flex-1 rounded-[13px] py-3 text-center text-[14px] font-bold transition disabled:opacity-50 ${
                danger
                  ? "bg-gradient-to-b from-[#f87171] to-[#ef4444] text-[#2a0a0a] shadow-[0_8px_22px_-6px_rgba(248,113,113,0.45)]"
                  : "bg-gradient-to-b from-[#7a86ff] to-[#5d69f0] text-white shadow-[0_8px_22px_-6px_rgba(111,123,255,0.55)]"
              }`}
            >
              {loading ? "Please wait…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </SheetPortal>
  );
}
