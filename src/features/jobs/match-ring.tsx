import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Circular match score ring. Uses the design system primary gradient.
 */
export function MatchRing({
  value,
  size = 56,
  strokeWidth = 5,
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const tone =
    clamped >= 85 ? "text-success" : clamped >= 70 ? "text-primary" : clamped >= 50 ? "text-accent" : "text-warning";

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-border"
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn("fill-none stroke-current", tone)}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <span className={cn("absolute font-mono text-[11px] font-semibold tabular-nums", tone)}>
        {Math.round(clamped)}
      </span>
    </div>
  );
}
