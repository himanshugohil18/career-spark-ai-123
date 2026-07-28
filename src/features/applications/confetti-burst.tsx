import { useMemo } from "react";
import { motion } from "framer-motion";

const COLORS = ["bg-primary", "bg-accent", "bg-success", "bg-warning"];

/**
 * One-shot, canvas-free DOM particle burst. Mount briefly (e.g. via key +
 * setTimeout unmount) when a card lands in the celebratory column.
 */
export function ConfettiBurst({ originX = "50%", originY = "50%" }: { originX?: string | number; originY?: string | number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.4;
        const distance = 40 + Math.random() * 50;
        return {
          id: i,
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance - 10,
          rotate: Math.random() * 360,
          color: COLORS[i % COLORS.length],
          size: 4 + Math.random() * 4,
        };
      }),
    [],
  );

  return (
    <div
      className="pointer-events-none absolute z-50 motion-reduce:hidden"
      style={{ left: originX, top: originY }}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className={`absolute rounded-sm ${p.color}`}
          style={{ width: p.size, height: p.size }}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
          animate={{ opacity: 0, x: p.dx, y: p.dy, rotate: p.rotate, scale: 0.4 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  );
}
