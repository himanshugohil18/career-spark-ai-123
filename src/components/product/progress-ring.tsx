import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Solid-color circular progress ring. Used for health scores, match scores,
 * completeness — anywhere a percentage deserves more than a bar.
 */
export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  tone = "primary",
  label,
  sublabel,
  className,
}: {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  tone?: "primary" | "success" | "warning" | "danger";
  /** Center content — defaults to the rounded value. */
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const colors = {
    primary: "var(--primary)",
    success: "var(--success)",
    warning: "var(--warning)",
    danger: "var(--danger)",
  } as const;

  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colors[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (clamped / 100) * c }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-none">
          <div className="font-display font-semibold tracking-tight" style={{ fontSize: size / 3.4 }}>
            {label ?? Math.round(clamped)}
          </div>
          {sublabel && <div className="mt-0.5 text-[9px] font-medium uppercase tracking-widest text-muted-foreground">{sublabel}</div>}
        </div>
      </div>
    </div>
  );
}

/** Tone helper: pick ring tone from score. */
export function scoreTone(v: number): "success" | "primary" | "warning" | "danger" {
  if (v >= 75) return "success";
  if (v >= 50) return "primary";
  if (v >= 30) return "warning";
  return "danger";
}
