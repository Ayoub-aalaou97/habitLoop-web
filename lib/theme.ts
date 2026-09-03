export type ThemeMode = "dark" | "light";

export const THEME_STORAGE_KEY = "habitloop_theme";

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("light", mode === "light");
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
  root.dataset.theme = mode;
}

export function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "light"
    ? "light"
    : "dark";
}

export function persistTheme(mode: ThemeMode) {
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
}
