import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Mail, CheckCircle2, XCircle, TimerReset, RotateCw } from "lucide-react";
import { StatCard, Panel, StatusPill } from "@/features/admin/ui";
import { getEmailAnalytics, listEmailLogs } from "@/lib/admin-email.functions";

export const Route = createFileRoute("/_authenticated/admin/emails")({
  component: AdminEmails,
  head: () => ({
    meta: [
      { title: "Email Analytics · Admin · CareerOS" },
      { name: "description", content: "Delivery success, failures, and per-template email history for CareerOS." },
    ],
  }),
});

function AdminEmails() {
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "failed" | "throttled">("all");

  const analytics = useQuery({
    queryKey: ["admin-email-analytics"],
    queryFn: () => getEmailAnalytics(),
    refetchInterval: 30_000,
  });

  const logs = useQuery({
    queryKey: ["admin-email-logs", statusFilter],
    queryFn: () => listEmailLogs({ data: { limit: 100, status: statusFilter } }),
    refetchInterval: 30_000,
  });

  const a = analytics.data;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-4">
        <StatCard label="Sent today" value={a?.sentToday ?? "—"} icon={CheckCircle2} tone="success" />
        <StatCard label="Failed today" value={a?.failedToday ?? "—"} icon={XCircle} tone={a && a.failedToday > 0 ? "danger" : "default"} />
        <StatCard label="Throttled" value={a?.throttledToday ?? "—"} icon={TimerReset} sub="deduped/rate-limited" />
        <StatCard label="Success rate" value={a ? `${a.successRate}%` : "—"} icon={Mail} tone={a && a.successRate >= 95 ? "success" : "warn"} sub={a ? `${a.totalRetries} retries · 7d` : undefined} />
      </section>

      <Panel title="Template usage (last 7 days)">
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-elevated/50 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Template</th>
                <th className="px-4 py-2 text-right">Sent</th>
                <th className="px-4 py-2 text-right">Failed</th>
                <th className="px-4 py-2 text-right">Throttled</th>
                <th className="px-4 py-2 text-right">Retries</th>
              </tr>
            </thead>
            <tbody>
              {(a?.templateStats ?? []).map((row) => (
                <tr key={row.template} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{row.template}</td>
                  <td className="px-4 py-2 text-right text-emerald-500">{row.sent}</td>
                  <td className="px-4 py-2 text-right text-destructive">{row.failed}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{row.throttled}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{row.retries}</td>
                </tr>
              ))}
              {!analytics.isLoading && (a?.templateStats?.length ?? 0) === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No email activity in the last 7 days.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Recent email history"
        action={
          <div className="flex items-center gap-1">
            {(["all", "sent", "failed", "throttled"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                  statusFilter === s
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
            <button
              onClick={() => logs.refetch()}
              className="ml-1 rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label="Refresh"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </div>
        }
      >
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-elevated/50 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">When</th>
                <th className="px-4 py-2 text-left">Recipient</th>
                <th className="px-4 py-2 text-left">Template</th>
                <th className="px-4 py-2 text-left">Subject</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Retries</th>
              </tr>
            </thead>
            <tbody>
              {(logs.data?.rows ?? []).map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{row.recipient}</td>
                  <td className="px-4 py-2 text-xs">{row.template}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {row.subject}
                    {row.error_message ? (
                      <div className="mt-1 text-[11px] text-destructive/80">{row.error_message}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-2"><StatusPill status={row.status} /></td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">{row.retry_count}</td>
                </tr>
              ))}
              {!logs.isLoading && (logs.data?.rows?.length ?? 0) === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No email logs to show.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
