import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, Command, LayoutGrid, List, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ai/skeleton";
import { MatchRing } from "@/features/jobs/match-ring";
import { listWorkspaces } from "@/lib/workspace.functions";
import { PipelineKanban } from "@/features/applications/pipeline-kanban";

export const Route = createFileRoute("/_authenticated/applications/")({
  head: () => ({ meta: [{ title: "Applications · CareerOS" }] }),
  component: ApplicationsIndex,
});

const STAGE_LABEL: Record<string, string> = {
  workspace_created: "Created",
  company_analysis: "Company",
  job_analysis: "JD",
  resume_analysis: "Resume",
  ats_analysis: "ATS",
  gap_analysis: "Gap analysis",
  resume_optimization: "Optimizing",
  ready_for_cover_letter: "Cover letter",
  ready_for_interview: "Interview prep",
  application_ready: "Ready",
};

type SortKey = "recent" | "readiness" | "company";

function ApplicationsIndex() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const { data, isLoading } = useQuery({
    queryKey: ["applications-list"],
    queryFn: () => listWorkspaces(),
  });

  const rows = useMemo(() => {
    const list = (data ?? []) as any[];
    const needle = q.trim().toLowerCase();
    let out = list.filter((w) => {
      if (!needle) return true;
      const hay = [w.job?.title, w.company?.name, w.job?.location].join(" ").toLowerCase();
      return hay.includes(needle);
    });
    out = out.sort((a, b) => {
      if (sort === "readiness") return Number(b.readiness_score ?? 0) - Number(a.readiness_score ?? 0);
      if (sort === "company") return (a.company?.name ?? "").localeCompare(b.company?.name ?? "");
      const at = new Date(a.updated_at ?? a.last_opened_at ?? 0).getTime();
      const bt = new Date(b.updated_at ?? b.last_opened_at ?? 0).getTime();
      return bt - at;
    });
    return out;
  }, [data, q, sort]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-10">
      <motion.header
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Application Intelligence</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Your applications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every role you're preparing for. AI keeps ATS, gaps, and readiness fresh per application.
        </p>
      </motion.header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company or role…" className="pl-9" />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-9 rounded-md border border-border bg-elevated px-2 text-sm"
        >
          <option value="recent">Recently updated</option>
          <option value="readiness">Highest readiness</option>
          <option value="company">Company A→Z</option>
        </select>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {rows.length} of {(data ?? []).length}
        </span>
        <div className="ml-auto flex items-center gap-1 rounded-md border border-border bg-elevated p-0.5">
          <button
            type="button"
            onClick={() => setView("kanban")}
            aria-pressed={view === "kanban"}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition ${
              view === "kanban" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Pipeline
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition ${
              view === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      )}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="surface-card p-10 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-primary" />
          <h3 className="mt-3 font-display text-lg font-semibold">No applications yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Open any job and choose <span className="font-semibold text-foreground">Prepare Application</span> to spin up a workspace.
          </p>
          <Link to="/jobs" className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-1.5 text-sm hover:bg-primary/10">
            <Command className="h-4 w-4" /> Browse jobs
          </Link>
        </div>
      )}

      {!isLoading && rows.length > 0 && view === "kanban" && <PipelineKanban workspaces={rows} />}

      {!isLoading && rows.length > 0 && view === "list" && (
        <div className="surface-card overflow-hidden">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_90px_90px_90px_120px_90px] items-center gap-3 border-b border-border bg-elevated/50 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <div>Company · Role</div>
            <div>Stage</div>
            <div className="text-right">Readiness</div>
            <div className="text-right">ATS</div>
            <div className="text-right">Resume</div>
            <div>Updated</div>
            <div className="text-right">Open</div>
          </div>
          <ul>
            {rows.map((w: any) => (
              <li key={w.id}>
                <Link
                  to="/applications/$workspaceId"
                  params={{ workspaceId: w.id }}
                  className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_90px_90px_90px_120px_90px] items-center gap-3 border-b border-border px-4 py-3 text-sm transition hover:bg-elevated/50 last:border-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-9 w-9 flex-none place-items-center overflow-hidden rounded-md border border-border bg-elevated">
                      {w.company?.logo_url ? (
                        <img src={w.company.logo_url} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-semibold">{w.job?.title ?? "Role"}</p>
                      <p className="truncate text-xs text-muted-foreground">{w.company?.name ?? "—"}</p>
                    </div>
                  </div>
                  <div>
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary">
                      {STAGE_LABEL[w.current_stage] ?? w.current_stage}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <MatchRing value={Number(w.readiness_score ?? 0)} size={28} strokeWidth={4} />
                  </div>
                  <div className="text-right font-mono text-xs text-muted-foreground">
                    {w.ats_score != null ? `${w.ats_score}` : "—"}
                  </div>
                  <div className="text-right font-mono text-xs text-muted-foreground">
                    {w.resume_version ? `v${w.resume_version}` : "—"}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {new Date(w.updated_at ?? w.last_opened_at ?? Date.now()).toLocaleDateString()}
                  </div>
                  <div className="text-right text-xs text-primary">Open →</div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
