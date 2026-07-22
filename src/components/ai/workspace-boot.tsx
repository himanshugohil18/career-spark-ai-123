import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/landing/logo";

const STEPS = [
  "Preparing your workspace…",
  "Loading your AI agents…",
  "Calibrating Career Brain…",
  "Workspace ready.",
];

const ease = [0.22, 1, 0.36, 1] as const;
const KEY = "careeros_boot_v1";

/**
 * WorkspaceBoot — one-time premium splash shown on first entry to the
 * authenticated workspace per browser session. ~1s total.
 */
export function WorkspaceBoot({ children }: { children: ReactNode }) {
  const [booting, setBooting] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(KEY) !== "1";
  });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!booting) return;
    const cadence = [220, 260, 260, 220];
    let cancelled = false;
    let i = 0;
    const tick = () => {
      if (cancelled) return;
      if (i >= cadence.length) {
        sessionStorage.setItem(KEY, "1");
        setBooting(false);
        return;
      }
      setStep(i);
      setTimeout(() => {
        i += 1;
        tick();
      }, cadence[i]);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [booting]);

  return (
    <>
      <AnimatePresence>
        {booting && (
          <motion.div
            key="boot"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
            aria-hidden
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{ backgroundImage: "var(--gradient-hero)" }}
            />
            <div className="relative flex flex-col items-center gap-6">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease }}
                className="relative"
              >
                <span
                  className="absolute inset-0 -m-8 rounded-full opacity-60 blur-2xl"
                  style={{ backgroundImage: "var(--gradient-brand-glow)" }}
                />
                <div className="relative flex items-center gap-3">
                  <Logo size={40} />
                  <span className="font-display text-2xl font-semibold tracking-tight">
                    CareerOS
                  </span>
                </div>
              </motion.div>

              <div className="flex items-center gap-3">
                <BootOrb />
                <AnimatePresence mode="wait">
                  <motion.p
                    key={STEPS[step]}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.22, ease }}
                    className="font-mono text-[12px] tracking-tight text-muted-foreground"
                  >
                    {STEPS[step]}
                  </motion.p>
                </AnimatePresence>
              </div>

              <div className="h-[2px] w-56 overflow-hidden rounded-full bg-border">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                  transition={{ duration: 0.35, ease }}
                  className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}

function BootOrb() {
  return (
    <span className="relative flex h-4 w-4 items-center justify-center">
      <motion.span
        aria-hidden
        animate={{ rotate: 360 }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, #4F8CFF 90deg, #22D3EE 180deg, transparent 260deg)",
          mask: "radial-gradient(circle, transparent 42%, black 43%)",
          WebkitMask: "radial-gradient(circle, transparent 42%, black 43%)",
        }}
      />
      <span className="h-1.5 w-1.5 rounded-full bg-[image:var(--gradient-brand-glow)] shadow-[0_0_10px_2px_#4F8CFF66]" />
    </span>
  );
}
