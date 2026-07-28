import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, CheckCircle2, Circle } from "lucide-react";
import { WaveformRecorder } from "./waveform-recorder";
import { ScoreMeter } from "./score-meter";
import { tipsForCategory } from "./tips";
import { cn } from "@/lib/utils";

export interface FocusQuestion {
  id: string;
  question: string;
  category?: string | null;
  difficulty?: string | null;
  practiced?: boolean | null;
}

const CATEGORY_LABEL: Record<string, string> = {
  behavioral: "Behavioral",
  technical: "Technical",
  company: "Company",
  resume: "Resume",
  general: "General",
  system_design: "System Design",
  coding: "Coding",
};

const EASE = [0.22, 1, 0.36, 1] as const;

const cardVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? 60 : -60,
    rotateY: dir > 0 ? 35 : -35,
    scale: 0.94,
  }),
  center: { opacity: 1, x: 0, rotateY: 0, scale: 1 },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -60 : 60,
    rotateY: dir > 0 ? -35 : 35,
    scale: 0.94,
  }),
};

export function FocusMode({
  questions,
  startIndex = 0,
  onClose,
  onTogglePracticed,
}: {
  questions: FocusQuestion[];
  startIndex?: number;
  onClose: () => void;
  onTogglePracticed: (id: string, practiced: boolean) => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [direction, setDirection] = useState(1);
  const [score, setScore] = useState<number | null>(null);

  const current = questions[index];

  const go = (dir: number) => {
    setIndex((i) => {
      const next = i + dir;
      if (next < 0 || next >= questions.length) return i;
      setDirection(dir);
      setScore(null);
      return next;
    });
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.code === "Space") {
        const target = e.target as HTMLElement | null;
        if (target && ["INPUT", "TEXTAREA", "BUTTON"].includes(target.tagName)) return;
        e.preventDefault();
        go(1);
      } else if (e.code === "ArrowRight") {
        go(1);
      } else if (e.code === "ArrowLeft") {
        go(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, questions.length]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const prefersReducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const tips = tipsForCategory(current?.category);

  if (!current) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-background/98 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Interview practice focus mode"
    >
      <div className="flex items-center justify-between px-5 py-4 md:px-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Focus mode</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Question {index + 1} of {questions.length}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-2.5 py-1.5 text-xs hover:border-primary/40"
        >
          <X className="h-3.5 w-3.5" />
          Exit
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-5 py-6 md:px-0">
        <div style={{ perspective: 1200 }} className="w-full">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={current.id}
              custom={direction}
              variants={prefersReducedMotion ? undefined : cardVariants}
              initial={prefersReducedMotion ? { opacity: 0 } : "enter"}
              animate={prefersReducedMotion ? { opacity: 1 } : "center"}
              exit={prefersReducedMotion ? { opacity: 0 } : "exit"}
              transition={{ duration: 0.28, ease: EASE }}
              style={{ transformStyle: "preserve-3d" }}
              className="surface-card w-full p-6 md:p-10"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {CATEGORY_LABEL[current.category ?? "general"] ?? current.category} · {current.difficulty ?? "—"}
                </span>
                <button
                  type="button"
                  onClick={() => onTogglePracticed(current.id, !current.practiced)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition",
                    current.practiced
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {current.practiced ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                  {current.practiced ? "Practiced" : "Mark practiced"}
                </button>
              </div>

              <p className="mt-6 text-center font-display text-xl font-semibold leading-snug md:text-2xl">
                {current.question}
              </p>

              <div className="mt-8 space-y-5">
                <WaveformRecorder />

                {score === null ? (
                  <div className="flex flex-col items-center gap-2">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      How did that feel?
                    </p>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setScore(n)}
                          className="h-8 w-8 rounded-full border border-border text-xs font-mono transition hover:border-primary/50 hover:text-primary"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="space-y-4"
                  >
                    <ScoreMeter score={score} />
                    <motion.ul
                      className="space-y-1.5"
                      initial="hidden"
                      animate="show"
                      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
                    >
                      {tips.map((t) => (
                        <motion.li
                          key={t}
                          variants={{
                            hidden: { opacity: 0, y: 6 },
                            show: { opacity: 1, y: 0 },
                          }}
                          transition={{ duration: 0.22, ease: EASE }}
                          className="flex items-start gap-2 rounded-lg border border-border bg-elevated/50 px-3 py-2 text-xs text-foreground/80"
                        >
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {t}
                        </motion.li>
                      ))}
                    </motion.ul>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1.5">
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              aria-label={`Go to question ${i + 1}`}
              onClick={() => {
                setDirection(i > index ? 1 : -1);
                setScore(null);
                setIndex(i);
              }}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground/40",
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index === 0}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-3 py-1.5 text-xs disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={index === questions.length - 1}
            className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary disabled:opacity-30"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 border-t border-border py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span><kbd className="rounded border border-border px-1.5 py-0.5">Space</kbd> Next</span>
        <span><kbd className="rounded border border-border px-1.5 py-0.5">Esc</kbd> Exit</span>
        <span><kbd className="rounded border border-border px-1.5 py-0.5">←</kbd> <kbd className="rounded border border-border px-1.5 py-0.5">→</kbd> Navigate</span>
      </div>
    </div>,
    document.body,
  );
}
