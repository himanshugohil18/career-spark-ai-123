import { motion, useScroll, useTransform, useSpring, type MotionValue } from "framer-motion";
import { useRef } from "react";
import { FileText, Brain, Radar, Send, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: FileText,
    label: "Resume in",
    copy: "Drop a PDF. The parser lifts skills, seniority, links and impact lines.",
  },
  {
    icon: Brain,
    label: "Career Brain",
    copy: "A living profile of what you can do, what you want, and where you fit.",
  },
  {
    icon: Radar,
    label: "Discovery",
    copy: "Ten job portals swept continuously, scored against your track only.",
  },
  {
    icon: Send,
    label: "Auto-apply",
    copy: "Tailored resume + cover letter, submitted by the agent on your behalf.",
  },
  {
    icon: BadgeCheck,
    label: "Interview",
    copy: "Prep drills, mock rounds and follow-ups until the offer lands.",
  },
];

/**
 * ScrollPipeline — pinned scroll-driven story of the CareerOS pipeline.
 * The section pins while a progress beam draws through five stages.
 */
export function ScrollPipeline() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.5 });
  const beam = useTransform(progress, [0, 1], ["0%", "100%"]);

  return (
    <div ref={ref} className="relative h-[300vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="mb-10 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              The pipeline
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              Resume in. Offer out.
            </h2>
          </div>

          <div className="relative">
            <div className="absolute left-0 right-0 top-7 hidden h-[2px] bg-border md:block" />
            <motion.div
              className="absolute left-0 top-7 hidden h-[2px] bg-[image:var(--gradient-brand-glow,linear-gradient(90deg,#4F8CFF,#22D3EE))] md:block"
              style={{ width: beam }}
            />
            <div className="grid gap-8 md:grid-cols-5">
              {STEPS.map((step, i) => (
                <PipelineStep key={step.label} step={step} index={i} progress={progress} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineStep({
  step,
  index,
  progress,
}: {
  step: (typeof STEPS)[number];
  index: number;
  progress: MotionValue<number>;
}) {
  const start = index / STEPS.length;
  const mid = start + 0.06;
  const opacity = useTransform(progress, [start - 0.08, mid], [0.28, 1]);
  const y = useTransform(progress, [start - 0.08, mid], [26, 0]);
  const scale = useTransform(progress, [start - 0.08, mid], [0.94, 1]);
  const Icon = step.icon;

  return (
    <motion.div style={{ opacity, y, scale }} className="relative text-center md:text-left">
      <div
        className={cn(
          "mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-primary/30 bg-background text-primary md:mx-0",
          "shadow-[0_0_28px_-8px_color-mix(in_oklab,var(--color-primary)_60%,transparent)]",
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        Stage {String(index + 1).padStart(2, "0")}
      </p>
      <h3 className="mt-1 font-display text-lg font-semibold">{step.label}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.copy}</p>
    </motion.div>
  );
}
