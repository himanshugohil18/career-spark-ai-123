import { useEffect, useRef, useState } from "react";
import { useMotionValue, useSpring, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * SpringNumber — physics-eased numeric counter.
 * Counts up when scrolled into view and re-springs whenever `value` changes.
 */
export function SpringNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  stiffness = 120,
  damping = 24,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  stiffness?: number;
  damping?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness, damping, mass: 0.8 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, value, mv]);

  useEffect(() => spring.on("change", (v) => setDisplay(v)), [spring]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
