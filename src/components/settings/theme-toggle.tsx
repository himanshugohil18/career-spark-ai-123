import { Palette } from "lucide-react";
import { useTheme, THEMES, type ThemeId } from "@/lib/theme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  function cycle() {
    const ids = THEMES.map((t) => t.id) as ThemeId[];
    const next = ids[(ids.indexOf(theme) + 1) % ids.length];
    setTheme(next);
  }

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <button
      onClick={cycle}
      aria-label={`Theme: ${current.name}. Click to switch.`}
      title={`Theme: ${current.name} — click to switch`}
      className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-elevated text-muted-foreground transition-all hover:-translate-y-[1px] hover:border-primary/40 hover:text-primary hover:shadow-[0_8px_20px_-8px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
    >
      <Palette className="h-4 w-4" />
    </button>
  );
}
