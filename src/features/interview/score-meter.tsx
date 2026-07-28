import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { bandForScore } from "./tips";

/**
 * Self-assessment score meter. Fills with spring physics from 0 to the
 * selected score (1-5) and colour-codes the fill by band. Purely a local
 * reflection aid — not a graded/AI score.
 */
export function ScoreMeter({ score }: { score: number }) {
  const band = bandForScore(score);
  const pct = Math.max(0, Math.min(1, score / 5)) * 100;

  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 140, damping: 20, mass: 0.9 });
  const width = useTransform(spring, (v) => `${v}%`);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    mv.set(pct);
  }, [pct, mv]);

  useEffect(() => spring.on("change", (v) => setDisplay(Math.round(v))), [spring]);

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-mono uppercase tracking-widest text-muted-foreground">Self-review</span>
        <span className="font-mono text-foreground/80">{band.label}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
        <motion.div
          className={`h-full rounded-full ${band.className}`}
          style={{ width }}
        />
      </div>
      <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground">{display}%</p>
    </div>
  );
}
