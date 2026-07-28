import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Award,
  Briefcase,
  FileText,
  GraduationCap,
  Heart,
  Radar,
  Sparkles,
  Star,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Route as AuthRoute } from "./route";
import { AgentGrid, deriveAgents } from "@/components/ai/agent-status";
import { AIThinking } from "@/components/ai/ai-thinking";
import { Skeleton } from "@/components/ai/skeleton";
import { ResumeUpload } from "@/features/resume/resume-upload";
import { DevDebugPanel } from "@/features/debug/dev-debug-panel";
import { DashboardWidgets } from "@/features/jobs/dashboard-widgets";
import { ProfileSummaryCard } from "@/features/profile/profile-summary-card";

import { ApplicationsSummary } from "@/features/applications/applications-summary";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { LiveDot } from "@/components/ui/live-dot";
import { getGreeting } from "@/lib/greeting";
import { getWorkspace } from "@/lib/profile.functions";
import { ensureInitialMatches } from "@/lib/jobs.functions";
import { getAgentActivity } from "@/lib/career-intel.functions";
import { computeCompleteness } from "@/lib/completeness";
import { Reveal } from "@/components/motion/reveal";


const ease = [0.22, 1, 0.36, 1] as const;

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Workspace · CareerOS" }] }),
  component: Dashboard,
});

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

  // Safety net: if the auto-activation after approveResume didn't run
  // (or the user landed here first), personalize their feed on first visit.
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
  const dna = data?.careerDna;
  const brain = data?.careerBrain as { version?: number | null; ai_model?: string | null; overall_confidence?: number | null; last_generated_at?: string | null } | null | undefined;
  const completeness = computeCompleteness({
    profile: profile as Parameters<typeof computeCompleteness>[0]["profile"],
    certificationsCount: data?.certifications?.length ?? 0,
    projectsCount: data?.projects?.length ?? 0,
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 p-6 md:p-10">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-elevated/40 via-card/30 to-transparent p-6 md:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-70 blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(79,140,255,0.35), transparent 70%)" }}
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Your Workspace
              </p>
              <LiveDot label={hasResume ? "AGENTS LIVE" : "STANDBY"} tone={hasResume ? "success" : "primary"} />
              <AIThinking
                size="sm"
                steps={buildThinkingSteps({
                  hasResume,
                  hasParsedPendingReview: !!parsedResume,
                  matchCount: activity?.matchCount ?? 0,
                  highMatchCount: activity?.highMatchCount ?? 0,
                  workspaceCount: activity?.workspaceCount ?? 0,
                  readyWorkspaceCount: activity?.readyWorkspaceCount ?? 0,
                  interviewSessionCount: activity?.interviewSessionCount ?? 0,
                  unreadNotifications: activity?.unreadNotifications ?? 0,
                })}
              />

            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              {primary}
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              {secondary}
            </p>
          </div>
          <div className="hero-orb hidden h-24 w-24 shrink-0 md:grid">
            <Sparkles className="h-8 w-8 text-primary drop-shadow-[0_0_18px_rgba(79,140,255,0.9)]" />
          </div>
        </div>
      </motion.div>

      {/* Signed-in profile details */}
      {isLoading ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : (
        <ProfileSummaryCard
          profile={profile}
          fallbackEmail={user.email}
          completeness={completeness.score}
        />
      )}



      {/* Activation / activated hero */}
      {isLoading ? (
        <Skeleton className="h-56 rounded-2xl" />
      ) : parsedResume && !hasResume ? (

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05, ease }}
          className="surface-elevated flex flex-col items-start justify-between gap-4 rounded-2xl border border-primary/40 bg-primary/5 p-6 md:flex-row md:items-center"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Awaiting your review</p>
            <h3 className="mt-1 font-display text-xl font-semibold">Approve your Career Brain</h3>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              I parsed <span className="text-foreground">{parsedResume.file_name}</span>. Review the extracted details, then approve to activate the workspace.
            </p>
          </div>
          <Link to="/resume-review/$resumeId" params={{ resumeId: parsedResume.id }}>
            <Button variant="primary" size="lg">
              Review & Approve <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      ) : !hasResume ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05, ease }}
        >
          <ResumeUpload
            onCompleted={() => {
              void queryClient.invalidateQueries({ queryKey: ["workspace"] });
            }}
          />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05, ease }}
          className="grid gap-5 md:grid-cols-4"
        >
          <StatCard
            icon={Heart}
            eyebrow="Career Health"
            value={Number(health?.score ?? 0)}
            suffix="/100"
            trendLabel="Overall"
            gradient
            breathe
          />
          <StatCard
            icon={TrendingUp}
            eyebrow="Experience"
            value={Number(profile?.years_of_experience ?? 0)}
            suffix={` yr${(profile?.years_of_experience ?? 0) === 1 ? "" : "s"}`}
            trendLabel={profile?.current_title ?? "Set current title"}
          />
          <StatCard
            icon={Zap}
            eyebrow="Skills"
            value={Number(data?.skills?.length ?? 0)}
            trendLabel={`${data?.projects?.length ?? 0} projects mapped`}
          />
          <StatCard
            icon={Star}
            eyebrow="Career DNA"
            value={dna ? Math.round(strongestDimension(dna).value) : 0}
            suffix="/100"
            trendLabel={dna ? strongestDimension(dna).label : "—"}
          />

        </motion.div>
      )}

      {/* Career Brain metadata — real DB values only */}
      {hasResume && (
        <section className="grid gap-3 md:grid-cols-5">
          <MetaCard label="Brain Version" value={brain?.version ? `v${brain.version}` : "—"} />
          <MetaCard label="Resume Version" value={activeResume ? `v${activeResume.version}` : "—"} />
          <MetaCard
            label="Last AI Analysis"
            value={brain?.last_generated_at ? new Date(brain.last_generated_at).toLocaleDateString() : "—"}
          />
          <MetaCard label="Profile Completeness" value={`${completeness.score}%`} tone={completeness.score < 60 ? "warning" : "default"} />
          <MetaCard
            label="Parsing Confidence"
            value={brain?.overall_confidence != null ? `${Math.round(Number(brain.overall_confidence) * 100)}%` : "—"}
            tone={brain?.overall_confidence != null && Number(brain.overall_confidence) < 0.75 ? "warning" : "default"}
          />
        </section>
      )}


      {/* Career Brain summary (once activated) */}
      {hasResume && data?.careerBrain?.summary && (
        <section className="surface-card p-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Career Brain
            </p>
          </div>
          <p className="max-w-3xl text-[15px] leading-relaxed text-foreground/90">
            {data.careerBrain.summary}
          </p>
          {activeResume && (
            <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Source · v{activeResume.version} · {activeResume.file_name}
            </p>
          )}
        </section>
      )}

      {/* AI signals from the matching engine (real data only) */}
      {hasResume && (
        <Reveal>
          <DashboardWidgets />
        </Reveal>
      )}
      {hasResume && (
        <Reveal delay={0.05}>
          <ApplicationsSummary />
        </Reveal>
      )}

      {/* Agents grid */}
      <Reveal delay={0.08} className="contents">
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Agents
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold">
              Your team is assembled.
            </h3>
          </div>
          <span className="hidden font-mono text-[11px] uppercase tracking-widest text-muted-foreground md:inline">
            Live status
          </span>
        </div>
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

      {/* Real profile cards */}
      {hasResume ? (
        <div className="grid gap-5 md:grid-cols-2">
          <ProfileCard
            icon={Briefcase}
            eyebrow="Experience"
            title={
              data && data.experiences.length
                ? `${data.experiences.length} roles`
                : "No roles yet"
            }
            body={
              data?.experiences[0]
                ? `${data.experiences[0].role} · ${data.experiences[0].company}`
                : "Add roles to your profile."
            }
          />
          <ProfileCard
            icon={Wrench}
            eyebrow="Projects"
            title={
              data && data.projects.length
                ? `${data.projects.length} projects`
                : "No projects yet"
            }
            body={
              data?.projects[0]?.name ??
              "Great projects make your Career DNA stronger."
            }
          />
          <ProfileCard
            icon={GraduationCap}
            eyebrow="Education"
            title={
              data && data.education.length
                ? data.education[0].degree
                : "No education added"
            }
            body={data?.education[0]?.institution ?? "Add education to your profile."}
          />
          <ProfileCard
            icon={Award}
            eyebrow="Certifications"
            title={
              data && data.certifications.length
                ? `${data.certifications.length} certifications`
                : "No certifications yet"
            }
            body={
              data?.certifications[0]?.name ??
              "Certifications boost your Career Health."
            }
          />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <EmptyCard
            icon={Radar}
            eyebrow="Opportunities"
            title="No matches yet"
            body="The Job Discovery Agent will begin searching once your Career Brain is created."
          />
          <EmptyCard
            icon={FileText}
            eyebrow="Applications"
            title="Nothing submitted yet"
            body="Your Application Agent hasn't submitted any applications yet."
          />
        </div>
      )}

      {/* Recent activity */}
      <section className="surface-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Agent activity</h3>
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Live
          </span>
        </div>
        <div className="rounded-lg border border-dashed border-border bg-background/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {hasResume
              ? "Every meaningful action — matches surfaced, resumes tailored, follow-ups sent — will show up here."
              : "I'll log every meaningful action here — matches surfaced, resumes tailored, follow-ups sent."}
          </p>
          {hasResume ? (
            <Button variant="ghost" size="sm" className="mt-3" asChild>
              <Link to="/profile">
                Review Career Brain
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="mt-3">
              How activity works
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </section>
      <DevDebugPanel />
    </div>
  );
}

function StatCard({
  icon: Icon,
  eyebrow,
  value,
  suffix,
  trendLabel,
  gradient,
  breathe,
}: {
  icon?: typeof Radar;
  eyebrow: string;
  value: number;
  suffix?: string;
  trendLabel?: string;
  gradient?: boolean;
  breathe?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease }}
      className="surface-card card-interactive relative p-5"
    >
      <div className="flex items-start justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </p>
        {Icon && (
          <span className={"icon-halo h-8 w-8 " + (breathe ? "animate-breathe" : "")}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p
        className={
          "mt-3 font-display text-3xl font-semibold tracking-tight " +
          (gradient ? "text-gradient-stat" : "text-foreground")
        }
      >
        <AnimatedCounter value={value} />
        {suffix && (
          <span className="ml-0.5 text-base font-normal text-muted-foreground">{suffix}</span>
        )}
      </p>
      {trendLabel && (
        <p className="mt-1 truncate text-xs text-muted-foreground">{trendLabel}</p>
      )}
    </motion.div>
  );
}


function ProfileCard({
  icon: Icon,
  eyebrow,
  title,
  body,
}: {
  icon: typeof Radar;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, ease }}
      className="surface-card card-interactive p-6"
    >
      <div className="mb-4 icon-halo">
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {eyebrow}
      </p>
      <p className="mt-1 font-display text-lg font-semibold">{title}</p>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </motion.div>
  );
}


function MetaCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warning" }) {
  return (
    <div className={`rounded-xl border p-3 ${tone === "warning" ? "border-warning/40 bg-warning/10" : "border-border bg-elevated"}`}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-base font-semibold">{value}</p>
    </div>
  );
}

function EmptyCard({
  icon: Icon,
  eyebrow,
  title,
  body,
}: {
  icon: typeof Radar;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, ease }}
      whileHover={{ y: -2 }}
      className="surface-card p-6 transition-colors hover:border-primary/30"
    >
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-elevated text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {eyebrow}
      </p>
      <p className="mt-1 font-display text-lg font-semibold">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </motion.div>
  );
}

type DnaRow = { [k: string]: number | string | null };

function strongestDimension(dna: DnaRow): { label: string; value: number } {
  const dims: Array<[string, string]> = [
    ["cloud", "Cloud"],
    ["devops", "DevOps"],
    ["backend", "Backend"],
    ["frontend", "Frontend"],
    ["ai", "AI"],
    ["automation", "Automation"],
    ["leadership", "Leadership"],
    ["communication", "Communication"],
    ["architecture", "Architecture"],
    ["problem_solving", "Problem Solving"],
    ["security", "Security"],
  ];
  let best = { label: "—", value: 0 };
  for (const [key, label] of dims) {
    const v = typeof dna[key] === "number" ? (dna[key] as number) : 0;
    if (v > best.value) best = { label, value: v };
  }
  return best;
}

/**
 * Compose the "AI thinking" rotating strip from real activity signals.
 * Never fewer than 2 steps so the animation still cycles.
 */
function buildThinkingSteps(a: {
  hasResume: boolean;
  hasParsedPendingReview: boolean;
  matchCount: number;
  highMatchCount: number;
  workspaceCount: number;
  readyWorkspaceCount: number;
  interviewSessionCount: number;
  unreadNotifications: number;
}): string[] {
  if (!a.hasResume) {
    return a.hasParsedPendingReview
      ? [
          "📄  Resume parsed — awaiting your review…",
          "🧠  Career Brain queued for activation…",
          "⚡  Agents standing by…",
        ]
      : [
          "✨  Workspace ready…",
          "🧠  Waiting for your resume…",
          "⚡  Agents standing by…",
        ];
  }
  const steps: string[] = ["🧠  Reading your Career Brain…"];
  if (a.highMatchCount > 0) {
    steps.push(`🎯  ${a.highMatchCount} strong match${a.highMatchCount === 1 ? "" : "es"} ready to review…`);
  } else if (a.matchCount > 0) {
    steps.push(`📊  Ranking ${a.matchCount} role${a.matchCount === 1 ? "" : "s"} against your profile…`);
  } else {
    steps.push("🎯  Watching for fresh matches…");
  }
  if (a.readyWorkspaceCount > 0) {
    steps.push(`🚀  ${a.readyWorkspaceCount} application${a.readyWorkspaceCount === 1 ? "" : "s"} ready to submit…`);
  } else if (a.workspaceCount > 0) {
    steps.push(`🛠  ${a.workspaceCount} application${a.workspaceCount === 1 ? "" : "s"} in flight…`);
  }
  if (a.interviewSessionCount > 0) {
    steps.push(`🎤  ${a.interviewSessionCount} interview session${a.interviewSessionCount === 1 ? "" : "s"} to practice…`);
  }
  if (a.unreadNotifications > 0) {
    steps.push(`🔔  ${a.unreadNotifications} new signal${a.unreadNotifications === 1 ? "" : "s"} in your notification center…`);
  }
  steps.push("⚡  Agents live…");
  return steps.slice(0, 4);
}
