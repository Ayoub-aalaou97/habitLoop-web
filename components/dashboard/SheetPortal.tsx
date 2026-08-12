"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { lockMobileSheet, unlockMobileSheet } from "@/lib/sheetLock";

/**
 * Renders overlays on document.body (above the dashboard bottom nav)
 * and hides that nav for the duration of the sheet.
 */
export function SheetPortal({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    lockMobileSheet();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      unlockMobileSheet();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(children, document.body);
}
