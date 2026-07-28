import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";
import { SpringNumber } from "@/components/motion/spring-number";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MatchBreakdown } from "./match-breakdown";

export type MatchRingBreakdown = Record<string, unknown> | null;

/**
 * Circular match score ring. Uses the design system primary gradient.
 * Animates 0 → value once it scrolls into view. When breakdown data is
 * supplied, clicking/hovering reveals the real scoring reasons — no
 * invented numbers, just whatever is already computed.
 */
export function MatchRing({
  value,
  size = 56,
  strokeWidth = 5,
  className,
  breakdown,
  explanation,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  breakdown?: MatchRingBreakdown;
  explanation?: string | null;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (inView ? clamped : 0) / 100);
  const tone =
    clamped >= 85 ? "text-success" : clamped >= 70 ? "text-primary" : clamped >= 50 ? "text-accent" : "text-warning";

  const ring = (
    <div ref={ref} className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
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
        className={cn("absolute rounded-full border border-current", tone)}
        style={{ width: size, height: size }}
        animate={{ opacity: [0.28, 0, 0.28], scale: [0.86, 1.06, 0.86] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className={cn("absolute font-mono text-[11px] font-semibold tabular-nums", tone)}>
        <SpringNumber value={inView ? clamped : 0} />
      </span>
    </div>
  );

  if (!breakdown) return ring;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={`Match score ${Math.round(clamped)}%. Click for breakdown.`}
        >
          {ring}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 border-border bg-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Why {Math.round(clamped)}%
        </p>
        {explanation && <p className="mb-3 text-[12px] leading-relaxed text-foreground/85">{explanation}</p>}
        <MatchBreakdown match={breakdown} />
      </PopoverContent>
    </Popover>
  );
}
