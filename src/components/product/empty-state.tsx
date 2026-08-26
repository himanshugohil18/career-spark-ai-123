import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Rich, contextual empty state. Never just the word "Empty".
 * Use `tips` to offer 2–3 related suggestions and `action`/`secondaryAction` for next steps.
 */
export function EmptyState({
  icon: Icon,
  eyebrow,
  title,
  body,
  action,
  secondaryAction,
  tips,
  compact,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow?: string;
  title: string;
  body: string;
  action?: { label: string; to?: string; onClick?: () => void };
  secondaryAction?: { label: string; to?: string; onClick?: () => void };
  /** Related suggestions rendered as small chips. */
  tips?: { icon?: React.ComponentType<{ className?: string }>; label: string; to?: string; onClick?: () => void }[];
  compact?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
      className={cn(
        "relative flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/40 text-center",
        compact ? "p-8" : "p-10 md:p-14",
        className,
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-card text-primary shadow-soft">
        <Icon className="h-5 w-5" />
      </span>
      {eyebrow && <p className="section-label mt-4">{eyebrow}</p>}
      <h3 className="section-title mt-1.5 text-base md:text-lg">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>

      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action && (
            <ActionButton variant="primary" {...action} />
          )}
          {secondaryAction && (
            <ActionButton variant="outline" {...secondaryAction} />
          )}
        </div>
      )}

      {tips && tips.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 border-t border-border/70 pt-5">
          <span className="meta-text mr-1">Try:</span>
          {tips.map((t) => {
            const content = (
              <>
                {t.icon && <t.icon className="h-3.5 w-3.5 text-primary" />}
                {t.label}
              </>
            );
            const cls = "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary";
            return t.to ? (
              <Link key={t.label} to={t.to} className={cls}>{content}</Link>
            ) : (
              <button key={t.label} type="button" onClick={t.onClick} className={cls}>{content}</button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function ActionButton({ label, to, onClick, variant }: {
  label: string;
  to?: string;
  onClick?: () => void;
  variant: "primary" | "outline";
}) {
  if (to) {
    return (
      <Button variant={variant} asChild>
        <Link to={to}>{label}</Link>
      </Button>
    );
  }
  return (
    <Button variant={variant} onClick={onClick}>
      {label}
    </Button>
  );
}
