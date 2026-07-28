import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConsoleEvent = {
  id: string;
  created_at: string;
  kind?: string | null;
  step?: string | null;
  message: string;
};

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatIstTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "--:--:--";
  return timeFmt.format(d);
}

function toneFor(kind?: string | null) {
  switch (kind) {
    case "error":
      return "text-red-500";
    case "warning":
      return "text-amber-500";
    case "approval":
      return "text-primary";
    default:
      return "text-muted-foreground";
  }
}

/**
 * ConsoleLog — terminal-style activity feed that streams real
 * step/event records. Never fabricates lines: shows an explicit idle
 * state when there is nothing to show yet.
 */
export function ConsoleLog({
  events,
  className,
  title = "Activity console",
  maxLines = 200,
  dense = false,
}: {
  events: ConsoleEvent[];
  className?: string;
  title?: string;
  maxLines?: number;
  dense?: boolean;
}) {
  const rows = useMemo(() => events.slice(-maxLines), [events, maxLines]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [newestId, setNewestId] = useState<string | null>(null);

  useEffect(() => {
    const last = rows[rows.length - 1];
    setNewestId(last ? last.id : null);
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [rows]);

  return (
    <div className={cn("surface-card overflow-hidden p-0", className)}>
      <div className="flex items-center gap-2 border-b border-border bg-elevated/50 px-4 py-2.5">
        <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{title}</p>
        <div className="ml-auto flex gap-1.5" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-red-500/60" />
          <span className="h-2 w-2 rounded-full bg-amber-500/60" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
        </div>
      </div>
      <div
        ref={scrollRef}
        className={cn(
          "scrollbar-thin overflow-y-auto bg-background/60 px-4 py-3 font-mono text-[11px] leading-relaxed",
          dense ? "max-h-40" : "max-h-72",
        )}
      >
        {rows.length === 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="inline-block h-2 w-1.5 animate-pulse bg-muted-foreground/60" aria-hidden />
            <span>console idle — no agent activity yet.</span>
          </div>
        ) : (
          <ol className="space-y-1">
            {rows.map((e) => (
              <motion.li
                key={e.id}
                initial={e.id === newestId ? { opacity: 0, y: 4 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={cn("flex flex-wrap items-baseline gap-x-3 gap-y-0.5", toneFor(e.kind))}
              >
                <span className="opacity-60">{formatIstTime(e.created_at)}</span>
                {e.step && <span className="uppercase opacity-60">{e.step}</span>}
                <span className="flex-1 text-foreground/90">
                  {e.id === newestId ? <TypedLine text={e.message} /> : e.message}
                </span>
              </motion.li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

/** Fast typewriter reveal used only for the most recently appended line. */
function TypedLine({ text }: { text: string }) {
  const [count, setCount] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? text.length
      : 0,
  );

  useEffect(() => {
    if (count >= text.length) return;
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setCount(text.length);
      return;
    }
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, 8);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return <>{text.slice(0, count)}</>;
}
