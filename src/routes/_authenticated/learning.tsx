import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { GraduationCap, ExternalLink, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ai/skeleton";
import { getLearningPaths } from "@/lib/career-intel.functions";

export const Route = createFileRoute("/_authenticated/learning")({
  head: () => ({ meta: [{ title: "Learning · CareerOS" }] }),
  component: LearningPage,
});

function LearningPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["learning-paths"],
    queryFn: () => getLearningPaths(),
    staleTime: 60_000,
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-10">
      <PageHeader
        eyebrow="Learning"
        title="Personalized skill paths"
        description="Ranked by frequency across your gap analyses and top matches. Every path here unlocks real roles you already partially qualify for."
        meta={
          data?.targetRole ? (
            <span className="text-xs text-muted-foreground">
              Target role · <span className="text-foreground">{data.targetRole}</span>
            </span>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : !data?.ready ? (
        <div className="surface-card p-10 text-center">
          <GraduationCap className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Upload and approve your resume to generate a learning plan.</p>
        </div>
      ) : data.paths.length === 0 ? (
        <div className="surface-card p-10 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-primary" />
          <h3 className="mt-3 font-display text-lg font-semibold">Nothing critical to learn right now</h3>
          <p className="mt-1 text-sm text-muted-foreground">Your Career Brain already covers the skills your top matches ask for.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.paths.map((p, i) => (
            <motion.div
              key={p.skill}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
              className="surface-card card-interactive flex h-full flex-col gap-4 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
                      p.priority === "high"
                        ? "border-warning/40 bg-warning/10 text-warning"
                        : p.priority === "medium"
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-elevated text-muted-foreground"
                    }`}>{p.priority}</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      ~{p.estimatedWeeks}w
                    </span>
                  </div>
                  <h3 className="break-words font-display text-lg font-semibold leading-tight">{p.skill}</h3>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Unlocks <span className="text-foreground">{p.jobsAffected}</span> role{p.jobsAffected === 1 ? "" : "s"} in your matches.
              </p>
              {p.sampleTitles.length > 0 && (
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  e.g. {p.sampleTitles.join(" · ")}
                </p>
              )}
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <a
                  href={`https://www.google.com/search?q=${p.resourceQuery}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-3 py-1.5 text-xs text-foreground transition-all hover:-translate-y-[1px] hover:border-primary/40 hover:text-primary"
                >
                  Find resources <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href={`https://www.youtube.com/results?search_query=${p.resourceQuery}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-3 py-1.5 text-xs text-foreground transition-all hover:-translate-y-[1px] hover:border-primary/40 hover:text-primary"
                >
                  Videos <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
