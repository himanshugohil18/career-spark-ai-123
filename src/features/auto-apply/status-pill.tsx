import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; tone: string; dot: string }> = {
  idle: { label: "idle", tone: "text-muted-foreground bg-elevated border-border", dot: "bg-muted-foreground" },
  queued: { label: "queued", tone: "text-muted-foreground bg-elevated border-border", dot: "bg-muted-foreground" },
  running: { label: "running", tone: "text-primary bg-primary/10 border-primary/40", dot: "bg-primary" },
  awaiting_input: { label: "awaiting input", tone: "text-amber-500 bg-amber-500/10 border-amber-500/40", dot: "bg-amber-500" },
  awaiting_approval: { label: "awaiting approval", tone: "text-amber-500 bg-amber-500/10 border-amber-500/40", dot: "bg-amber-500" },
  submitting: { label: "submitting", tone: "text-primary bg-primary/10 border-primary/40", dot: "bg-primary" },
  completed: { label: "completed", tone: "text-emerald-500 bg-emerald-500/10 border-emerald-500/40", dot: "bg-emerald-500" },
  failed: { label: "failed", tone: "text-red-500 bg-red-500/10 border-red-500/40", dot: "bg-red-500" },
  cancelled: { label: "cancelled", tone: "text-muted-foreground bg-elevated border-border", dot: "bg-muted-foreground" },
  paused: { label: "paused", tone: "text-amber-500 bg-amber-500/10 border-amber-500/40", dot: "bg-amber-500" },
};

const PULSING = new Set(["running", "submitting", "awaiting_input", "awaiting_approval"]);

/**
 * StatusPill — a small badge that morphs color/label with a layout
 * transition instead of abruptly swapping when the underlying status changes.
 */
export function StatusPill({
  status,
  layoutId,
  className,
}: {
  status: string;
  layoutId?: string;
  className?: string;
}) {
  const meta = STATUS_META[status] ?? {
    label: status.replace(/_/g, " "),
    tone: "text-muted-foreground bg-elevated border-border",
    dot: "bg-muted-foreground",
  };
  const pulse = PULSING.has(status);

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={status}
        layout
        layoutId={layoutId}
        initial={{ opacity: 0, y: -4, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 4, scale: 0.94 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest",
          meta.tone,
          className,
        )}
      >
        <motion.span
          aria-hidden
          animate={pulse ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
          transition={{ duration: 1.4, repeat: pulse ? Infinity : 0, ease: "easeInOut" }}
          className={cn("h-1.5 w-1.5 rounded-full", meta.dot)}
        />
        {meta.label}
      </motion.span>
    </AnimatePresence>
  );
}
