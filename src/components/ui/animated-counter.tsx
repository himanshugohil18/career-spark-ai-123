import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

/**
 * Smoothly animates a number from 0 → `value` when it mounts or `value` changes.
 * Respects prefers-reduced-motion via the global CSS override.
 */
export function AnimatedCounter({
  value,
  duration = 1.2,
  format,
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    const controls = animate(from, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, duration]);
  const rounded = Math.round(display);
  return <span className={className}>{format ? format(rounded) : rounded.toLocaleString()}</span>;
}
