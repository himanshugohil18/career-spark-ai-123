import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Typewriter — streaming-style text reveal used for AI reasoning output.
 */
export function Typewriter({
  text,
  speed = 18,
  className,
  caret = true,
  onDone,
}: {
  text: string;
  speed?: number;
  className?: string;
  caret?: boolean;
  onDone?: () => void;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    if (!text) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setCount(text.length);
      onDone?.();
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) {
        clearInterval(id);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed]);

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {text.slice(0, count)}
      {caret && count < text.length && (
        <motion.span
          aria-hidden
          animate={{ opacity: [1, 0.15, 1] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-primary align-baseline"
        />
      )}
    </span>
  );
}

/** Streaming "AI is reasoning" block: pulsing bar + typewritten line. */
export function AIStream({
  lines,
  className,
  lineDelay = 900,
}: {
  lines: string[];
  className?: string;
  lineDelay?: number;
}) {
  const [index, setIndex] = useState(0);
  const shown = lines.slice(0, index + 1);

  return (
    <div className={cn("space-y-1.5", className)}>
      {shown.map((line, i) => (
        <div key={line + i} className="flex items-start gap-2">
          <motion.span
            aria-hidden
            animate={
              i === index
                ? { opacity: [0.35, 1, 0.35], scale: [1, 1.25, 1] }
                : { opacity: 0.45, scale: 1 }
            }
            transition={{ duration: 1.2, repeat: i === index ? Infinity : 0 }}
            className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
          />
          <p className="font-mono text-xs leading-relaxed text-muted-foreground">
            {i === index ? (
              <Typewriter
                text={line}
                onDone={() => {
                  if (index < lines.length - 1) {
                    setTimeout(() => setIndex((v) => v + 1), lineDelay);
                  }
                }}
              />
            ) : (
              line
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
