import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { JobCard, type JobCardData } from "./job-card";
import { KeyboardHintChip } from "./keyboard-hint";

/**
 * Radar list: renders the job feed with keyboard triage (j/k navigate,
 * s save, x dismiss, a apply) and a directional exit animation when a
 * card is dismissed. Selecting a card (click or arrow keys) drives the
 * split-view detail preview on large screens.
 */
export function JobRadarList({
  jobs,
  selectedId,
  onSelect,
  onSave,
  onDismiss,
  onApply,
  onClick,
  splitView,
}: {
  jobs: Array<JobCardData & { insights?: string[] }>;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onSave?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onApply?: (id: string) => void;
  onClick?: (id: string) => void;
  splitView?: boolean;
}) {
  const [exitDir, setExitDir] = useState<Record<string, number>>({});

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (jobs.length === 0) return;
      const idx = Math.max(0, jobs.findIndex((j) => j.id === selectedId));

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = jobs[Math.min(jobs.length - 1, idx + (selectedId ? 1 : 0))];
        if (next) onSelect?.(next.id);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = jobs[Math.max(0, idx - 1)];
        if (prev) onSelect?.(prev.id);
      } else if (e.key === "s" && selectedId && onSave) {
        e.preventDefault();
        onSave(selectedId);
      } else if (e.key === "x" && selectedId && onDismiss) {
        e.preventDefault();
        setExitDir((d) => ({ ...d, [selectedId]: -1 }));
        onDismiss(selectedId);
      } else if (e.key === "a" && selectedId && onApply) {
        e.preventDefault();
        onApply(selectedId);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [jobs, selectedId, onSelect, onSave, onDismiss, onApply]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <KeyboardHintChip />
      </div>
      <AnimatePresence initial={false} mode="popLayout">
        {jobs.map((job) => (
          <motion.div
            key={job.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{
              opacity: 0,
              x: (exitDir[job.id] ?? 1) * 80,
              transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
            }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <JobCard
              job={job}
              insights={job.insights}
              onSave={onSave}
              onClick={onClick}
              selected={splitView && selectedId === job.id}
              onSelect={splitView ? onSelect : undefined}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
