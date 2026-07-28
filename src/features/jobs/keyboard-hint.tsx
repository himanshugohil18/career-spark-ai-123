import { Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYS: Array<{ key: string; label: string }> = [
  { key: "j/k", label: "move" },
  { key: "s", label: "save" },
  { key: "x", label: "dismiss" },
  { key: "a", label: "apply" },
];

/** Small instrument-style chip documenting list keyboard shortcuts. */
export function KeyboardHintChip({ className, keys = KEYS }: { className?: string; keys?: typeof KEYS }) {
  return (
    <div
      className={cn(
        "hidden items-center gap-2.5 rounded-full border border-border bg-elevated/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground md:inline-flex",
        className,
      )}
    >
      <Keyboard className="h-3 w-3" />
      {keys.map((k, i) => (
        <span key={k.key} className="inline-flex items-center gap-1 normal-case tracking-normal">
          <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground/80">
            {k.key}
          </kbd>
          {k.label}
          {i < keys.length - 1 && <span className="text-border">·</span>}
        </span>
      ))}
    </div>
  );
}
