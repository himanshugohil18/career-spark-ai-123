import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Bookmark, Building2, ExternalLink, Sparkles, Target, Wand2, Mail, MessagesSquare, Command } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ai/skeleton";
import { MatchRing } from "@/features/jobs/match-ring";
import { MatchBreakdown } from "@/features/jobs/match-breakdown";
import { MissingSkills, type MissingSkill } from "@/features/jobs/missing-skills";
import { CompanyHeader } from "@/features/jobs/company-header";
import { getJobDetail, getSimilarJobs, saveJob, trackJobInteraction, unsaveJob } from "@/lib/jobs.functions";
import { matchJob } from "@/lib/job-matching.functions";
import { openWorkspace } from "@/lib/workspace.functions";
import { ApplyWithAiButton } from "@/features/auto-apply/apply-with-ai-button";
import { openExternal, isValidExternalUrl } from "@/lib/open-external";

export const Route = createFileRoute("/_authenticated/jobs/$jobId")({
  head: () => ({ meta: [{ title: "Job · CareerOS" }] }),
  component: JobDetail,
});

function useJobDetailHead(job: { title?: string | null; company?: { name?: string | null } | null } | null | undefined) {
  useEffect(() => {
    if (!job?.title) return;
    const prev = document.title;
    document.title = `${job.title}${job.company?.name ? ` · ${job.company.name}` : ""} · CareerOS`;
    return () => { document.title = prev; };
  }, [job?.title, job?.company?.name]);
}

function JobDetail() {
  const { jobId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const startApplication = useMutation({
    mutationFn: () => openWorkspace({ data: { jobId } }),
    onSuccess: (r) => {
      toast.success(r.created ? "Application workspace ready." : "Reopening workspace.");
      void navigate({ to: "/applications/$workspaceId", params: { workspaceId: r.workspaceId } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not open workspace"),
  });


  const { data, isLoading } = useQuery({
    queryKey: ["job-detail", jobId],
    queryFn: () => getJobDetail({ data: { jobId } }),
  });

  const similar = useQuery({
    queryKey: ["job-similar", jobId],
    queryFn: () => getSimilarJobs({ data: { jobId, limit: 6 } }),
    staleTime: 60_000,
  });

  useEffect(() => {
    void trackJobInteraction({ data: { jobId, kind: "viewed" } }).catch(() => {});
  }, [jobId]);

  const rematch = useMutation({
    mutationFn: () => matchJob({ data: { jobId } }),
    onSuccess: () => {
      toast.success("Match refreshed.");
      void queryClient.invalidateQueries({ queryKey: ["job-detail", jobId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const save = useMutation({
    mutationFn: () =>
      data?.saved
        ? unsaveJob({ data: { jobId } })
        : saveJob({ data: { jobId, status: "saved" } }),
    onSuccess: () => {
      const wasSaved = !!data?.saved;
      void trackJobInteraction({ data: { jobId, kind: wasSaved ? "ignored" : "saved" } }).catch(() => {});
      toast.success(wasSaved ? "Removed from saved." : "Saved.");
      void queryClient.invalidateQueries({ queryKey: ["job-detail", jobId] });
      void queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["jobs-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["job-sections"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });

  useJobDetailHead(data?.job);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 p-6 md:p-10">
        <Skeleton className="h-8 w-40 rounded" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }
  if (!data?.job) {
    return (
      <div className="mx-auto max-w-4xl p-10 text-center text-muted-foreground">
        Job not found.
      </div>
    );
  }

  const j = data.job;
  const match = data.match;
  const missing = ((match?.missing_skills as MissingSkill[] | null) ?? []) as MissingSkill[];

  // Derive plain-language insights from real data.
  const required: string[] = j.required_skills ?? [];
  const missingNames = new Set(missing.map((m) => String(m.skill).toLowerCase()));
  const metCount = required.filter((r) => !missingNames.has(r.toLowerCase())).length;
  const insights: string[] = [];
  if (required.length > 0 && match) insights.push(`You already meet ${metCount} of ${required.length} requirements.`);
  const overall = Number(match?.overall_score ?? 0);
  if (overall >= 85) insights.push(`Overall match is ${overall}% — this is one of your strongest opportunities.`);
  const topHigh = missing.find((m) => m.priority === "high");
  if (topHigh) insights.push(`Learning ${topHigh.skill} would significantly improve your chances.`);
  const strength = ((match?.strengths as string[] | null) ?? [])[0];
  if (strength) insights.push(strength);

  // Stale match: computed more than 7 days ago.
  const computedAt = (match as { computed_at?: string } | null | undefined)?.computed_at;
  const staleMatch = !!match && !!computedAt && Date.now() - new Date(computedAt).getTime() > 7 * 86_400_000;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-10">
      <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to feed
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="surface-elevated flex flex-col gap-4 rounded-2xl p-6 md:flex-row md:items-start md:justify-between"
      >
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {j.provider} · {j.company?.name ?? "Company"}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold md:text-3xl">{j.title}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {j.location && <span>{j.location}</span>}
            {j.remote_status !== "unknown" && (
              <span className="rounded-full border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest">
                {j.remote_status}
              </span>
            )}
            {j.employment_type !== "unknown" && <span>{String(j.employment_type).replace("_", " ")}</span>}
            {j.experience_level !== "unknown" && <span>{j.experience_level}</span>}
            {j.salary_max && (
              <span className="text-foreground/80">
                {j.salary_currency ?? "USD"} {Math.round((j.salary_min ?? j.salary_max) / 1000)}k–{Math.round(j.salary_max / 1000)}k
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            <Bookmark className={data.saved ? "h-4 w-4 fill-current" : "h-4 w-4"} />
            {data.saved ? "Saved" : "Save"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => startApplication.mutate()}
            disabled={startApplication.isPending}
          >
            <Command className="h-4 w-4" />
            {startApplication.isPending ? "Preparing…" : "Prepare Application"}
          </Button>
          <ApplyWithAiButton
            jobId={jobId}
            unavailableReason={isValidExternalUrl(j.application_url) ? null : "This role has no direct application URL, so the AI agent can't complete it end-to-end."}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openExternal(j.application_url)}
            disabled={!isValidExternalUrl(j.application_url)}
            title={isValidExternalUrl(j.application_url) ? "Open original posting in a new tab" : "Application link unavailable"}
          >
            {isValidExternalUrl(j.application_url) ? "Apply manually" : "Application link unavailable"} <ExternalLink className="h-4 w-4" />
          </Button>

        </div>
      </motion.header>


      {/* AI Match Panel */}
      <section className="surface-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">AI Match</p>
            <h3 className="mt-1 font-display text-lg font-semibold">Why this job matches</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => rematch.mutate()} disabled={rematch.isPending}>
            <Sparkles className="h-4 w-4" /> {rematch.isPending ? "Analyzing…" : "Refresh"}
          </Button>
        </div>

        {staleMatch && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
            <span>This score is more than a week old — your Career Brain may have evolved since.</span>
            <Button variant="ghost" size="sm" onClick={() => rematch.mutate()} disabled={rematch.isPending}>
              Refresh now
            </Button>
          </div>
        )}



        {match ? (
          <div className="grid gap-6 md:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center gap-3">
              <MatchRing value={Number(match.overall_score ?? 0)} size={96} strokeWidth={7} />
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Overall match</p>
            </div>
            <div className="space-y-4">
              {match.explanation && (
                <p className="text-[14px] leading-relaxed text-foreground/90">{match.explanation as string}</p>
              )}

              {insights.length > 0 && (
                <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                  <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-primary">
                    <Target className="h-3 w-3" /> Job insights
                  </p>
                  <ul className="space-y-1.5">
                    {insights.map((i) => (
                      <li key={i} className="text-[13px] text-foreground/90">· {i}</li>
                    ))}
                  </ul>
                </div>
              )}

              <MatchBreakdown match={match as Record<string, unknown>} />
              {((match.strengths as string[] | null) ?? []).length > 0 && (
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-success">Strengths</p>
                  <ul className="space-y-1 text-sm text-foreground/90">
                    {(match.strengths as string[]).map((s) => (<li key={s}>· {s}</li>))}
                  </ul>
                </div>
              )}
              {((match.weaknesses as string[] | null) ?? []).length > 0 && (
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-warning">Where to grow</p>
                  <ul className="space-y-1 text-sm text-foreground/90">
                    {(match.weaknesses as string[]).map((s) => (<li key={s}>· {s}</li>))}
                  </ul>
                </div>
              )}
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Missing skills</p>
                <MissingSkills skills={missing} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">This role hasn't been scored yet.</p>
            <Button variant="primary" size="sm" onClick={() => rematch.mutate()} disabled={rematch.isPending}>
              Run AI match
            </Button>
          </div>
        )}
      </section>

      <CompanyHeader
        company={
          j.company
            ? {
                ...j.company,
                tech_stack: Array.isArray(j.company.tech_stack)
                  ? (j.company.tech_stack as string[])
                  : null,
              }
            : null
        }
        otherRolesCount={data.otherRoles?.length ?? 0}
      />

      {/* Job overview — the quick facts recruiters put at the top of a JD */}
      <section className="surface-card p-6">
        <h3 className="mb-4 font-display text-lg font-semibold">Job overview</h3>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="Company" value={j.company?.name ?? "—"} />
          <Fact label="Location" value={j.location ?? "—"} />
          <Fact label="Work mode" value={j.remote_status !== "unknown" ? String(j.remote_status) : "—"} />
          <Fact label="Employment type" value={j.employment_type !== "unknown" ? String(j.employment_type).replace(/_/g, " ") : "—"} />
          <Fact label="Experience level" value={j.experience_level !== "unknown" ? String(j.experience_level) : "—"} />
          <Fact
            label="Salary"
            value={
              j.salary_min || j.salary_max
                ? `${j.salary_currency ?? "USD"} ${Math.round((j.salary_min ?? j.salary_max!) / 1000)}k${j.salary_max && j.salary_min ? `–${Math.round(j.salary_max / 1000)}k` : ""}`
                : "Not disclosed"
            }
          />
          <Fact label="Posted" value={j.posted_at ? new Date(j.posted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"} />
          <Fact label="Source" value={String(j.provider)} />
          <Fact label="Industry" value={j.company?.industry ?? "—"} />
        </dl>
      </section>

      <section className="surface-card p-6">
        <h3 className="mb-3 font-display text-lg font-semibold">Job description</h3>
        <JobDescription html={j.description ?? ""} />
      </section>

      {(j.responsibilities ?? []).length > 0 && (
        <section className="surface-card p-6">
          <h3 className="mb-3 font-display text-lg font-semibold">Responsibilities</h3>
          <ul className="space-y-1.5 text-sm text-foreground/90">
            {j.responsibilities!.map((r: string, i: number) => (<li key={i}>· {r}</li>))}
          </ul>
        </section>
      )}

      {(j.requirements ?? []).length > 0 && (
        <section className="surface-card p-6">
          <h3 className="mb-3 font-display text-lg font-semibold">Requirements</h3>
          <ul className="space-y-1.5 text-sm text-foreground/90">
            {j.requirements!.map((r: string, i: number) => (<li key={i}>· {r}</li>))}
          </ul>
        </section>
      )}

      {((j.required_skills ?? []).length > 0 || (j.preferred_skills ?? []).length > 0) && (
        <section className="surface-card p-6">
          <h3 className="mb-3 font-display text-lg font-semibold">Skills & technologies</h3>
          {(j.required_skills ?? []).length > 0 && (
            <div className="mb-4">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Required</p>
              <SkillChips skills={j.required_skills!} tone="primary" />
            </div>
          )}
          {(j.preferred_skills ?? []).length > 0 && (
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Good to have</p>
              <SkillChips skills={j.preferred_skills!} tone="muted" />
            </div>
          )}
        </section>
      )}

      {(j.benefits ?? []).length > 0 && (
        <section className="surface-card p-6">
          <h3 className="mb-3 font-display text-lg font-semibold">Benefits & perks</h3>
          <ul className="grid gap-1.5 text-sm text-foreground/90 sm:grid-cols-2">
            {j.benefits!.map((b: string, i: number) => (<li key={i}>· {b}</li>))}
          </ul>
        </section>
      )}

      <section className="surface-card p-6">
        <h3 className="mb-2 font-display text-lg font-semibold">How to apply</h3>
        <p className="text-sm text-muted-foreground">
          Apply on {j.company?.name ?? "the company site"} via {String(j.provider)}, or let the AI agent tailor your
          resume and complete the form for you.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ApplyWithAiButton
            jobId={jobId}
            unavailableReason={isValidExternalUrl(j.application_url) ? null : "This role has no direct application URL, so the AI agent can't complete it end-to-end."}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openExternal(j.application_url)}
            disabled={!isValidExternalUrl(j.application_url)}
          >
            Open original posting <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {(data.otherRoles?.length ?? 0) > 0 && (
        <section className="surface-card p-6">
          <h3 className="mb-3 font-display text-lg font-semibold">Other open roles at {j.company?.name}</h3>
          <ul className="space-y-2">
            {data.otherRoles!.map((r) => (
              <li key={r.id}>
                <Link to="/jobs/$jobId" params={{ jobId: r.id }} className="text-sm text-foreground/90 hover:text-primary">
                  {r.title} <span className="text-muted-foreground">· {r.location ?? "—"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(similar.data?.length ?? 0) > 0 && (
        <section className="surface-card p-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Similar roles</p>
          <h3 className="mt-1 mb-4 font-display text-lg font-semibold">Roles like this across every provider</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {similar.data!.map((r) => (
              <Link
                key={r.id as string}
                to="/jobs/$jobId"
                params={{ jobId: r.id as string }}
                className="group flex items-start gap-3 rounded-lg border border-border bg-elevated/50 p-3 transition-colors hover:border-primary/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background">
                  {r.company?.logo_url ? (
                    <img src={r.company.logo_url} alt={r.company.name ?? ""} className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold group-hover:text-primary">{r.title as string}</p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                    {r.company?.name ?? "—"} · {(r.location as string) ?? "—"}{r.remote_status ? ` · ${r.remote_status}` : ""}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    {r.match != null && <span className="font-mono text-primary">{Math.round(Number(r.match))}% match</span>}
                    {r.overlap > 0 && <span>{r.overlap} shared skills</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}



      <section className="surface-card p-6">
        <h3 className="mb-3 font-display text-lg font-semibold">Phase 4 tools</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <PhaseCard icon={Wand2} label="Optimize resume for this role" />
          <PhaseCard icon={Mail} label="Draft a cover letter" />
          <PhaseCard icon={MessagesSquare} label="Practice interview questions" />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Every Phase 4 module will receive your Career Brain + this selected job as input — no re-querying.
        </p>
      </section>
    </div>
  );
}

function PhaseCard({ icon: Icon, label }: { icon: typeof Wand2; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-elevated/50 p-4 opacity-70">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm text-foreground/80">{label}</span>
      <span className="ml-auto rounded-full border border-border bg-elevated px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Soon
      </span>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm capitalize text-foreground/90">{value}</dd>
    </div>
  );
}

function SkillChips({ skills, tone }: { skills: string[]; tone: "primary" | "muted" }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((s) => (
        <span
          key={s}
          className={
            tone === "primary"
              ? "rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[12px] text-primary"
              : "rounded-full border border-border bg-elevated px-2.5 py-0.5 text-[12px] text-muted-foreground"
          }
        >
          {s}
        </span>
      ))}
    </div>
  );
}

/**
 * Providers hand us either HTML or plain text. Plain text keeps its line
 * breaks so a full JD stays readable instead of collapsing into one blob.
 */
function JobDescription({ html }: { html: string }) {
  const trimmed = html.trim();
  if (!trimmed) {
    return <p className="text-sm text-muted-foreground">This provider didn't publish a full description. Open the original posting for the complete JD.</p>;
  }
  const looksHtml = /<\/?(p|div|ul|ol|li|br|h[1-6]|strong|em|b|i|a)\b/i.test(trimmed);
  if (looksHtml) {
    return (
      <div
        className="prose prose-invert max-w-none text-sm leading-relaxed text-foreground/90 [&_a]:text-primary [&_li]:my-1 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }
  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{trimmed}</p>;
}
