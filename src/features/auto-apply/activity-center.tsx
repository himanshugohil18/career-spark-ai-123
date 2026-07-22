import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bot, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ai/skeleton";
import { listAutoApplySessions } from "@/lib/auto-apply.functions";
import { STEP_LABELS } from "@/lib/auto-apply/driver";

const LIVE_STATUSES = new Set(["queued", "running", "awaiting_input", "awaiting_approval", "submitting"]);

export function ActivityCenter() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["auto-apply-sessions"],
    queryFn: () => listAutoApplySessions(),
    refetchInterval: 5000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("aas-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ai_application_sessions" },
        () => qc.invalidateQueries({ queryKey: ["auto-apply-sessions"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc]);

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const live = rows.filter((r) => LIVE_STATUSES.has(String(r.status)));
  const past = rows.filter((r) => !LIVE_STATUSES.has(String(r.status))).slice(0, 12);

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <p className="font-display font-semibold">Live agents</p>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {live.length} active
          </span>
        </div>
        {live.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No agents are running. Pick a job and hit <span className="font-semibold">Apply with AI</span>.
          </p>
        ) : (
          <ul className="space-y-3">
            {live.map((r) => (
              <SessionRow key={String(r.id)} row={r} live />
            ))}
          </ul>
        )}
      </section>

      <section className="surface-card p-5">
        <p className="mb-3 font-display font-semibold">Recent runs</p>
        {past.length === 0 ? (
          <p className="text-sm text-muted-foreground">Completed sessions will appear here.</p>
        ) : (
          <ul className="space-y-2">
            {past.map((r) => (
              <SessionRow key={String(r.id)} row={r} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SessionRow({ row, live = false }: { row: Record<string, unknown>; live?: boolean }) {
  const job = row.jobs as Record<string, unknown> | null;
  const company = row.companies as Record<string, unknown> | null;
  const workspaceId = String(row.workspace_id);
  const status = String(row.status);
  const step = String(row.current_step);
  const progress = Number(row.progress ?? 0);
  const startedAt = row.started_at ? new Date(String(row.started_at)) : null;
  const elapsed = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0;

  return (
    <li>
      <Link
        to="/applications/$workspaceId/agent"
        params={{ workspaceId }}
        className="flex items-center gap-3 rounded-xl border border-border bg-elevated/30 p-3 transition hover:border-primary/40"
      >
        <div className="grid h-9 w-9 flex-none place-items-center overflow-hidden rounded-md border border-border bg-elevated">
          {company?.logo_url ? (
            <img src={String(company.logo_url)} alt="" className="h-full w-full object-contain" />
          ) : (
            <Building2 className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-semibold">
            {String(job?.title ?? "Application")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {String(company?.name ?? job?.company_name ?? "—")} · {STEP_LABELS[step] ?? step}
          </p>
        </div>
        <div className="hidden w-40 md:block">
          <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {progress}%
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {status.replace(/_/g, " ")}
        </span>
        {live && (
          <span className="font-mono text-[10px] text-muted-foreground">
            {Math.floor(elapsed / 60)}m {elapsed % 60}s
          </span>
        )}
      </Link>
    </li>
  );
}
