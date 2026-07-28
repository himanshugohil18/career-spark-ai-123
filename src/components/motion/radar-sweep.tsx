import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * RadarSweep — animated empty-state illustration. A scanning radar with
 * expanding rings and orbiting blips, used when no results are found yet.
 */
export function RadarSweep({ size = 132, className }: { size?: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border border-primary/30"
          style={{ width: size, height: size }}
          initial={{ scale: 0.35, opacity: 0.65 }}
          animate={{ scale: 1, opacity: 0 }}
          transition={{ duration: 3, repeat: Infinity, delay: i, ease: "easeOut" }}
        />
      ))}
      <span
        className="absolute rounded-full border border-border"
        style={{ width: size * 0.66, height: size * 0.66 }}
      />
      <span
        className="absolute rounded-full border border-border/70"
        style={{ width: size * 0.33, height: size * 0.33 }}
      />
      <motion.span
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          background:
            "conic-gradient(from 0deg, color-mix(in oklab, var(--color-primary) 55%, transparent) 0deg, transparent 70deg)",
          maskImage: "radial-gradient(circle, black 62%, transparent 63%)",
          WebkitMaskImage: "radial-gradient(circle, black 62%, transparent 63%)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      {[
        { x: 0.24, y: -0.18, d: 0 },
        { x: -0.3, y: 0.12, d: 1.3 },
        { x: 0.12, y: 0.28, d: 2.4 },
      ].map((b, i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_2px] shadow-accent/50"
          style={{ transform: `translate(${b.x * size}px, ${b.y * size}px)` }}
          animate={{ opacity: [0, 1, 0], scale: [0.6, 1.3, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, delay: b.d, ease: "easeInOut" }}
        />
      ))}
      <motion.span
        className="h-2.5 w-2.5 rounded-full bg-primary"
        animate={{ scale: [1, 1.4, 1], opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
