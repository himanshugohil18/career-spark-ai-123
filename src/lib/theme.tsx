import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * CareerOS experience themes.
 * - "classic"   → the original CareerOS design system (unchanged).
 * - "immersive" → the new cinematic / editorial visual system.
 *
 * The choice is persisted in localStorage and mirrored onto
 * `<html data-theme="…">`. A tiny inline script in the document head
 * applies the attribute before first paint so there is no theme flash.
 */
export type ExperienceTheme = "classic" | "immersive";

export const THEME_STORAGE_KEY = "careeros-experience-theme";

/** Inline script (runs before paint) — keep in sync with the storage key. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="immersive"||t==="classic"){document.documentElement.dataset.theme=t;}else{document.documentElement.dataset.theme="classic";}}catch(e){document.documentElement.dataset.theme="classic";}})();`;

function readStoredTheme(): ExperienceTheme {
  if (typeof window === "undefined") return "classic";
  try {
    const t = window.localStorage.getItem(THEME_STORAGE_KEY);
    return t === "immersive" ? "immersive" : "classic";
  } catch {
    return "classic";
  }
}

interface ThemeContextValue {
  theme: ExperienceTheme;
  setTheme: (theme: ExperienceTheme) => void;
  toggleTheme: () => void;
  /** True after the provider has mounted on the client (SSR-safe gate). */
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "classic",
  setTheme: () => {},
  toggleTheme: () => {},
  ready: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize from the attribute the head script already applied, so the
  // first client render agrees with what is on screen.
  const [theme, setThemeState] = useState<ExperienceTheme>(() => {
    if (typeof document !== "undefined") {
      const attr = document.documentElement.dataset.theme;
      if (attr === "immersive") return "immersive";
    }
    return readStoredTheme();
  });
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const setTheme = useCallback((next: ExperienceTheme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
    document.documentElement.dataset.theme = next;
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "immersive" ? "classic" : "immersive");
  }, [theme, setTheme]);

  // Keep the attribute in sync if another tab changed it.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      const next = e.newValue === "immersive" ? "immersive" : "classic";
      setThemeState(next);
      document.documentElement.dataset.theme = next;
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, ready }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
