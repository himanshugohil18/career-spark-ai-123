import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ai/skeleton";
import { PageHeader } from "@/components/product/page-header";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { getCareerAnalytics } from "@/lib/career-intel.functions";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics · CareerOS" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["career-analytics"],
    queryFn: () => getCareerAnalytics(),
    staleTime: 60_000,
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-10">
      <PageHeader
        eyebrow="Analytics"
        title="Your search, quantified"
        description="Every number on this page is real — pulled from your Career Brain, persisted matches, and application workspaces."
      />

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-4">
          {[0,1,2,3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <Stat label="Matches ranked" value={data!.totals.matches} suffix="" />
            <Stat label="Avg match score" value={data!.averageMatchScore} suffix="/100" />
            <Stat label="Saved" value={data!.totals.saved} />
            <Stat label="Workspaces" value={data!.totals.workspaces} suffix={` · avg ${data!.averageReadiness}% ready`} />
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <Stat label="Viewed" value={data!.totals.viewed} />
            <Stat label="Notifications" value={data!.totals.notifications} />
            <Stat label="Questions practiced" value={data!.totals.practiced} suffix={` / ${data!.totals.questions}`} />
          </section>

          <section className="surface-card p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">30-day activity</p>
            <h3 className="mt-1 font-display text-lg font-semibold">Momentum</h3>
            <ActivityChart activity={data!.activity} />
            <div className="mt-3 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <LegendDot tone="primary" label="Applications" />
              <LegendDot tone="accent" label="Questions practiced" />
              <LegendDot tone="muted" label="New matches" />
            </div>
          </section>

          <section className="surface-card p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Match distribution</p>
            <h3 className="mt-1 font-display text-lg font-semibold">How your matches break down</h3>
            <div className="mt-4 space-y-2.5">
              <DistBar label="Excellent (85+)" value={data!.distribution["85plus"]} total={data!.totals.matches} tone="primary" />
              <DistBar label="Strong (70-84)" value={data!.distribution["70to84"]} total={data!.totals.matches} tone="accent" />
              <DistBar label="Fair (50-69)" value={data!.distribution["50to69"]} total={data!.totals.matches} tone="muted" />
              <DistBar label="Weak (under 50)" value={data!.distribution.under50} total={data!.totals.matches} tone="warning" />
            </div>
          </section>

          {data!.funnel.length > 0 && (
            <section className="surface-card p-6">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Application funnel</p>
              <h3 className="mt-1 font-display text-lg font-semibold">Where your applications sit</h3>
              <div className="mt-4 space-y-2.5">
                {data!.funnel.map((f: any) => (
                  <DistBar key={f.stage} label={f.stage} value={f.count} total={data!.totals.workspaces} tone="primary" />
                ))}
              </div>
            </section>
          )}

          {data!.topIndustries.length > 0 && (
            <section className="surface-card p-6">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Top industries in your feed</p>
              <ul className="mt-3 grid gap-2 md:grid-cols-2">
                {data!.topIndustries.map(([name, count]: [string, number]) => (
                  <li key={name} className="flex items-center justify-between rounded-lg border border-border bg-elevated px-3 py-2 text-sm">
                    <span>{name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{count} role{count === 1 ? "" : "s"}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid gap-3 md:grid-cols-3">
            <Meta label="Career Health" value={data!.careerHealth != null ? `${data!.careerHealth}/100` : "—"} />
            <Meta label="Brain Version" value={data!.brainVersion ? `v${data!.brainVersion}` : "—"} />
            <Meta label="Last match" value={data!.lastMatchAt ? new Date(data!.lastMatchAt).toLocaleString() : "—"} />
          </section>

          {data!.totals.matches === 0 && (
            <div className="surface-card flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <BarChart3 className="h-5 w-5 text-primary" />
              No matches yet. Approve your resume and open the Jobs page to populate analytics.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ActivityChart({ activity }: { activity: Array<{ date: string; apps: number; practiced: number; matches: number }> }) {
  const max = Math.max(1, ...activity.flatMap((d) => [d.apps, d.practiced, d.matches]));
  return (
    <div className="mt-4 flex h-32 items-end gap-[3px]">
      {activity.map((d) => (
        <div key={d.date} className="group relative flex flex-1 flex-col items-center gap-[1px]" title={`${d.date} · ${d.apps} apps · ${d.practiced} practiced · ${d.matches} matches`}>
          <div className="w-full rounded-t-sm bg-muted-foreground/60" style={{ height: `${(d.matches / max) * 100}%` }} />
          <div className="w-full bg-accent" style={{ height: `${(d.practiced / max) * 100}%` }} />
          <div className="w-full rounded-b-sm bg-primary" style={{ height: `${(d.apps / max) * 100}%` }} />
        </div>
      ))}
    </div>
  );
}

function LegendDot({ tone, label }: { tone: "primary" | "accent" | "muted"; label: string }) {
  const bg = tone === "primary" ? "bg-primary" : tone === "accent" ? "bg-accent" : "bg-muted-foreground/60";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-sm ${bg}`} />
      {label}
    </span>
  );
}


function Stat({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  const numeric = typeof value === "number" ? value : Number(value);
  const isNum = Number.isFinite(numeric);
  return (
    <div className="surface-card card-interactive p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <span className="icon-halo h-7 w-7"><BarChart3 className="h-3.5 w-3.5" /></span>
      </div>
      <p className="mt-2 font-display text-3xl font-semibold text-gradient-stat">
        {isNum ? <AnimatedCounter value={numeric} /> : value}
        <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span>
      </p>
    </div>
  );
}


function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-elevated p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-sm font-semibold">{value}</p>
    </div>
  );
}

function DistBar({ label, value, total, tone }: { label: string; value: number; total: number; tone: "primary" | "accent" | "muted" | "warning" }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const bg =
    tone === "primary" ? "bg-primary" : tone === "accent" ? "bg-accent" : tone === "warning" ? "bg-warning" : "bg-muted-foreground/60";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-foreground/80">{label}</span>
        <span className="font-mono text-muted-foreground">{value} · {pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div className={`h-full ${bg}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
