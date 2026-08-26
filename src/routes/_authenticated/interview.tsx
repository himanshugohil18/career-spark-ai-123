import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessagesSquare, Building2, GraduationCap, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ai/skeleton";
import { PageHeader } from "@/components/product/page-header";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { getInterviewHub, toggleQuestionPracticed } from "@/lib/career-intel.functions";

export const Route = createFileRoute("/_authenticated/interview")({
  head: () => ({
    meta: [
      { title: "Interview Prep · CareerOS" },
      {
        name: "description",
        content: "Practice interview questions, track readiness, and review CareerOS interview preparation progress.",
      },
      { property: "og:title", content: "Interview Prep · CareerOS" },
      {
        property: "og:description",
        content: "Practice interview questions, track readiness, and review CareerOS interview preparation progress.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InterviewRoute,
});

function InterviewRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname.startsWith("/interview/simulator")) return <Outlet />;
  return <InterviewPage />;
}

const CATEGORY_LABEL: Record<string, string> = {
  behavioral: "Behavioral",
  technical: "Technical",
  company: "Company",
  resume: "Resume",
  general: "General",
  system_design: "System Design",
  coding: "Coding",
};

function InterviewPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["interview-hub"],
    queryFn: () => getInterviewHub(),
    staleTime: 30_000,
  });

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; practiced: boolean }) =>
      toggleQuestionPracticed({ data: v }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["interview-hub"] });
      void queryClient.invalidateQueries({ queryKey: ["agent-activity"] });
      void queryClient.invalidateQueries({ queryKey: ["coach-briefing"] });
    },
    onError: (e) => toast.error("Could not update", { description: String(e) }),
  });

  const cats = data?.byCategory ?? {};
  const totalPct = data && data.totals.totalQ > 0
    ? Math.round((data.totals.totalPracticed / data.totals.totalQ) * 100)
    : 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-10">
      <PageHeader
        eyebrow="Interview Prep"
        title="Practice hub"
        description="Interview sessions are generated inside each Application Workspace. This is your central practice history and question bank."
        meta={
          <Button asChild size="sm">
            <Link to="/interview/simulator">
              <MessagesSquare className="h-3.5 w-3.5" /> Start AI mock interview
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <Stat label="Total questions" value={data!.totals.totalQ} />
            <Stat label="Practiced" value={data!.totals.totalPracticed} suffix={` · ${totalPct}%`} />
            <Stat label="Prep packs" value={data!.sessions.length} />
            <Stat
              label="Mock interviews"
              value={data!.mockStats.total}
              suffix={
                data!.mockStats.averageScore != null
                  ? ` · avg ${data!.mockStats.averageScore}/10`
                  : undefined
              }
            />
          </section>

          {data!.mockSessions.length > 0 && (
            <section>
              <h3 className="mb-3 font-display text-lg font-semibold">Mock interview history</h3>
              <ul className="surface-card divide-y divide-border">
                {data!.mockSessions.map((m: any) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {m.target_role}
                        {m.target_company ? ` · ${m.target_company}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString()} ·{" "}
                        {String(m.interview_type ?? "mixed").replace("_", " ")} ·{" "}
                        {m.answered_questions}/{m.planned_questions} answered
                        {m.mode === "teacher" ? " · teacher mode" : ""}
                      </p>
                    </div>
                    {m.status === "completed" ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        {Number(m.overall_score).toFixed(1)}/10
                      </span>
                    ) : (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/interview/simulator">Resume</Link>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="surface-card p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">By category</p>
            <h3 className="mt-1 font-display text-lg font-semibold">Progress by question type</h3>
            {Object.keys(cats).length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No questions yet. Open any Application Workspace and generate an Interview Pack from the AI Assistant tab.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {Object.entries(cats).map(([cat, v]) => {
                  const pct = v.total > 0 ? Math.round((v.practiced / v.total) * 100) : 0;
                  return (
                    <div key={cat}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-foreground/80">{CATEGORY_LABEL[cat] ?? cat}</span>
                        <span className="font-mono text-muted-foreground">{v.practiced}/{v.total} · {pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-border">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-3 font-display text-lg font-semibold">Recent sessions</h3>
            {data!.sessions.length === 0 ? (
              <div className="surface-card flex items-center gap-3 p-6 text-sm text-muted-foreground">
                <MessagesSquare className="h-5 w-5 text-primary" />
                No sessions yet. Open a workspace below to generate one.
              </div>
            ) : (
              <ul className="grid gap-2">
                {data!.sessions.map((s: any) => (
                  <li key={s.id} className="surface-card flex items-center justify-between p-4">
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-semibold">
                        {s.workspace?.job?.title ?? "Interview"} · <span className="text-muted-foreground">{s.workspace?.job?.company?.name ?? "—"}</span>
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {s.focus ?? "mixed"} · {s.completed_questions ?? 0}/{s.total_questions ?? 0} practiced
                      </p>
                    </div>
                    {s.workspace_id && (
                      <Link
                        to="/applications/$workspaceId"
                        params={{ workspaceId: s.workspace_id }}
                        className="rounded-md border border-border bg-elevated px-2.5 py-1 text-xs hover:border-primary/40"
                      >
                        Open
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(() => {
            const unpracticed = (data!.questions ?? []).filter((q: any) => !q.practiced).slice(0, 6);
            if (unpracticed.length === 0) return null;
            return (
              <section>
                <h3 className="mb-3 font-display text-lg font-semibold">Next up</h3>
                <ul className="grid gap-2">
                  {unpracticed.map((q: any) => (
                    <li key={q.id} className="surface-card flex items-start gap-3 p-4">
                      <button
                        type="button"
                        aria-label="Mark practiced"
                        onClick={() => toggleMut.mutate({ id: q.id, practiced: true })}
                        disabled={toggleMut.isPending}
                        className="mt-0.5 text-muted-foreground transition hover:text-primary"
                      >
                        <Circle className="h-4 w-4" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">{q.question}</p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {CATEGORY_LABEL[q.category] ?? q.category} · {q.difficulty ?? "—"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })()}

          {(() => {
            const practicedRecent = (data!.questions ?? []).filter((q: any) => q.practiced).slice(0, 4);
            if (practicedRecent.length === 0) return null;
            return (
              <section>
                <h3 className="mb-3 font-display text-lg font-semibold">Recently practiced</h3>
                <ul className="grid gap-2">
                  {practicedRecent.map((q: any) => (
                    <li key={q.id} className="surface-card flex items-start gap-3 p-4">
                      <button
                        type="button"
                        aria-label="Unmark practiced"
                        onClick={() => toggleMut.mutate({ id: q.id, practiced: false })}
                        disabled={toggleMut.isPending}
                        className="mt-0.5 text-primary transition hover:text-muted-foreground"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground/80">{q.question}</p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {CATEGORY_LABEL[q.category] ?? q.category} · {q.difficulty ?? "—"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })()}

          <section>
            <h3 className="mb-3 font-display text-lg font-semibold">Practice from a workspace</h3>
            {data!.workspaces.length === 0 ? (
              <div className="surface-card flex items-center gap-3 p-6 text-sm text-muted-foreground">
                <Building2 className="h-5 w-5 text-primary" />
                Create an Application Workspace first — open any job and choose "Prepare Application".
              </div>
            ) : (
              <ul className="grid gap-2 md:grid-cols-2">
                {data!.workspaces.map((w: any) => (
                  <Link
                    key={w.id}
                    to="/applications/$workspaceId"
                    params={{ workspaceId: w.id }}
                    className="surface-card flex items-center justify-between p-4 transition hover:border-primary/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-semibold">{w.job?.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{w.job?.company?.name}</p>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      <GraduationCap className="mr-1 inline h-3 w-3" />
                      {w.readiness_score ?? 0}
                    </span>
                  </Link>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  const numeric = typeof value === "number" ? value : Number(value);
  const isNum = Number.isFinite(numeric);
  return (
    <div className="surface-card card-interactive p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <span className="icon-halo h-7 w-7"><MessagesSquare className="h-3.5 w-3.5" /></span>
      </div>
      <p className="mt-2 font-display text-3xl font-semibold text-gradient-stat">
        {isNum ? <AnimatedCounter value={numeric} /> : value}
        <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span>
      </p>
    </div>
  );
}