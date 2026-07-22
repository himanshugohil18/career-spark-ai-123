import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentStatusDot, type AgentState } from "./agent-status";

type Row = { name: string; state: AgentState; note: string };

const ROWS: Row[] = [
  { name: "Workspace", state: "active", note: "Ready" },
  { name: "Career Brain", state: "waiting", note: "Awaiting resume" },
  { name: "Resume Agent", state: "ready", note: "Standing by" },
  { name: "Job Agent", state: "idle", note: "Paused" },
  { name: "Interview Agent", state: "locked", note: "Locked" },
  { name: "Learning Agent", state: "ready", note: "Initialized" },
  { name: "Sync", state: "active", note: "Live" },
];

const ROTATE = [
  "🧠  Resume Agent ready",
  "🔍  Job Discovery waiting for Career Brain",
  "📊  Career Agent preparing workspace",
  "🎤  Interview Agent standing by",
  "🚀  Application Agent ready",
  "✨  Learning Agent initialized",
];

const ease = [0.22, 1, 0.36, 1] as const;

export function AIStatusBar() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % ROTATE.length), 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex justify-end md:bottom-6 md:right-6">
      <motion.div
        layout
        transition={{ layout: { duration: 0.35, ease } }}
        className="pointer-events-auto overflow-hidden rounded-xl border border-border bg-elevated/90 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl"
      >
        <button
          onClick={() => setOpen((v) => !v)}
          className="group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-card/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-expanded={open}
          aria-label="AI activity"
        >
          <span className="relative flex h-2 w-2 items-center justify-center">
            <motion.span
              aria-hidden
              initial={{ opacity: 0.6, scale: 1 }}
              animate={{ opacity: 0, scale: 2.4 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 rounded-full bg-success"
            />
            <span className="relative h-2 w-2 rounded-full bg-success" />
          </span>
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.p
                key={ROTATE[i]}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22, ease }}
                className="max-w-[220px] truncate font-mono text-[11px] tracking-tight text-foreground/90 sm:max-w-[280px]"
              >
                {ROTATE[i]}
              </motion.p>
            </AnimatePresence>
          </div>
          <ChevronUp
            className={cn(
              "ml-1 h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 group-hover:text-foreground",
              open && "rotate-180",
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease }}
              className="border-t border-border"
            >
              <div className="flex items-center justify-between px-3 pt-2.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Activity
                </p>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                  <Activity className="h-3 w-3" />
                  live
                </span>
              </div>
              <ul className="space-y-1 p-2">
                {ROWS.map((r) => (
                  <li
                    key={r.name}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-[12px] transition-colors hover:bg-card/70"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <AgentStatusDot state={r.state} />
                      <span className="truncate text-foreground/90">{r.name}</span>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {r.note}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
