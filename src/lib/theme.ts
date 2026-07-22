import { useEffect, useState, useCallback } from "react";

/**
 * CareerOS theme system.
 *
 * Themes are pure CSS-variable overrides applied via a class on <html>.
 * Adding a new theme = add a new entry here + a matching class in styles.css.
 * Components consume semantic tokens (--background, --primary, ...) so no
 * component code needs to change to support a new theme.
 */

export type ThemeId = "classic" | "premium";

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  tagline: string;
  /** CSS class applied to <html>. Empty string = default (no override). */
  className: string;
  /** Swatches shown in the picker. */
  swatches: string[];
};

export const THEMES: ThemeDefinition[] = [
  {
    id: "classic",
    name: "CareerOS Classic",
    tagline: "The default CareerOS experience.",
    className: "",
    swatches: ["#1E1E1E", "#252526", "#4F8CFF", "#22D3EE"],
  },
  {
    id: "premium",
    name: "CareerOS Premium",
    tagline: "Modern AI workspace — Linear · Vercel · Stripe.",
    className: "theme-premium",
    swatches: ["#F7F8FC", "#FFFFFF", "#17324D", "#3B82F6"],
  },
];

const STORAGE_KEY = "careeros:theme";
const DEFAULT_THEME: ThemeId = "classic";

function isThemeId(value: unknown): value is ThemeId {
  return value === "classic" || value === "premium";
}

/** Read the saved theme without touching the DOM (SSR-safe). */
export function readSavedTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isThemeId(raw) ? raw : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** Apply a theme to <html>. Idempotent; strips other theme classes. */
export function applyTheme(id: ThemeId): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const theme of THEMES) {
    if (theme.className) root.classList.remove(theme.className);
  }
  const next = THEMES.find((t) => t.id === id) ?? THEMES[0];
  if (next.className) root.classList.add(next.className);
  root.setAttribute("data-theme", next.id);
}

/**
 * Inline script injected into <head> so the theme is applied BEFORE React
 * hydrates, preventing a flash of the wrong theme.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)});var c={classic:"",premium:"theme-premium"};if(t&&c[t]){document.documentElement.classList.add(c[t]);document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() => readSavedTheme());

  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore quota / private mode */
    }
  }, [theme]);

  const setTheme = useCallback((id: ThemeId) => setThemeState(id), []);

  return { theme, setTheme, themes: THEMES };
}
