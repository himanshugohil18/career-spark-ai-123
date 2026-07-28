import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Arms exactly once per component lifetime. Re-renders (query refetches,
 * state changes) never flip it back — only a real remount replays the
 * cascade reveal.
 */
export function useCascadeGate() {
  const played = useRef(false);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    const id = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return armed;
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28, ease: EASE } },
};

export function CascadeGroup({
  armed,
  className,
  children,
}: {
  armed: boolean;
  className?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate={armed ? "show" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function CascadeItem({ className, children }: { className?: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div variants={item} className={cn(className)}>
      {children}
    </motion.div>
  );
}
