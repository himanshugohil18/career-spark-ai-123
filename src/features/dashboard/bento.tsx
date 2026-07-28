import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BentoGrid({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-4", className)}>{children}</div>;
}

const SPAN: Record<1 | 2 | 3 | 4, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
};

/**
 * A single bento cell. Pass `isFetching` to overlay a subtle data-freshness
 * shimmer while the underlying query is revalidating in the background.
 */
export function BentoTile({
  span = 1,
  rowSpan = 1,
  isFetching,
  className,
  children,
}: {
  span?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2;
  isFetching?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("relative", SPAN[span], rowSpan === 2 && "md:row-span-2", className)}>
      {children}
      <AnimatePresence>
        {isFetching && (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
          >
            <motion.div
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
              animate={{ x: ["-120%", "220%"] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: "linear" }}
            />
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-elevated/80 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-primary">
              <span className="status-dot h-1 w-1" /> Syncing
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
