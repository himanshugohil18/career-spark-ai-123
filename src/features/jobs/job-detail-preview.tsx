import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Building2, ExternalLink, MapPin, Sparkles, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ai/skeleton";
import { MatchRing } from "./match-ring";
import { MissingSkills, type MissingSkill } from "./missing-skills";
import { ApplyWithAiButton } from "@/features/auto-apply/apply-with-ai-button";
import { getJobDetail } from "@/lib/jobs.functions";
import { openExternal, isValidExternalUrl } from "@/lib/open-external";
import { cn } from "@/lib/utils";

/**
 * Live detail preview shown alongside the radar list on large screens.
 * Title/company share a layoutId with the originating JobCard so the
 * selection animates smoothly into the preview header.
 */
export function JobDetailPreview({
  jobId,
  saved,
  onSave,
  onClose,
}: {
  jobId: string | null;
  saved?: boolean;
  onSave?: (id: string) => void;
  onClose?: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["job-detail", jobId],
    queryFn: () => getJobDetail({ data: { jobId: jobId! } }),
    enabled: !!jobId,
  });

  if (!jobId) {
    return (
      <div className="surface-card sticky top-6 hidden h-[calc(100vh-8rem)] flex-col items-center justify-center gap-2 p-8 text-center lg:flex">
        <Sparkles className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Select a role to preview it here.</p>
      </div>
    );
  }

  const j = data?.job;
  const match = data?.match;
  const missing = ((match?.missing_skills as MissingSkill[] | null) ?? []) as MissingSkill[];

  return (
    <div className="surface-card sticky top-6 hidden max-h-[calc(100vh-6rem)] flex-col overflow-y-auto lg:flex">
      <AnimatePresence mode="wait">
        <motion.div
          key={jobId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="flex flex-1 flex-col"
        >
          {isLoading || !j ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-6 w-2/3 rounded" />
              <Skeleton className="h-4 w-1/3 rounded" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-border p-5">
                <div className="min-w-0">
                  <motion.p layoutId={`job-company-${jobId}`} className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    <Building2 className="h-3 w-3" /> {j.company?.name ?? "—"}
                  </motion.p>
                  <motion.h2 layoutId={`job-title-${jobId}`} className="mt-1 truncate font-display text-xl font-semibold">
                    {j.title}
                  </motion.h2>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {j.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {j.location}
                      </span>
                    )}
                    {j.remote_status !== "unknown" && <span>{j.remote_status}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close preview"
                  className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-5 p-5">
                {match && (
                  <div className="flex items-center gap-4">
                    <MatchRing
                      value={Number(match.overall_score ?? 0)}
                      size={64}
                      strokeWidth={6}
                      breakdown={match as unknown as Record<string, unknown>}
                      explanation={match.explanation as string | null}
                    />
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Overall match · click ring for breakdown
                      </p>
                      {match.explanation && (
                        <p className="mt-1 line-clamp-3 text-[12px] text-foreground/80">{match.explanation as string}</p>
                      )}
                    </div>
                  </div>
                )}

                {missing.length > 0 && (
                  <div>
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Missing skills
                    </p>
                    <MissingSkills skills={missing} />
                  </div>
                )}

                <div className="prose prose-invert line-clamp-6 max-w-none text-[13px] text-foreground/80" dangerouslySetInnerHTML={{ __html: j.description ?? "" }} />
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border p-4">
                <Button variant="ghost" size="sm" onClick={() => onSave?.(jobId)}>
                  <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
                  {saved ? "Saved" : "Save"}
                </Button>
                <ApplyWithAiButton
                  jobId={jobId}
                  unavailableReason={isValidExternalUrl(j.application_url) ? null : "This role has no direct application URL, so the AI agent can't complete it end-to-end."}
                />
                <Button variant="ghost" size="sm" onClick={() => openExternal(j.application_url)} disabled={!isValidExternalUrl(j.application_url)}>
                  <ExternalLink className="h-4 w-4" /> Manual
                </Button>
                <Link
                  to="/jobs/$jobId"
                  params={{ jobId }}
                  className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Open full page
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
