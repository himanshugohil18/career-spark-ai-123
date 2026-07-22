import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_STEPS = [
  "🧠  Reading resume…",
  "🔍  Finding skills…",
  "📊  Matching experience…",
  "✨  Building Career Brain…",
  "⚡  Discovering opportunities…",
];

/**
 * AIThinking — reusable "AI is working" indicator.
 * Never say "Loading…". Always say what the intelligence is doing.
 */
export function AIThinking({
  steps = DEFAULT_STEPS,
  interval = 1800,
  className,
  size = "md",
}: {
  steps?: string[];
  interval?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % steps.length), interval);
    return () => clearInterval(t);
  }, [steps.length, interval]);

  const text =
    size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-full border border-border bg-elevated/70 px-3.5 py-1.5 backdrop-blur",
        className,
      )}
    >
      <ThinkingOrb />
      <AnimatePresence mode="wait">
        <motion.span
          key={steps[i]}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className={cn("font-mono tracking-tight text-foreground/90", text)}
        >
          {steps[i]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function ThinkingOrb() {
  return (
    <span className="relative flex h-4 w-4 items-center justify-center">
      <motion.span
        aria-hidden
        animate={{ rotate: 360 }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, #4F8CFF 90deg, #22D3EE 180deg, transparent 260deg)",
          mask: "radial-gradient(circle, transparent 40%, black 41%)",
          WebkitMask: "radial-gradient(circle, transparent 40%, black 41%)",
        }}
      />
      <span className="h-1.5 w-1.5 rounded-full bg-[image:var(--gradient-brand-glow)] shadow-[0_0_8px_2px_#4F8CFF66]" />
    </span>
  );
}
