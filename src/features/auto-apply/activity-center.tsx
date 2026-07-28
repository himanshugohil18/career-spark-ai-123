import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bot, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ai/skeleton";
import { SpringNumber } from "@/components/motion/spring-number";
import { listAutoApplySessions, getAutoApplySession } from "@/lib/auto-apply.functions";
import { STEP_LABELS } from "@/lib/auto-apply/driver";
import { StatusPill } from "@/features/auto-apply/status-pill";
import { ProgressRing } from "@/features/auto-apply/progress-ring";
import { ConsoleLog, type ConsoleEvent } from "@/features/auto-apply/console-log";

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

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const live = rows.filter((r) => LIVE_STATUSES.has(String(r.status)));
  const past = rows.filter((r) => !LIVE_STATUSES.has(String(r.status))).slice(0, 12);
  const focusedId = live[0] ? String(live[0].id) : null;

  const sessionState =
    live.some((r) => r.status === "running" || r.status === "submitting")
      ? "running"
      : live.some((r) => r.status === "awaiting_approval" || r.status === "awaiting_input")
        ? "paused"
        : live.length > 0
          ? "queued"
          : "idle";

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-6">
      {/* Session header */}
      <section className="surface-card flex flex-wrap items-center gap-4 p-5">
        <div className="grid h-10 w-10 place-items-center rounded-full border border-primary/40 bg-primary/10">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Agent session</p>
          <div className="mt-1 flex items-center gap-2">
            <StatusPill status={sessionState} layoutId="session-header-status" />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <span>
            <SpringNumber value={live.length} className="text-foreground text-base font-semibold" /> active
          </span>
          <span>
            <SpringNumber value={rows.length} className="text-foreground text-base font-semibold" /> total
          </span>
        </div>
      </section>

      {/* Live terminal for the most relevant running session */}
      <FocusedConsole sessionId={focusedId} />

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

function FocusedConsole({ sessionId }: { sessionId: string | null }) {
  const { data } = useQuery({
    queryKey: ["auto-apply", sessionId, "console"],
    queryFn: () => getAutoApplySession({ data: { sessionId: sessionId! } }),
    enabled: Boolean(sessionId),
    refetchInterval: sessionId ? 4000 : false,
  });

  const events: ConsoleEvent[] = useMemo(() => {
    if (!data?.events) return [];
    return (data.events as Array<Record<string, unknown>>).map((e) => ({
      id: String(e.id),
      created_at: String(e.created_at),
      kind: e.kind ? String(e.kind) : null,
      step: e.step ? String(e.step) : null,
      message: String(e.message),
    }));
  }, [data]);

  return (
    <ConsoleLog
      events={events}
      title={sessionId ? "Live agent console" : "Agent console"}
    />
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
        {live && <ProgressRing progress={progress} size={32} />}
        <StatusPill status={status} />
        {live && (
          <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
            {Math.floor(elapsed / 60)}m {elapsed % 60}s
          </span>
        )}
      </Link>
    </li>
  );
}
