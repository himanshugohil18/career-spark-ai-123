/**
 * Match Intelligence panel — deterministic skill-gap analysis computed from
 * the user's Career Brain against this job's requirements. Complements the
 * AI match score; never requires an AI call.
 */

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, Info } from "lucide-react";
import { getJobSkillGap } from "@/lib/intelligence.functions";
import { Skeleton } from "@/components/ai/skeleton";
import { cn } from "@/lib/utils";

const BREAKDOWN_ROWS: Array<{ key: string; label: string }> = [
  { key: "skills", label: "Skills" },
  { key: "experience", label: "Experience" },
  { key: "projects", label: "Projects" },
  { key: "location", label: "Location" },
  { key: "careerGoal", label: "Career goal" },
];

export function MatchIntelligence({ jobId }: { jobId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["job-skill-gap", jobId],
    queryFn: () => getJobSkillGap({ data: { jobId } }),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <Skeleton className="h-56 rounded-2xl" />;
  if (!data) return null;
  if (!data.brainReady) {
    return (
      <section className="surface-card p-6">
        <h3 className="font-display text-lg font-semibold">Match Intelligence</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Approve your Career Brain to unlock deterministic skill-gap analysis for this role.
        </p>
      </section>
    );
  }

  const { gap } = data;

  return (
    <section className="surface-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">Match Intelligence</h3>
        <span className="font-mono text-sm font-semibold text-primary">{gap.overallMatch}% fit</span>
      </div>

      {gap.limited && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          This job posting lists few structured requirements, so the analysis is based on limited data.
        </div>
      )}

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          {BREAKDOWN_ROWS.map((r) => {
            const v = gap.breakdown[r.key as keyof typeof gap.breakdown];
            return (
              <div key={r.key}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                  <span className="font-mono text-[11px] tabular-nums text-foreground/80">{v}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      v >= 80 ? "bg-success" : v >= 50 ? "bg-primary" : "bg-warning",
                    )}
                    style={{ width: `${v}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          {gap.strongMatches.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-success">
                <CheckCircle2 className="h-3 w-3" /> You have ({gap.strongMatches.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {gap.strongMatches.slice(0, 12).map((s) => (
                  <span key={s} className="rounded-md bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {gap.gaps.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-warning">
                <CircleAlert className="h-3 w-3" /> To learn ({gap.gaps.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {gap.gaps.slice(0, 12).map((s) => (
                  <span key={s} className="rounded-md bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {gap.strongMatches.length === 0 && gap.gaps.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No structured skill requirements on this posting — check the description for details.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
