import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAdminOverview } from "@/lib/admin.functions";
import {
  Users,
  Briefcase,
  Sparkles,
  Bot,
  Activity,
  CreditCard,
  TrendingUp,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { StatCard, Panel, money, StatusPill } from "@/features/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const q = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => getAdminOverview(),
    refetchInterval: 30_000,
  });

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (q.error) return <div className="text-sm text-destructive">Failed: {(q.error as Error).message}</div>;
  const d = q.data!;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-4">
        <StatCard label="Users" value={d.counts.users} icon={Users} sub={`+${d.counts.newToday} today`} />
        <StatCard label="Premium" value={d.counts.activeSubs} icon={CreditCard} tone="success" />
        <StatCard label="Revenue (30d)" value={money(d.revenue.monthPaise)} icon={TrendingUp} tone="success" sub={`${money(d.revenue.todayPaise)} today`} />
        <StatCard label="Active Jobs" value={d.counts.activeJobs} icon={Briefcase} />
        <StatCard label="Matches" value={d.counts.matches} icon={Sparkles} />
        <StatCard label="Applications" value={d.counts.workspaces} icon={Activity} />
        <StatCard label="AI Requests" value={d.counts.aiTotal} icon={Sparkles} sub={`${d.counts.aiSuccessRate}% success`} />
        <StatCard label="AI (24h)" value={d.counts.sessions24h} icon={Bot} />
        <StatCard label="Auto-apply running" value={d.counts.autoRunning} icon={Bot} tone={d.counts.autoRunning > 0 ? "success" : "default"} />
        <StatCard label="Auto-apply failed" value={d.counts.autoFailed} icon={XCircle} tone="danger" />
        <StatCard label="Payments captured" value={d.counts.capturedPayments} icon={CheckCircle2} tone="success" />
        <StatCard label="Payments failed" value={d.counts.failedPayments} icon={XCircle} tone="danger" />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Panel title="Recent AI application sessions">
          <div className="max-h-[360px] overflow-y-auto">
            {d.recentSessions.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No sessions yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {d.recentSessions.map((s: any) => (
                  <li key={s.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{s.current_step ?? "—"}</p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {new Date(s.started_at).toLocaleString()}
                      </p>
                      {s.error && <p className="mt-0.5 line-clamp-2 text-[11px] text-destructive">{s.error}</p>}
                    </div>
                    <StatusPill status={String(s.status)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel title="Recent failed AI generations">
          <div className="max-h-[360px] overflow-y-auto">
            {d.failedGenerations.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No failed generations.</p>
            ) : (
              <ul className="divide-y divide-border">
                {d.failedGenerations.map((g: any) => (
                  <li key={g.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-medium">{g.kind}</p>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {new Date(g.created_at).toLocaleString()}
                      </span>
                    </div>
                    {g.error && <p className="mt-0.5 line-clamp-2 text-[11px] text-destructive">{g.error}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </section>

      <Panel title="Recent signups">
        <ul className="divide-y divide-border">
          {d.recentUsers.map((u: any) => (
            <li key={u.user_id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{u.full_name || u.email || u.user_id}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">{u.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full border border-border bg-elevated px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
                  {u.provider === "google" ? "Google" : "Email"}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                </span>
              </div>
            </li>
          ))}

        </ul>
      </Panel>
    </div>
  );
}
