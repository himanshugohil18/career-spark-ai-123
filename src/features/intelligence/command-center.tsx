/**
 * Career Command Center — readiness score with full breakdown, daily
 * missions, next best actions and career insights. All real data from the
 * intelligence layer; empty/insufficient states are explicit.
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Flame,
  Lightbulb,
  ListChecks,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getCommandCenter } from "@/lib/intelligence.functions";
import { ProgressRing, scoreTone } from "@/components/product/progress-ring";
import { SectionHeading } from "@/components/product/page-header";
import { Skeleton } from "@/components/ai/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

const PRIORITY_ICON: Record<string, typeof Flame> = {
  apply: Flame,
  follow_up: ArrowUpRight,
  skill_gap: TrendingUp,
  interview: ListChecks,
  roadmap: CheckCircle2,
  resume: Sparkles,
};

export function CommandCenter() {
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["command-center"],
    queryFn: () => getCommandCenter(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
      </div>
    );
  }
  if (!data) return null;

  const { readiness, actions, insights, missions } = data;
  const doneMissions = missions.filter((m) => m.status === "completed").length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease }}
      className="space-y-6"
    >
      <SectionHeading
        title="Command Center"
        description="Your readiness, priorities and daily mission — computed from your real CareerOS data."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Readiness score */}
        <button
          onClick={() => setBreakdownOpen(true)}
          className="surface-highlight group flex items-center gap-5 p-6 text-left transition-shadow hover:shadow-card"
        >
          <ProgressRing
            value={readiness.overall}
            size={92}
            stroke={8}
            tone={scoreTone(readiness.overall)}
            sublabel="/ 100"
          />
          <div className="min-w-0">
            <p className="section-label">Career Readiness</p>
            <p className="mt-1.5 text-sm font-medium text-foreground">
              {readiness.overall >= 75
                ? "Strong — you're market-ready"
                : readiness.overall >= 50
                  ? "Solid foundation, keep building"
                  : "Early stage — big gains available"}
            </p>
            {readiness.highestImpactAction && (
              <p className="mt-1 text-xs text-muted-foreground">
                ↑ ~+{readiness.highestImpactAction.estimatedImpact} potential improvement available
              </p>
            )}
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:text-primary-hover">
              View breakdown <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </button>

        {/* Next best actions */}
        <div className="surface-card p-6 lg:col-span-2">
          <p className="section-label">Next best actions</p>
          {actions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No actions right now. Upload your resume and set a target role so CareerOS can guide you.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {actions.slice(0, 4).map((a) => {
                const Icon = PRIORITY_ICON[a.kind] ?? Sparkles;
                return (
                  <li key={a.title}>
                    <Link to={a.link} className="group flex items-start gap-3 py-3">
                      <span
                        className={cn(
                          "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                          a.priority === "high"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground group-hover:text-primary">
                          {a.title}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                          {a.detail}
                        </span>
                      </span>
                      <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Today's missions */}
        <div className="surface-card p-6">
          <div className="flex items-center justify-between">
            <p className="section-label">Today's mission</p>
            {missions.length > 0 && (
              <span className="text-xs font-medium text-muted-foreground">
                {doneMissions}/{missions.length} done
              </span>
            )}
          </div>
          {missions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Missions appear once CareerOS knows your goals. Set your preferred role in your profile.
            </p>
          ) : (
            <>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${missions.length ? (doneMissions / missions.length) * 100 : 0}%` }}
                />
              </div>
              <ul className="mt-4 space-y-2.5">
                {missions.map((m) => (
                  <li key={m.id} className="flex items-center gap-3">
                    {m.status === "completed" ? (
                      <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-success" />
                    ) : (
                      <Circle className="h-4.5 w-4.5 shrink-0 text-muted-foreground/50" />
                    )}
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        m.status === "completed" ? "text-muted-foreground line-through" : "text-foreground",
                      )}
                    >
                      {m.title}
                    </span>
                    {m.link && m.status !== "completed" && (
                      <Link to={m.link} className="text-xs font-semibold text-primary hover:text-primary-hover">
                        Go
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Career insights */}
        <div className="surface-card p-6">
          <p className="section-label">Career insights</p>
          {insights.insufficientData ? (
            <div className="mt-3 flex items-start gap-3">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed text-muted-foreground">{insights.guidance}</p>
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {insights.insights.map((insight) => (
                <li key={insight.text} className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm leading-relaxed text-foreground">{insight.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Readiness breakdown sheet */}
      <Sheet open={breakdownOpen} onOpenChange={setBreakdownOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Career Readiness · {readiness.overall}/100</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-5">
            {readiness.categories.map((c) => (
              <div key={c.key}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{c.label}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{c.score}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      c.score >= 75 ? "bg-success" : c.score >= 50 ? "bg-primary" : "bg-warning",
                    )}
                    style={{ width: `${c.score}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{c.explanation}</p>
                {c.recommendation && (
                  <p className="mt-1 text-xs font-medium text-primary">→ {c.recommendation}</p>
                )}
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                  Source: {c.source}
                </p>
              </div>
            ))}

            {readiness.highestImpactAction && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="section-label text-primary">Highest impact next action</p>
                <p className="mt-1.5 text-sm font-medium text-foreground">
                  {readiness.highestImpactAction.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {readiness.highestImpactAction.detail} Estimated impact: +
                  {readiness.highestImpactAction.estimatedImpact} points (estimate, not a guarantee).
                </p>
                <Link
                  to={readiness.highestImpactAction.link}
                  onClick={() => setBreakdownOpen(false)}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover"
                >
                  Take action <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </motion.section>
  );
}
