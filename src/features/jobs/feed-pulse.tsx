import { motion } from "framer-motion";
import { Activity, RefreshCw, Sparkles, Radar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGreeting } from "@/lib/greeting";
import { relativeDays } from "@/lib/jobs/freshness";

export type FeedPulseData = {
  ready: boolean;
  totalActive: number;
  newToday: number;
  newThisWeek: number;
  strongMatches: number;
  lastVerifiedAt: string | null;
  activeSources: number;
  trustedSources?: number;
  domains: string[];
  insight: string;
  displayName: string;
};

function verifiedLabel(iso: string | null): string {
  if (!iso) return "awaiting first crawl";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "awaiting first crawl";
  const mins = Math.floor((Date.now() - t) / 60_000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return relativeDays(Math.floor(hours / 24));
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-elevated/60 px-3.5 py-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-primary">
        {icon}
      </span>
      <div className="leading-tight">
        <p className="font-display text-base font-semibold tabular-nums">{value}</p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function FeedPulse({
  data,
  loading,
  onRefresh,
  refreshing,
}: {
  data?: FeedPulseData;
  loading?: boolean;
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  const greeting = getGreeting({ displayName: data?.displayName ?? "there" });

  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
      className="surface-card relative overflow-hidden p-6 md:p-7"
    >
      <div className="relative flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              AI Recommendation Center
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold md:text-3xl">{greeting.primary}</h1>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
              {loading ? "Reading your live job pulse…" : (data?.insight ?? greeting.secondary)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-border bg-elevated px-3 py-1.5 text-[11px] text-muted-foreground sm:inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Verified {verifiedLabel(data?.lastVerifiedAt ?? null)}
            </span>
            <Button size="sm" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              {refreshing ? "Refreshing" : "Refresh jobs"}
            </Button>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Radar className="h-4 w-4" />} value={data?.totalActive ?? "—"} label="Live roles" />
          <Stat icon={<Clock className="h-4 w-4" />} value={data?.newToday ?? "—"} label="New today" />
          <Stat icon={<Activity className="h-4 w-4" />} value={data?.newThisWeek ?? "—"} label="New this week" />
          <Stat
            icon={<Sparkles className="h-4 w-4" />}
            value={data?.strongMatches ?? "—"}
            label="Strong matches"
          />
        </div>

        {!!data?.domains?.length && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Tracking
            </span>
            {data.domains.map((d) => (
              <span
                key={d}
                className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-primary"
              >
                {d}
              </span>
            ))}
            {data.activeSources > 0 && (
              <span className="text-muted-foreground">
                across {data.activeSources} live source{data.activeSources === 1 ? "" : "s"}
                {typeof data.trustedSources === "number" && data.trustedSources > 0
                  ? ` · ${data.trustedSources} verified company/API source${data.trustedSources === 1 ? "" : "s"}`
                  : ""}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.header>
  );
}
