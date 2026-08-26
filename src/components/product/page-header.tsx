import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Standard authenticated page header.
 * Eyebrow → title → description on the left; primary actions + meta chips on the right.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Small fact chips shown under/next to the title — e.g. "10,607 live jobs", "Updated 2h ago" */
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
      className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}
    >
      <div className="min-w-0">
        {eyebrow && <p className="section-label">{eyebrow}</p>}
        <h1 className={cn("page-title", eyebrow && "mt-1.5")}>{title}</h1>
        {description && <p className="page-subtitle mt-2 max-w-2xl">{description}</p>}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </motion.header>
  );
}

/** Small neutral fact chip for PageHeader meta rows. */
export function MetaChip({ icon: Icon, children, tone = "default" }: {
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
  tone?: "default" | "brand" | "success" | "warning";
}) {
  const tones = {
    default: "border-border bg-card text-muted-foreground",
    brand: "border-primary/20 bg-accent text-accent-foreground",
    success: "border-success/25 bg-success/10 text-success",
    warning: "border-warning/30 bg-warning/10 text-warning-foreground",
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", tones[tone])}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

/** Standard page width container for authenticated routes. */
export function PageShell({ children, className, width = "default" }: {
  children: ReactNode;
  className?: string;
  width?: "default" | "wide" | "narrow";
}) {
  const widths = {
    narrow: "max-w-3xl",
    default: "max-w-6xl",
    wide: "max-w-7xl",
  } as const;
  return (
    <div className={cn("mx-auto w-full space-y-8 p-6 md:p-10", widths[width], className)}>
      {children}
    </div>
  );
}

/** Section heading with optional trailing action. */
export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="section-title">{title}</h2>
        {description && <p className="meta-text mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}
