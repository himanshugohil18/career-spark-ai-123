import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, Sparkles, Building2, Target, Gauge, ListChecks, Brain,
  FileText, MessageSquare, Bell, Wand2, ExternalLink, Trash2, PlusCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ai/skeleton";
import { AIThinking } from "@/components/ai/ai-thinking";
import { MatchRing } from "@/features/jobs/match-ring";
import {
  addWorkspaceNote,
  deleteWorkspaceNote,
  getWorkspace,
  refreshWorkspaceAnalysis,
} from "@/lib/workspace.functions";
import { AssistantPanel } from "@/features/applications/assistant-panel";
import { openExternal } from "@/lib/open-external";

export const Route = createFileRoute("/_authenticated/applications/$workspaceId")({
  head: () => ({ meta: [{ title: "Application Workspace · CareerOS" }] }),
  component: WorkspacePage,
});

const STAGES: Array<{ key: string; label: string }> = [
  { key: "workspace_created", label: "Workspace Created" },
  { key: "company_analysis", label: "Company Analysis" },
  { key: "job_analysis", label: "Job Analysis" },
  { key: "resume_analysis", label: "Resume Analysis" },
  { key: "ats_analysis", label: "ATS Analysis" },
  { key: "gap_analysis", label: "Gap Analysis" },
  { key: "resume_optimization", label: "Resume Optimization" },
  { key: "ready_for_cover_letter", label: "Ready for Cover Letter" },
  { key: "ready_for_interview", label: "Ready for Interview" },
  { key: "application_ready", label: "Application Ready" },
];

const AI_STEPS = [
  "🏢  Analyzing company…",
  "📄  Reading job description…",
  "🧠  Comparing Career Brain…",
  "📊  Calculating ATS compatibility…",
  "🎯  Evaluating skill gaps…",
  "⚡  Generating recommendations…",
];

function WorkspacePage() {
  const { workspaceId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => getWorkspace({ data: { workspaceId } }),
  });

  const refresh = useMutation({
    mutationFn: (force: boolean) => refreshWorkspaceAnalysis({ data: { workspaceId, force } }),
    onSuccess: (r) => {
      if (r.skipped) toast.info("Analysis is already up to date.");
      else toast.success("Analysis updated.");
      void queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Analysis failed"),
  });

  // Auto-run once if never analyzed
  useEffect(() => {
    if (!data) return;
    if (!data.analysis && !refresh.isPending) {
      refresh.mutate(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.workspace?.id]);

  if (isLoading || !data) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 p-6 md:p-10">
        <Skeleton className="h-8 w-40 rounded" />
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const { workspace, job, company, match, analysis, ats, gap, readiness, companyIntel, notes, timeline } = data;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-6 md:p-10">
      <Link to="/applications" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All applications
      </Link>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="surface-elevated flex flex-col gap-4 rounded-2xl p-6 md:flex-row md:items-start md:justify-between"
      >
        <div className="flex min-w-0 items-start gap-4">
          <div className="grid h-14 w-14 flex-none place-items-center overflow-hidden rounded-xl border border-border bg-elevated">
            {company?.logo_url ? (
              <img src={company.logo_url} alt={company?.name ?? ""} className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Application Workspace · {company?.name ?? job?.company?.name ?? "Company"}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold md:text-3xl">{job?.title}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {job?.location && <span>{job.location}</span>}
              {job?.remote_status && job.remote_status !== "unknown" && (
                <span className="rounded-full border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest">
                  {job.remote_status}
                </span>
              )}
              {job?.employment_type && job.employment_type !== "unknown" && (
                <span>{String(job.employment_type).replace("_", " ")}</span>
              )}
              {job?.salary_max && (
                <span className="text-foreground/80">
                  {job.salary_currency ?? "USD"} {Math.round((job.salary_min ?? job.salary_max) / 1000)}k–
                  {Math.round(job.salary_max / 1000)}k
                </span>
              )}
              {job?.posted_at && <span>Posted {new Date(job.posted_at).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {match && (
            <div className="flex flex-col items-center">
              <MatchRing value={Number(match.overall_score ?? 0)} size={64} strokeWidth={6} />
              <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Match</span>
            </div>
          )}
          <div className="flex flex-col items-center">
            <MatchRing value={Number(workspace.readiness_score ?? readiness?.overall_score ?? 0)} size={64} strokeWidth={6} />
            <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Readiness</span>
          </div>
          <Button variant="primary" size="sm" onClick={() => refresh.mutate(true)} disabled={refresh.isPending}>
            <Wand2 className="h-4 w-4" /> {refresh.isPending ? "Analyzing…" : "Refresh analysis"}
          </Button>
          {job?.application_url && (
            <Button variant="ghost" size="sm" onClick={() => openExternal(job.application_url)}>
              Apply <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.header>

      {/* Progress */}
      <ProgressStrip currentStage={workspace.current_stage} percent={workspace.progress_percent} />

      {refresh.isPending && (
        <div className="surface-card p-4">
          <AIThinking size="md" steps={AI_STEPS} />
        </div>
      )}

      {!analysis && !refresh.isPending && (
        <div className="surface-card p-8 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-primary" />
          <h3 className="mt-3 font-display text-lg font-semibold">Preparing your workspace</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            AI is starting to analyze this opportunity. Give it a moment.
          </p>
        </div>
      )}

      {analysis && (
        <>
          <div className="grid gap-5 md:grid-cols-2">
            <ReadinessCard readiness={readiness} />
            <AtsCard ats={ats} />
          </div>
          <ResumeAnalysisCard analysis={analysis.resume_analysis} />
          <JobIntelCard intel={analysis.job_intelligence} />
          <GapCard gap={gap} />
          <CompanyIntelCard company={company} intel={companyIntel} />
          <RecommendationsCard readiness={readiness} />
        </>
      )}

      {/* AI Application Assistant */}
      <AssistantPanel workspaceId={workspaceId} analysisReady={!!analysis && !!ats} />


      {/* Notes */}
      <NotesSection workspaceId={workspaceId} notes={notes} />

      {/* Timeline */}
      <TimelineSection timeline={timeline} />
    </div>
  );
}

function ProgressStrip({ currentStage, percent }: { currentStage: string; percent: number }) {
  const currentIdx = Math.max(0, STAGES.findIndex((s) => s.key === currentStage));
  return (
    <section className="surface-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Application progress
          </p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">{percent}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
        <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        {STAGES.map((s, i) => {
          const status =
            i < currentIdx ? "completed" : i === currentIdx ? "in_progress" : "pending";
          return (
            <div
              key={s.key}
              className={
                "rounded-lg border p-2.5 text-xs " +
                (status === "completed"
                  ? "border-success/40 bg-success/5 text-success"
                  : status === "in_progress"
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-border bg-background text-muted-foreground")
              }
            >
              <p className="font-mono text-[9px] uppercase tracking-widest opacity-80">
                {status === "completed" ? "Done" : status === "in_progress" ? "Now" : "Next"}
              </p>
              <p className="mt-0.5 font-medium">{s.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReadinessCard({ readiness }: { readiness: any }) {
  const overall = readiness?.overall_score ?? 0;
  const sub = readiness
    ? [
        ["Resume Quality", readiness.resume_quality],
        ["ATS Compatibility", readiness.ats_compatibility],
        ["Skill Match", readiness.skill_match],
        ["Technology Match", readiness.technology_match],
        ["Project Match", readiness.project_match],
        ["Experience Match", readiness.experience_match],
        ["Brain Alignment", readiness.brain_alignment],
        ["Company Alignment", readiness.company_alignment],
      ]
    : [];
  return (
    <section className="surface-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Gauge className="h-4 w-4 text-primary" />
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Application Readiness</p>
      </div>
      <div className="flex items-center gap-4">
        <MatchRing value={Number(overall)} size={80} strokeWidth={7} />
        <div>
          <p className="font-display text-2xl font-semibold">{overall}/100</p>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {readiness?.competitiveness ?? "—"}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {sub.map(([label, v]) => (
          <div key={label as string} className="rounded-lg border border-border bg-elevated p-2.5">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label as string}</p>
            <p className="mt-0.5 font-display text-sm font-semibold">{v ?? "—"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AtsCard({ ats }: { ats: any }) {
  return (
    <section className="surface-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">ATS Analysis</p>
      </div>
      <div className="flex items-center gap-4">
        <MatchRing value={Number(ats?.overall_score ?? 0)} size={80} strokeWidth={7} />
        <div className="text-xs text-muted-foreground">
          <p>Keyword coverage: <span className="text-foreground/90">{ats?.keyword_coverage ?? 0}%</span></p>
          <p>Required skills: <span className="text-foreground/90">{ats?.required_skills_coverage ?? 0}%</span></p>
          <p>Technology: <span className="text-foreground/90">{ats?.technology_coverage ?? 0}%</span></p>
          <p>Formatting: <span className="text-foreground/90">{ats?.formatting_score ?? 0}%</span></p>
        </div>
      </div>
      {ats?.missing_keywords?.length ? (
        <div className="mt-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-warning">Missing keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {(ats.missing_keywords as string[]).slice(0, 20).map((k) => (
              <span key={k} className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] text-warning">{k}</span>
            ))}
          </div>
        </div>
      ) : null}
      {ats?.suggestions?.length ? (
        <div className="mt-4 space-y-2">
          {(ats.suggestions as Array<{ title: string; detail: string }>).slice(0, 4).map((s, i) => (
            <div key={i} className="rounded-lg border border-border bg-background p-3">
              <p className="text-sm font-medium">{s.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ResumeAnalysisCard({ analysis }: { analysis: any }) {
  if (!analysis) return null;
  const scores = [
    ["Skills", analysis.skills_match],
    ["Experience", analysis.experience_match],
    ["Projects", analysis.projects_match],
    ["Technology", analysis.technology_match],
    ["Education", analysis.education_match],
    ["Certifications", analysis.certification_match],
  ];
  return (
    <section className="surface-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Brain className="h-4 w-4 text-primary" />
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Resume vs Career Brain vs Job</p>
      </div>
      <div className="grid gap-2 md:grid-cols-6">
        {scores.map(([label, v]) => (
          <div key={label as string} className="rounded-lg border border-border bg-elevated p-3">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label as string}</p>
            <p className="mt-0.5 font-display text-lg font-semibold">{v ?? 0}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <BulletList tone="success" label="Strengths" items={analysis.strengths ?? []} />
        <BulletList tone="warning" label="Weaknesses" items={analysis.weaknesses ?? []} />
        <BulletList tone="warning" label="Missing Requirements" items={analysis.missing_requirements ?? []} />
        <BulletList tone="warning" label="Missing Technologies" items={analysis.missing_technologies ?? []} />
        <BulletList tone="muted" label="Transferable Skills" items={analysis.transferable_skills ?? []} />
      </div>
    </section>
  );
}

function JobIntelCard({ intel }: { intel: any }) {
  if (!intel) return null;
  return (
    <section className="surface-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Job Description Intelligence</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <BulletList label="Required Skills" items={intel.required_skills ?? []} />
        <BulletList label="Preferred Skills" items={intel.preferred_skills ?? []} />
        <BulletList label="Required Technologies" items={intel.required_technologies ?? []} />
        <BulletList label="Responsibilities" items={intel.responsibilities ?? []} />
        <BulletList label="Qualifications" items={intel.qualifications ?? []} />
        <BulletList label="Experience Requirements" items={intel.experience_requirements ?? []} />
        <BulletList label="Soft Skills" items={intel.soft_skills ?? []} />
        <BulletList label="Education" items={intel.education ?? []} />
        <BulletList label="Certifications" items={intel.certifications ?? []} />
        <BulletList label="Keywords" items={intel.keywords ?? []} />
        <BulletList label="Hiring Signals" items={intel.hiring_signals ?? []} />
      </div>
    </section>
  );
}

function GapCard({ gap }: { gap: any }) {
  if (!gap) return null;
  const impactBadge = (imp: string) =>
    imp === "high"
      ? "border-danger/40 bg-danger/10 text-danger"
      : imp === "medium"
      ? "border-warning/40 bg-warning/10 text-warning"
      : "border-border bg-elevated text-muted-foreground";
  return (
    <section className="surface-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Skill Gap Analysis</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-success">Mastered</p>
          <div className="flex flex-wrap gap-1.5">
            {(gap.mastered_skills ?? []).map((s: any, i: number) => (
              <span key={i} className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] text-success">{s.skill}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-warning">Partial</p>
          <div className="flex flex-wrap gap-1.5">
            {(gap.partial_skills ?? []).map((s: any, i: number) => (
              <span key={i} className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] text-warning">{s.skill}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-danger">Missing</p>
          <div className="flex flex-wrap gap-1.5">
            {(gap.missing_skills ?? []).map((s: any, i: number) => (
              <span key={i} className={"rounded-full border px-2 py-0.5 text-[11px] " + impactBadge(s.impact ?? "medium")}>
                {s.skill}{s.impact ? ` · ${s.impact}` : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      {(gap.recommended_next ?? []).length > 0 && (
        <div className="mt-5">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">Recommended next</p>
          <ul className="space-y-1 text-sm">
            {(gap.recommended_next as Array<{ skill: string; reason?: string }>).slice(0, 6).map((r, i) => (
              <li key={i} className="text-foreground/90">· <span className="font-medium">{r.skill}</span>{r.reason ? ` — ${r.reason}` : ""}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function CompanyIntelCard({ company, intel }: { company: any; intel: any }) {
  if (!company && !intel) return null;
  const data = intel ?? {};
  return (
    <section className="surface-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Company Intelligence</p>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          {data.overview && <p className="text-sm text-foreground/90">{data.overview}</p>}
          <div className="grid gap-2 md:grid-cols-2">
            <Meta label="Industry" value={data.industry ?? company?.industry} />
            <Meta label="Size" value={data.size ?? company?.size} />
            <Meta label="Remote policy" value={data.remote_policy ?? company?.remote_policy} />
            <Meta label="Funding" value={data.funding_stage} />
            <Meta label="HQ" value={data.headquarters} />
            <Meta label="Hiring style" value={data.hiring_style} />
            <Meta label="Website" value={data.website ?? company?.website} />
          </div>
          {(data.tech_stack ?? []).length > 0 && (
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Tech stack</p>
              <div className="flex flex-wrap gap-1.5">
                {(data.tech_stack as string[]).map((t) => (
                  <span key={t} className="rounded-full border border-border bg-elevated px-2 py-0.5 text-[11px] text-foreground/80">{t}</span>
                ))}
              </div>
            </div>
          )}
          {(data.values ?? []).length > 0 && (
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Values</p>
              <div className="flex flex-wrap gap-1.5">
                {(data.values as string[]).map((v) => (
                  <span key={v} className="rounded-full border border-border bg-elevated px-2 py-0.5 text-[11px] text-foreground/80">{v}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function RecommendationsCard({ readiness }: { readiness: any }) {
  const recs: Array<{ title: string; detail: string }> = readiness?.recommendations ?? [];
  const improvements: string[] = readiness?.top_improvements ?? [];
  if (!recs.length && !improvements.length) return null;
  return (
    <section className="surface-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">AI Recommendations</p>
      </div>
      {improvements.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">Top improvements</p>
          <ul className="space-y-1 text-sm text-foreground/90">
            {improvements.map((s, i) => (<li key={i}>· {s}</li>))}
          </ul>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {recs.map((r, i) => (
          <div key={i} className="rounded-xl border border-primary/25 bg-primary/5 p-4">
            <p className="font-display text-sm font-semibold">{r.title}</p>
            <p className="mt-1 text-xs text-foreground/80">{r.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function NotesSection({ workspaceId, notes }: { workspaceId: string; notes: any[] }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"general" | "interview" | "recruiter" | "link" | "salary" | "reminder">("general");
  const add = useMutation({
    mutationFn: () =>
      addWorkspaceNote({ data: { workspaceId, kind, title: title.trim() || undefined, body: body.trim() || undefined } }),
    onSuccess: () => {
      setTitle(""); setBody("");
      toast.success("Note saved.");
      void queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteWorkspaceNote({ data: { noteId: id } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] }),
  });

  return (
    <section className="surface-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Application Notes</p>
      </div>
      <div className="grid gap-2 md:grid-cols-[140px_1fr_1fr_auto]">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        >
          <option value="general">General</option>
          <option value="interview">Interview</option>
          <option value="recruiter">Recruiter</option>
          <option value="link">Link</option>
          <option value="salary">Salary</option>
          <option value="reminder">Reminder</option>
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Note"
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
        <Button variant="primary" size="sm" onClick={() => add.mutate()} disabled={add.isPending || (!title.trim() && !body.trim())}>
          <PlusCircle className="h-4 w-4" /> Add
        </Button>
      </div>
      <div className="mt-4 space-y-2">
        {notes.length === 0 && (
          <p className="text-sm text-muted-foreground">Recruiter chats, interview prep, salary targets — anything you want to remember about this application lives here.</p>
        )}
        {notes.map((n) => (
          <div key={n.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-elevated p-3">
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{n.kind}</p>
              {n.title && <p className="mt-0.5 text-sm font-semibold">{n.title}</p>}
              {n.body && <p className="mt-0.5 text-sm text-foreground/90 whitespace-pre-wrap">{n.body}</p>}
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => del.mutate(n.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function TimelineSection({ timeline }: { timeline: any[] }) {
  return (
    <section className="surface-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Application Timeline</p>
      </div>
      <ol className="space-y-2">
        {timeline.length === 0 && <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>}
        {timeline.map((t) => (
          <li key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-elevated p-3">
            <div>
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {new Date(t.created_at).toLocaleString()}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function BulletList({ label, items, tone = "default" }: { label: string; items: string[]; tone?: "success" | "warning" | "muted" | "default" }) {
  if (!items?.length) return null;
  const color =
    tone === "success" ? "text-success" :
    tone === "warning" ? "text-warning" :
    tone === "muted" ? "text-muted-foreground" : "text-primary";
  return (
    <div>
      <p className={`mb-1 font-mono text-[10px] uppercase tracking-widest ${color}`}>{label}</p>
      <ul className="space-y-0.5">
        {items.slice(0, 12).map((s, i) => (
          <li key={i} className="text-sm text-foreground/90">· {s}</li>
        ))}
      </ul>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg border border-border bg-elevated p-2.5">
      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value ?? "—"}</p>
    </div>
  );
}
