import { Check, LayoutGrid, Clapperboard } from "lucide-react";
import { toast } from "sonner";
import { useTheme, type ExperienceTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Visual theme picker — two genuine product experiences, not a color toggle.
 * Used in Settings → Appearance.
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  function pick(next: ExperienceTheme) {
    if (next === theme) return;
    setTheme(next);
    toast.success(
      next === "immersive"
        ? "CareerOS Immersive activated"
        : "CareerOS Classic activated",
      {
        description:
          next === "immersive"
            ? "Bold. Visual. Cinematic. Applied across your whole workspace."
            : "Clean. Focused. Familiar. Applied across your whole workspace.",
      },
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Appearance theme">
      <ThemeCard
        active={theme === "classic"}
        onSelect={() => pick("classic")}
        icon={LayoutGrid}
        name="CareerOS Classic"
        tagline="Clean. Focused. Familiar."
        description="The original CareerOS workspace — light surfaces, brand blue, productive SaaS layout."
        preview={<ClassicPreview />}
      />
      <ThemeCard
        active={theme === "immersive"}
        onSelect={() => pick("immersive")}
        icon={Clapperboard}
        name="CareerOS Immersive"
        tagline="Bold. Visual. Cinematic."
        description="A dark editorial experience — oversized typography, solid signal orange, cinematic motion."
        preview={<ImmersivePreview />}
      />
    </div>
  );
}

function ThemeCard({
  active,
  onSelect,
  icon: Icon,
  name,
  tagline,
  description,
  preview,
}: {
  active: boolean;
  onSelect: () => void;
  icon: typeof LayoutGrid;
  name: string;
  tagline: string;
  description: string;
  preview: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300",
        active
          ? "border-primary bg-accent shadow-card"
          : "border-border bg-card hover:border-primary/40 hover:shadow-card",
      )}
    >
      <div className="mb-4 overflow-hidden rounded-xl border border-border">
        {preview}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
            <p className="text-sm font-semibold text-foreground">{name}</p>
          </div>
          <p className="mt-0.5 text-xs font-medium text-primary">{tagline}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <span
          className={cn(
            "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors",
            active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
          )}
        >
          {active && <Check className="h-3 w-3" />}
        </span>
      </div>
    </button>
  );
}

/* Miniature wireframe previews (pure CSS, solid colors only) */
function ClassicPreview() {
  return (
    <div className="flex h-28 bg-[#F8FAFC]">
      <div className="w-9 border-r border-[#E2E8F0] bg-[#152A42] p-1.5">
        <div className="mb-1.5 h-1.5 rounded-full bg-white/40" />
        <div className="mb-1 h-1 rounded-full bg-white/20" />
        <div className="mb-1 h-1 rounded-full bg-white/20" />
        <div className="h-1 rounded-full bg-white/20" />
      </div>
      <div className="flex-1 p-2.5">
        <div className="mb-2 h-2 w-2/5 rounded-full bg-[#0F172A]" />
        <div className="mb-1.5 h-1.5 w-3/5 rounded-full bg-[#CBD5E1]" />
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-8 rounded-md border border-[#E2E8F0] bg-white" />
          <div className="h-8 rounded-md border border-[#2F5CFF]/40 bg-[#EEF3FF]" />
          <div className="h-8 rounded-md border border-[#E2E8F0] bg-white" />
        </div>
        <div className="mt-1.5 h-5 w-16 rounded-md bg-[#2F5CFF]" />
      </div>
    </div>
  );
}

function ImmersivePreview() {
  return (
    <div className="flex h-28 bg-[#100F0D]">
      <div className="w-9 border-r border-[#2A2823] bg-[#0A0A09] p-1.5">
        <div className="mb-1.5 h-1.5 rounded-full bg-[#F2F0E9]/40" />
        <div className="mb-1 h-1 rounded-full bg-[#F2F0E9]/15" />
        <div className="mb-1 h-1 rounded-full bg-[#F2F0E9]/15" />
        <div className="h-1 rounded-full bg-[#F2F0E9]/15" />
      </div>
      <div className="flex-1 p-2.5">
        <div className="mb-1 h-1 w-1/4 rounded-full bg-[#FF5A1F]" />
        <div className="mb-0.5 h-3 w-4/5 rounded-sm bg-[#F2F0E9]" style={{ fontFamily: "Space Grotesk" }} />
        <div className="mb-2 h-3 w-3/5 rounded-sm bg-[#F2F0E9]/70" />
        <div className="flex items-end gap-1.5">
          <div className="h-8 flex-1 rounded-sm border border-[#2A2823] bg-[#171613]" />
          <div className="h-11 w-10 rounded-sm bg-[#FF5A1F]" />
        </div>
      </div>
    </div>
  );
}
