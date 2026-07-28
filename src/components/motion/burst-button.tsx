import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * BurstButton — micro-interaction wrapper. On activation it fires a radial
 * particle burst plus a spring pop. Used for save/bookmark/like actions.
 */
export function BurstButton({
  active,
  onClick,
  children,
  className,
  ariaLabel,
  title,
  particles = 8,
}: {
  active?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  title?: string;
  particles?: number;
}) {
  const [burstKey, setBurstKey] = useState<number | null>(null);

  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      title={title}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.86 }}
      transition={{ type: "spring", stiffness: 480, damping: 18 }}
      onClick={(e) => {
        if (!active) setBurstKey(Date.now());
        onClick?.(e);
      }}
      className={cn("relative", className)}
    >
      <motion.span
        key={String(active)}
        initial={{ scale: active ? 0.6 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 14 }}
        className="relative z-10 flex items-center justify-center"
      >
        {children}
      </motion.span>

      <AnimatePresence>
        {burstKey && (
          <motion.span
            key={burstKey}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            onAnimationComplete={() => setBurstKey(null)}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
          >
            <motion.span
              className="absolute inset-0 rounded-full border border-primary/60"
              initial={{ scale: 0.4, opacity: 0.9 }}
              animate={{ scale: 2.1, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            {Array.from({ length: particles }).map((_, i) => {
              const angle = (i / particles) * Math.PI * 2;
              return (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-primary"
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos(angle) * 16,
                    y: Math.sin(angle) * 16,
                    opacity: 0,
                    scale: 0.3,
                  }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                />
              );
            })}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/** MagneticButton — subtle pointer-follow lift for primary CTAs. */
export function Magnetic({
  children,
  className,
  strength = 10,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  return (
    <motion.div
      className={cn("inline-block", className)}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        setOffset({ x: x * strength, y: y * strength });
      }}
      onPointerLeave={() => setOffset({ x: 0, y: 0 })}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
    >
      {children}
    </motion.div>
  );
}
