import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, Command, Gauge } from "lucide-react";
import { MatchRing } from "@/features/jobs/match-ring";
import { listWorkspaces } from "@/lib/workspace.functions";

const STAGE_LABEL: Record<string, string> = {
  workspace_created: "Created",
  company_analysis: "Company",
  job_analysis: "JD",
  resume_analysis: "Resume",
  ats_analysis: "ATS",
  gap_analysis: "Gaps",
  resume_optimization: "Optimizing",
  ready_for_cover_letter: "Cover letter",
  ready_for_interview: "Interview prep",
  application_ready: "Ready",
};

export function ApplicationsSummary() {
  const { data } = useQuery({
    queryKey: ["applications-list"],
    queryFn: () => listWorkspaces(),
  });
  const rows = (data ?? []).slice(0, 4);

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Application Intelligence
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold">
            Applications in flight
          </h3>
        </div>
        <Link
          to="/applications"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Command className="h-3.5 w-3.5" /> Open workspace
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="surface-card p-6 text-sm text-muted-foreground">
          Nothing yet. Open a job and choose <span className="font-semibold text-foreground">Prepare Application</span> — CareerOS will spin up a workspace with ATS, gap and readiness analysis.
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="grid gap-3 md:grid-cols-2"
        >
          {rows.map((w: any) => (
            <Link
              key={w.id}
              to="/applications/$workspaceId"
              params={{ workspaceId: w.id }}
              className="surface-card flex items-start gap-3 p-4 transition hover:border-primary/40"
            >
              <div className="grid h-11 w-11 flex-none place-items-center overflow-hidden rounded-lg border border-border bg-elevated">
                {w.company?.logo_url ? (
                  <img src={w.company.logo_url} alt={w.company?.name ?? ""} className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {w.company?.name ?? "Company"}
                </p>
                <p className="truncate font-display text-sm font-semibold">{w.job?.title}</p>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                    {STAGE_LABEL[w.current_stage] ?? w.current_stage}
                  </span>
                  <span>{w.progress_percent}%</span>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <MatchRing value={Number(w.readiness_score ?? 0)} size={36} strokeWidth={4} />
                <span className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  <Gauge className="mr-0.5 inline h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </motion.div>
      )}
    </section>
  );
}
