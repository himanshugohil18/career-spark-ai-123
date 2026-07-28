import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * ProgressRing — compact circular progress indicator for queued/running
 * agent jobs, driven by the real `progress` (0-100) field.
 */
export function ProgressRing({
  progress,
  size = 36,
  stroke = 3,
  className,
  tone = "text-primary",
  showLabel = true,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  className?: string;
  tone?: string;
  showLabel?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, progress));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-border"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          className={tone}
          stroke="currentColor"
          initial={false}
          animate={{ strokeDashoffset: c - (clamped / 100) * c }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {showLabel && (
        <span className="absolute font-mono text-[9px] font-semibold tabular-nums">{Math.round(clamped)}</span>
      )}
    </div>
  );
}
