import { cn } from "@/lib/utils";

/**
 * A small pulsing "● LIVE" indicator used across dashboard/workspace headers.
 */
export function LiveDot({
  label = "LIVE",
  tone = "primary",
  className,
}: {
  label?: string;
  tone?: "primary" | "success" | "warning" | "accent";
  className?: string;
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "accent"
          ? "text-accent"
          : "text-primary";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-elevated/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em]",
        color,
        className,
      )}
    >
      <span className="status-dot h-1.5 w-1.5" />
      {label}
    </span>
  );
}
