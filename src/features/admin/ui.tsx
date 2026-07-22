import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  sub?: string;
  tone?: "default" | "success" | "warn" | "danger";
}) {
  const toneCls =
    tone === "success"
      ? "text-emerald-500"
      : tone === "warn"
        ? "text-amber-500"
        : tone === "danger"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-elevated/70 p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <Icon className={`h-3.5 w-3.5 ${toneCls}`} />
      </div>
      <p className={`mt-2 font-display text-2xl font-semibold tracking-tight ${toneCls}`}>
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="font-display text-sm font-semibold">{title}</p>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

export const money = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

export function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s === "failed" || s === "expired" || s === "cancelled"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : s === "completed" || s === "captured" || s === "active" || s === "up"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
        : s === "running" || s === "pending" || s === "created"
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border text-muted-foreground";
  return (
    <span className={`inline-flex rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${cls}`}>
      {status}
    </span>
  );
}
