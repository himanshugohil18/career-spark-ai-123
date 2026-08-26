import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Wallet, GraduationCap, Compass, Radar, Wrench } from "lucide-react";
import { Skeleton } from "@/components/ai/skeleton";
import { getCoachBriefing } from "@/lib/career-intel.functions";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({ meta: [{ title: "AI Coach · CareerOS" }] }),
  component: CoachPage,
});

const ICONS: Record<string, typeof Sparkles> = {
  next_action: Compass,
  resume: Wrench,
  career_health: Radar,
  skill: GraduationCap,
  salary: Wallet,
  market: TrendingUp,
  trend: TrendingUp,
};

function CoachPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["coach-briefing"],
    queryFn: () => getCoachBriefing(),
    staleTime: 60_000,
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-6 md:p-10">
      <PageHeader
        eyebrow="AI Coach"
        title="Today's briefing"
        description="Personalized, quantitative guidance derived from your Career Brain, live matches, and application readiness — refreshed on every visit."
        meta={
          data?.families?.length ? (
            <>
              {data.families.map((f) => (
                <span key={f.id} className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary">
                  {f.label}
                </span>
              ))}
            </>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : !data?.ready ? (
        <EmptyState />
      ) : data.advice.length === 0 ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          Your Career Brain looks clean. No urgent advice — keep applying and I'll flag anything new.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.advice.map((a, i) => {
            const Icon = ICONS[a.kind] ?? Sparkles;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                className="surface-card p-5"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-elevated text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{a.kind.replace(/_/g, " ")}</p>
                <h3 className="mt-1 font-display text-base font-semibold">{a.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{a.body}</p>
                {a.cta && (
                  <Link to={a.cta.href} className="mt-3 inline-block text-xs text-primary underline-offset-2 hover:underline">
                    {a.cta.label} →
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="surface-card p-10 text-center">
      <Sparkles className="mx-auto h-6 w-6 text-primary" />
      <h3 className="mt-3 font-display text-lg font-semibold">Coach needs your Career Brain</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload and approve your resume to unlock personalized coaching.
      </p>
      <Link to="/dashboard" className="mt-4 inline-block text-sm text-primary underline-offset-2 hover:underline">
        Go to dashboard →
      </Link>
    </div>
  );
}
