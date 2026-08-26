import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Brain,
  Briefcase,
  Clock,
  FileText,
  GraduationCap,
  Mic,
  Radar,
  Sparkles,
  Target,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Route as AuthRoute } from "./route";
import { AgentGrid, deriveAgents } from "@/components/ai/agent-status";
import { Skeleton } from "@/components/ai/skeleton";
import { ResumeUpload } from "@/features/resume/resume-upload";
import { DevDebugPanel } from "@/features/debug/dev-debug-panel";
import { DashboardWidgets } from "@/features/jobs/dashboard-widgets";
import { ApplicationsSummary } from "@/features/applications/applications-summary";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { LiveDot } from "@/components/ui/live-dot";
import { getGreeting } from "@/lib/greeting";
import { getWorkspace } from "@/lib/profile.functions";
import { ensureInitialMatches } from "@/lib/jobs.functions";
import { getAgentActivity } from "@/lib/career-intel.functions";
import { computeCompleteness } from "@/lib/completeness";
import { Reveal } from "@/components/motion/reveal";
import { PageShell, SectionHeading } from "@/components/product/page-header";
import { EmptyState } from "@/components/product/empty-state";
import { ProgressRing, scoreTone } from "@/components/product/progress-ring";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Overview · CareerOS" }] }),
  component: Dashboard,
});

type Priority = {
  icon: typeof Zap;
  title: string;
  reason: string;
  eta: string;
  to: string;
  cta: string;
  tone: "brand" | "warning" | "success";
};

function Dashboard() {
  const { user } = AuthRoute.useRouteContext();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["workspace"],
    queryFn: () => getWorkspace(),
  });

  const profile = data?.profile;
  const displayName =
    profile?.full_name?.split(" ")[0] ||
    (user.user_metadata?.display_name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    (user.email?.split("@")[0] ?? "there");

  const hasResume = !!data?.resumes?.some((r) => r.status === "approved");
  const parsedResume = data?.resumes?.find((r) => r.status === "parsed");

  const { data: activity } = useQuery({
    queryKey: ["agent-activity"],
    queryFn: () => getAgentActivity(),
    enabled: hasResume,
    staleTime: 30_000,
  });

  const { primary, secondary } = getGreeting({
    displayName,
    hasResume,
    hasParsedPendingReview: !!parsedResume,
    matchCount: activity?.matchCount,
    highMatchCount: activity?.highMatchCount,
    applicationCount: activity?.workspaceCount,
  });

  useEffect(() => {
    if (!hasResume) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await ensureInitialMatches();
        if (!cancelled && r.ran) {
          void queryClient.invalidateQueries({ queryKey: ["workspace"] });
          void queryClient.invalidateQueries({ queryKey: ["job-sections"] });
          void queryClient.invalidateQueries({ queryKey: ["jobs-feed"] });
        }
      } catch {
        /* refresh manually from /jobs */
      }
    })();
    return () => { cancelled = true; };
  }, [hasResume, queryClient]);

  const activeResume = data?.resumes?.find((r) => r.is_active);
  const health = data?.careerHealth;
  const brain = data?.careerBrain as { version?: number | null; overall_confidence?: number | null; last_generated_at?: string | null } | null | undefined;
  const completeness = computeCompleteness({
    profile: profile as Parameters<typeof computeCompleteness>[0]["profile"],
    certificationsCount: data?.certifications?.length ?? 0,
    projectsCount: data?.projects?.length ?? 0,
  });

  const healthScore = Number(health?.score ?? 0);
  const matchStrength = activity?.matchCount
    ? Math.min(100, Math.round(((activity.highMatchCount ?? 0) / Math.max(1, activity.matchCount)) * 100 + 40))
    : 0;

  // Today's priorities — derived from real state, most urgent first
  const priorities: Priority[] = [];
  if (parsedResume && !hasResume) {
    priorities.push({
      icon: Brain, tone: "warning",
      title: "Approve your Career Brain",
      reason: `I parsed ${parsedResume.file_name} — review the extracted details to activate your workspace.`,
      eta: "3 min", to: `/resume-review/${parsedResume.id}`, cta: "Review now",
    });
  }
  if (hasResume && (activity?.highMatchCount ?? 0) > 0) {
    priorities.push({
      icon: Target, tone: "brand",
      title: `Apply to ${Math.min(3, activity!.highMatchCount)} high-match job${activity!.highMatchCount === 1 ? "" : "s"}`,
      reason: `${activity!.highMatchCount} roles currently score above your match threshold.`,
      eta: "10 min", to: "/jobs", cta: "View matches",
    });
  }
  if (hasResume && (activity?.readyWorkspaceCount ?? 0) > 0) {
    priorities.push({
      icon: Zap, tone: "success",
      title: `${activity!.readyWorkspaceCount} application${activity!.readyWorkspaceCount === 1 ? " is" : "s are"} ready to submit`,
      reason: "Your Application Agent finished preparing these — they only need your approval.",
      eta: "5 min", to: "/applications", cta: "Review & submit",
    });
  }
  if (hasResume && completeness.score < 80) {
    priorities.push({
      icon: TrendingUp, tone: "brand",
      title: "Raise profile completeness",
      reason: `Your profile is ${completeness.score}% complete — missing details weaken your match scores.`,
      eta: "8 min", to: "/profile", cta: "Complete profile",
    });
  }
  if (hasResume && (activity?.interviewSessionCount ?? 0) > 0) {
    priorities.push({
      icon: Mic, tone: "brand",
      title: "Practice an interview round",
      reason: `${activity!.interviewSessionCount} session${activity!.interviewSessionCount === 1 ? "" : "s"} available based on your target roles.`,
      eta: "15 min", to: "/interview", cta: "Start practice",
    });
  }
  const topPriorities = priorities.slice(0, 3);

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <PageShell width="wide" className="space-y-10">
      <ImmersiveCommandHeader
        displayName={displayName}
        healthScore={healthScore}
        priorities={topPriorities}
        matchCount={activity?.matchCount ?? 0}
        highMatchCount={activity?.highMatchCount ?? 0}
      />
      {/* ── Welcome ─────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease }}
        className="flex flex-col gap-6 border-b border-border pb-8 md:flex-row md:items-end md:justify-between"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="meta-text">{today}</p>
            <LiveDot label={hasResume ? "AGENTS LIVE" : "SETUP"} tone={hasResume ? "success" : "primary"} />
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-[2.5rem] md:leading-[1.15]">
            {primary}
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {secondary}
          </p>
          {profile?.current_title && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="stage-chip">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
                {profile.current_title}
              </span>
              {(profile as { location?: string | null }).location && (
                <span className="stage-chip">{(profile as { location?: string | null }).location}</span>
              )}
              {activeResume && (
                <span className="stage-chip">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Resume v{activeResume.version}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Career Health hero ring */}
        {hasResume && (
          <Link
            to="/analytics"
            className="group flex shrink-0 items-center gap-4 rounded-2xl border border-border bg-card p-4 pr-6 shadow-soft transition-all hover:shadow-card"
          >
            <ProgressRing value={healthScore} size={76} stroke={7} tone={scoreTone(healthScore)} sublabel="/ 100" />
            <div>
              <p className="section-label">Career Health</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {healthScore >= 75 ? "Excellent shape" : healthScore >= 50 ? "Solid, keep going" : "Needs attention"}
              </p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary">
                View analytics <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </p>
            </div>
          </Link>
        )}
      </motion.section>

      {/* ── Activation path (no approved resume yet) ─────────────── */}
      {isLoading ? (
        <Skeleton className="h-56 rounded-2xl" />
      ) : !hasResume ? (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05, ease }}
        >
          {parsedResume ? (
            <div className="surface-highlight flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center md:p-8">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Brain className="h-6 w-6" />
                </span>
                <div>
                  <p className="section-label text-primary">Action required</p>
                  <h3 className="mt-1 font-display text-xl font-semibold">Approve your Career Brain</h3>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    I parsed <span className="font-medium text-foreground">{parsedResume.file_name}</span>. Review the extracted details, then approve to activate matching, agents, and interview prep.
                  </p>
                </div>
              </div>
              <Button variant="primary" size="lg" asChild>
                <Link to="/resume-review/$resumeId" params={{ resumeId: parsedResume.id }}>
                  Review & approve <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <ResumeUpload
              onCompleted={() => {
                void queryClient.invalidateQueries({ queryKey: ["workspace"] });
              }}
            />
          )}
        </motion.section>
      ) : (
        <>
          {/* ── Today's priorities ──────────────────────────────── */}
          {topPriorities.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05, ease }}
            >
              <SectionHeading
                title="Today's priorities"
                description="The next best actions CareerOS recommends for you right now."
              />
              <div className="grid gap-4 lg:grid-cols-3">
                {topPriorities.map((p, i) => (
                  <motion.div
                    key={p.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.06 + i * 0.06, ease }}
                    className={cn(
                      "group flex flex-col rounded-2xl border p-5 transition-shadow hover:shadow-card",
                      i === 0 ? "surface-highlight" : "surface-card",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "grid h-9 w-9 place-items-center rounded-lg",
                        p.tone === "warning" ? "bg-warning/15 text-warning-foreground" : p.tone === "success" ? "bg-success/10 text-success" : "bg-primary/10 text-primary",
                      )}>
                        <p.icon className="h-4.5 w-4.5" />
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                        <Clock className="h-3 w-3" /> {p.eta}
                      </span>
                    </div>
                    <h3 className="mt-3 text-[15px] font-semibold leading-snug">{p.title}</h3>
                    <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted-foreground">{p.reason}</p>
                    <Link
                      to={p.to}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
                    >
                      {p.cta}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* ── Career health metrics — mixed display, not identical cards ── */}
          <Reveal>
            <section className="surface-card p-6 md:p-7">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <HealthMetric
                  label="Profile completeness"
                  value={completeness.score}
                  hint={completeness.score < 60 ? "Add missing sections" : "Looking good"}
                  to="/profile"
                />
                <HealthMetric
                  label="Skills mapped"
                  value={Math.min(100, (data?.skills?.length ?? 0) * 5)}
                  display={`${data?.skills?.length ?? 0}`}
                  hint={`${data?.projects?.length ?? 0} projects linked`}
                  to="/profile"
                />
                <HealthMetric
                  label="Match strength"
                  value={matchStrength}
                  hint={activity?.matchCount ? `${activity.matchCount} roles ranked` : "No matches yet"}
                  to="/jobs"
                />
                <HealthMetric
                  label="Resume readiness"
                  value={brain?.overall_confidence != null ? Math.round(Number(brain.overall_confidence) * 100) : 80}
                  hint={activeResume ? `v${activeResume.version} active` : "No active resume"}
                  to="/resumes"
                />
              </div>
            </section>
          </Reveal>

          {/* ── Brain metadata — inline info strip, not cards ────── */}
          <Reveal delay={0.03}>
            <section className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-xl border border-border bg-muted/50 px-5 py-3.5">
              <InlineMeta label="Brain" value={brain?.version ? `v${brain.version}` : "—"} />
              <InlineMeta label="Resume" value={activeResume ? `v${activeResume.version}` : "—"} />
              <InlineMeta
                label="Last analysis"
                value={brain?.last_generated_at ? new Date(brain.last_generated_at).toLocaleDateString() : "—"}
              />
              <InlineMeta
                label="Parsing confidence"
                value={brain?.overall_confidence != null ? `${Math.round(Number(brain.overall_confidence) * 100)}%` : "—"}
                warn={brain?.overall_confidence != null && Number(brain.overall_confidence) < 0.75}
              />
              <Link to="/profile" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover">
                Career Brain <ArrowUpRight className="h-3 w-3" />
              </Link>
            </section>
          </Reveal>

          {/* ── Career Brain summary ─────────────────────────────── */}
          {data?.careerBrain?.summary && (
            <Reveal delay={0.04}>
              <section className="surface-highlight p-6 md:p-7">
                <div className="flex items-start gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="section-label text-primary">Career Brain insight</p>
                    <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-foreground">
                      {data.careerBrain.summary}
                    </p>
                  </div>
                </div>
              </section>
            </Reveal>
          )}

          {/* ── Job intelligence + pipeline ──────────────────────── */}
          <Reveal delay={0.05}>
            <DashboardWidgets />
          </Reveal>
          <Reveal delay={0.06}>
            <ApplicationsSummary />
          </Reveal>

          {/* ── Agents ───────────────────────────────────────────── */}
          <section>
            <SectionHeading
              title="Your AI team"
              description="Live status of every agent working on your career."
              action={
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live
                </span>
              }
            />
            <AgentGrid
              agents={deriveAgents({
                hasResume,
                hasParsedPendingReview: !!parsedResume,
                brainVersion: brain?.version ?? null,
                skillCount: data?.skills?.length ?? 0,
                matchCount: activity?.matchCount ?? 0,
                highMatchCount: activity?.highMatchCount ?? 0,
                workspaceCount: activity?.workspaceCount ?? 0,
                readyWorkspaceCount: activity?.readyWorkspaceCount ?? 0,
                interviewSessionCount: activity?.interviewSessionCount ?? 0,
                practicedQuestionCount: activity?.practicedQuestionCount ?? 0,
                gapCount: activity?.gapCount ?? 0,
              })}
            />
          </section>

          {/* ── Profile snapshot ─────────────────────────────────── */}
          <section>
            <SectionHeading
              title="Profile snapshot"
              description="What your Career Brain knows about you."
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link to="/profile">Edit profile</Link>
                </Button>
              }
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <SnapshotRow icon={Briefcase} label="Experience" title={data?.experiences.length ? `${data.experiences.length} roles` : "None added"} body={data?.experiences[0] ? `${data.experiences[0].role} · ${data.experiences[0].company}` : "Add roles to your profile."} />
              <SnapshotRow icon={Wrench} label="Projects" title={data?.projects.length ? `${data.projects.length} projects` : "None added"} body={data?.projects[0]?.name ?? "Great projects strengthen your Career DNA."} />
              <SnapshotRow icon={GraduationCap} label="Education" title={data?.education.length ? data.education[0].degree : "None added"} body={data?.education[0]?.institution ?? "Add education to your profile."} />
              <SnapshotRow icon={Award} label="Certifications" title={data?.certifications.length ? `${data.certifications.length} earned` : "None added"} body={data?.certifications[0]?.name ?? "Certifications boost Career Health."} />
            </div>
          </section>

          {/* ── Activity ─────────────────────────────────────────── */}
          <section>
            <SectionHeading title="Recent AI activity" description="What CareerOS has done for you lately." />
            <EmptyState
              icon={Radar}
              title="Activity will appear here"
              body="Every meaningful action — matches surfaced, resumes tailored, follow-ups drafted — is logged in this timeline as your agents work."
              action={{ label: "Review Career Brain", to: "/profile" }}
              compact
            />
          </section>
        </>
      )}
      <DevDebugPanel />
    </PageShell>
  );
}

function HealthMetric({ label, value, display, hint, to }: {
  label: string;
  value: number;
  display?: string;
  hint: string;
  to: string;
}) {
  return (
    <Link to={to} className="group min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-semibold tracking-tight">
          {display ?? <><AnimatedCounter value={value} /><span className="text-sm font-normal text-muted-foreground">%</span></>}
        </p>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.max(3, Math.min(100, value))}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease }}
          className={cn("h-full rounded-full", value >= 70 ? "bg-success" : value >= 40 ? "bg-primary" : "bg-warning")}
        />
      </div>
      <p className="mt-1.5 truncate text-xs text-muted-foreground transition-colors group-hover:text-primary">{hint}</p>
    </Link>
  );
}

function InlineMeta({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold", warn ? "text-warning-foreground" : "text-foreground")}>{value}</span>
    </span>
  );
}

function SnapshotRow({ icon: Icon, label, title, body }: {
  icon: typeof Radar;
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/25">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="meta-text">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold">{title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Immersive theme — Career Command Center header                       */
/* Rendered only when the Immersive experience is active; the Classic   */
/* dashboard below is untouched.                                        */
/* ------------------------------------------------------------------ */
function ImmersiveCommandHeader({
  displayName,
  healthScore,
  priorities,
  matchCount,
  highMatchCount,
}: {
  displayName: string;
  healthScore: number;
  priorities: Priority[];
  matchCount: number;
  highMatchCount: number;
}) {
  // Both themes share the same editorial design; tokens handle color.
  const { theme } = useTheme();
  void theme;

  const next = priorities[0];
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
      className="relative overflow-hidden border border-border bg-card"
    >
      <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
        {/* Left — command statement */}
        <div className="border-b border-border p-8 md:p-10 lg:border-b-0 lg:border-r">
          <p className="eyebrow-tag">Career Command Center</p>
          <h2 className="display-section mt-4 text-4xl text-foreground md:text-5xl">
            {displayName}, your system is{" "}
            <span className="text-primary">{healthScore >= 70 ? "strong." : healthScore >= 40 ? "building." : "starting."}</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            {priorities.length > 0
              ? `You are ${priorities.length} action${priorities.length === 1 ? "" : "s"} away from improving your career health.`
              : "No pending priorities — your career system is fully calibrated."}
          </p>
          {next && (
            <Link
              to={next.to}
              className="group mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:scale-[1.04]"
            >
              Next best action: {next.cta}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          )}
        </div>

        {/* Right — live signals strip */}
        <div className="grid grid-cols-3 divide-x divide-border lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
          {[
            { label: "Career Health", value: healthScore, suffix: "" },
            { label: "Live Matches", value: matchCount, suffix: "" },
            { label: "High Matches", value: highMatchCount, suffix: "" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.5 }}
              className="flex flex-col justify-center gap-1 px-5 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{s.label}</span>
              <span className="font-display text-3xl font-bold text-foreground">
                <AnimatedCounter value={s.value} />{s.suffix}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
