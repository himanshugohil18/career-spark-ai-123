import { AnimatePresence, motion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

/**
 * RouteProgress — thin gradient bar that runs across the top during
 * route transitions and data loading.
 */
export function RouteProgress() {
  const status = useRouterState({ select: (s) => s.status });
  const isLoading = status === "pending";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(false), 320);
    return () => clearTimeout(t);
  }, [isLoading]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="route-progress"
          className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="h-full bg-[image:var(--gradient-brand-glow,linear-gradient(90deg,#4F8CFF,#22D3EE))]"
            initial={{ width: "8%" }}
            animate={{ width: isLoading ? "82%" : "100%" }}
            transition={{ duration: isLoading ? 1.4 : 0.25, ease: [0.22, 1, 0.36, 1] }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** PageTransition — fade + lift between routes, keyed on pathname. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
