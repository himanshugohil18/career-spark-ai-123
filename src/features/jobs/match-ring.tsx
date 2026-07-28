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
          transition={{ type: "spring", stiffness: 90, damping: 20, mass: 0.9 }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <motion.span
        aria-hidden
        className={cn("absolute rounded-full", tone)}
        style={{
          width: size,
          height: size,
          boxShadow: "0 0 0 0 currentColor",
        }}
        animate={{ opacity: [0.28, 0, 0.28], scale: [0.86, 1.06, 0.86] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className={cn("absolute font-mono text-[11px] font-semibold tabular-nums", tone)}>
        <SpringNumber value={clamped} />
      </span>

    </div>
  );
}
