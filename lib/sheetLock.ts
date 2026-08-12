/** Ref-count so stacked sheets (check day → log) keep the nav hidden. */
let openCount = 0;

export function lockMobileSheet() {
  openCount += 1;
  if (typeof document !== "undefined") {
    document.body.dataset.sheetOpen = "true";
  }
}

export function unlockMobileSheet() {
  openCount = Math.max(0, openCount - 1);
  if (typeof document !== "undefined" && openCount === 0) {
    delete document.body.dataset.sheetOpen;
  }
}
