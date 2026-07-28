import { useId, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PIPELINE_COLUMNS } from "./pipeline-stages";

/**
 * Slim self-drawing funnel summarizing the pipeline. Draws its outline once
 * on mount (animated stroke-dashoffset), then fills in step widths by count.
 */
export function PipelineFunnel({ counts, total }: { counts: number[]; total: number }) {
  const gradientId = useId();
  const reduce = useReducedMotion();

  const width = 640;
  const height = 88;
  const n = counts.length;
  const stepW = width / n;
  const maxH = 56;
  const minH = 14;

  const bars = useMemo(
    () =>
      counts.map((c, i) => {
        const ratio = total > 0 ? c / total : 0;
        const h = minH + ratio * (maxH - minH);
        return { h, count: c, label: PIPELINE_COLUMNS[i]?.title ?? "" };
      }),
    [counts, total],
  );

  const topPath = useMemo(() => {
    const pts = bars.map((b, i) => {
      const x = i * stepW + stepW / 2;
      const y = (height - b.h) / 2;
      return `${x},${y}`;
    });
    return `M${pts.join(" L")}`;
  }, [bars, stepW]);

  const bottomPath = useMemo(() => {
    const pts = bars.map((b, i) => {
      const x = i * stepW + stepW / 2;
      const y = (height + b.h) / 2;
      return `${x},${y}`;
    });
    return `M${pts.join(" L")}`;
  }, [bars, stepW]);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Pipeline funnel">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {bars.map((b, i) => {
          const x = i * stepW;
          const y = (height - b.h) / 2;
          return (
            <motion.rect
              key={i}
              x={x + 4}
              y={y}
              width={stepW - 8}
              height={b.h}
              rx={6}
              fill={`url(#${gradientId})`}
              initial={{ opacity: 0, scaleY: reduce ? 1 : 0.2 }}
              animate={{ opacity: 1, scaleY: 1 }}
              style={{ transformOrigin: `${x + stepW / 2}px ${height / 2}px` }}
              transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            />
          );
        })}

        <motion.path
          d={topPath}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={1.5}
          strokeLinecap="round"
          initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.path
          d={bottomPath}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={1.5}
          strokeLinecap="round"
          initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="mt-1.5 grid gap-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}>
        {bars.map((b, i) => (
          <div key={i} className="text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{b.label}</p>
            <p className="font-display text-sm font-semibold">{b.count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
