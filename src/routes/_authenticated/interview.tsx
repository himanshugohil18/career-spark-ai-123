import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MessagesSquare, Building2, GraduationCap } from "lucide-react";
import { Skeleton } from "@/components/ai/skeleton";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { getInterviewHub } from "@/lib/career-intel.functions";

export const Route = createFileRoute("/_authenticated/interview")({
  head: () => ({ meta: [{ title: "Interview Prep · CareerOS" }] }),
  component: InterviewPage,
});

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
  const { data, isLoading } = useQuery({
    queryKey: ["interview-hub"],
    queryFn: () => getInterviewHub(),
    staleTime: 30_000,
  });

  const cats = data?.byCategory ?? {};
  const totalPct = data && data.totals.totalQ > 0
    ? Math.round((data.totals.totalPracticed / data.totals.totalQ) * 100)
    : 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-10">
      <motion.header
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Interview Prep</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Practice hub</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Interview sessions are generated inside each Application Workspace. This is your central practice history and question bank.
        </p>
      </motion.header>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <Stat label="Total questions" value={data!.totals.totalQ} />
            <Stat label="Practiced" value={data!.totals.totalPracticed} suffix={` · ${totalPct}%`} />
            <Stat label="Active sessions" value={data!.sessions.length} />
          </section>

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
                        {CATEGORY_LABEL[s.kind] ?? s.kind} · {s.difficulty ?? "—"} · {s.practiced_count}/{s.question_count} practiced
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

