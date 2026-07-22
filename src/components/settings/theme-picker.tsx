import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme, type ThemeId } from "@/lib/theme";

export function ThemePicker() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <section className="surface-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Palette className="h-4 w-4 text-primary" />
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Appearance
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Switch the CareerOS interface theme. Your choice is remembered on this
        device.
      </p>

      <div
        role="radiogroup"
        aria-label="Interface theme"
        className="mt-5 grid gap-3 sm:grid-cols-2"
      >
        {themes.map((t) => {
          const active = theme === t.id;
          return (
            <ThemeOption
              key={t.id}
              id={t.id}
              name={t.name}
              tagline={t.tagline}
              swatches={t.swatches}
              active={active}
              onSelect={() => setTheme(t.id)}
            />
          );
        })}
      </div>
    </section>
  );
}

function ThemeOption({
  id,
  name,
  tagline,
  swatches,
  active,
  onSelect,
}: {
  id: ThemeId;
  name: string;
  tagline: string;
  swatches: string[];
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border p-4 text-left transition-all duration-200",
        "hover:-translate-y-[1px]",
        active
          ? "border-primary/50 bg-elevated shadow-[0_0_0_1px_rgba(79,140,255,0.35),0_10px_28px_-16px_rgba(79,140,255,0.35)]"
          : "border-border bg-card hover:border-white/10 hover:bg-elevated",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-foreground">
            {name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{tagline}</p>
        </div>
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
            active
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-transparent text-transparent",
          )}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      </div>

      {/* Faux preview strip built from the swatches */}
      <div
        className="relative h-16 overflow-hidden rounded-lg border border-border"
        style={{ background: swatches[0] }}
      >
        <div
          className="absolute inset-x-3 top-3 h-3 rounded-[4px]"
          style={{ background: swatches[1] }}
        />
        <div
          className="absolute left-3 top-8 h-2 w-16 rounded-full"
          style={{ background: swatches[2] }}
        />
        <div
          className="absolute left-3 top-12 h-1.5 w-10 rounded-full opacity-80"
          style={{ background: swatches[3] }}
        />
        <div
          className="absolute right-3 top-8 h-6 w-6 rounded-md"
          style={{
            background: `linear-gradient(135deg, ${swatches[2]}, ${swatches[3]})`,
            boxShadow: `0 6px 18px -6px ${swatches[2]}66`,
          }}
        />
      </div>

      <div className="flex items-center gap-1.5">
        {swatches.map((c) => (
          <span
            key={`${id}-${c}`}
            aria-hidden
            className="h-3 w-3 rounded-full border border-border"
            style={{ background: c }}
          />
        ))}
      </div>
    </button>
  );
}
