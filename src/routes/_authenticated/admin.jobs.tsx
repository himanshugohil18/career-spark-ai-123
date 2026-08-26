import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getJobsOverview } from "@/lib/admin.functions";
import { Briefcase, CheckCircle2, XCircle, Copy } from "lucide-react";
import { StatCard, Panel } from "@/features/admin/ui";
import { TIER_LABELS, providerMeta } from "@/lib/jobs/provider-registry";
import { ExportBar } from "@/features/admin/ExportMenu";

export const Route = createFileRoute("/_authenticated/admin/jobs")({
  component: AdminJobs,
});

function AdminJobs() {
  const q = useQuery({
    queryKey: ["admin-jobs"],
    queryFn: () => getJobsOverview(),
    refetchInterval: 30_000,
  });
  const d = q.data;

  return (
    <div className="space-y-6">
      <ExportBar
        title="Job catalogue"
        description="Catalogue size, duplicate detection and per-provider crawl reliability."
        filenameBase="careeros-jobs"
        buildReport={() =>
          d
            ? {
                title: "Job Catalogue Report",
                subtitle: "Catalogue volume, duplication sampling and provider reliability tiers.",
                filename: "careeros-job-catalogue",
                kpis: [
                  { label: "Total jobs", value: d.totals.total.toLocaleString() },
                  { label: "Active jobs", value: d.totals.active.toLocaleString(), tone: "good" },
                  { label: "Duplicates (sample)", value: String(d.totals.duplicatesInSample) },
                  { label: "Providers", value: String((d.sources ?? []).length) },
                ],
                barLists: [
                  {
                    title: "Jobs per provider (top 15)",
                    items: Object.entries(d.perProvider ?? {})
                      .sort((a, b) => (b[1] as number) - (a[1] as number))
                      .slice(0, 15)
                      .map(([id, n]) => ({ label: providerMeta(id).name, value: n as number })),
                  },
                ],
                tables: [
                  {
                    title: "Provider reliability",
                    columns: ["Provider", "Tier", "Type", "Health", "On", "Jobs", "Fails", "Avg ms", "Last success"],
                    rows: (d.sources ?? []).map((s: any) => [
                      providerMeta(s.id).name,
                      `T${providerMeta(s.id).tier}`,
                      providerMeta(s.id).sourceType,
                      s.health_status ?? "unknown",
                      s.enabled ? "yes" : "no",
                      d.perProvider[s.id] ?? 0,
                      `${s.consecutive_failures ?? 0}/${s.failure_count ?? 0}`,
                      s.avg_response_ms ?? "—",
                      s.last_success_at ? new Date(s.last_success_at).toLocaleString() : "never",
                    ]),
                  },
                ],
              }
            : null
        }
      />
      <section className="grid gap-3 md:grid-cols-3">
        <StatCard label="Total jobs" value={d?.totals.total ?? "—"} icon={Briefcase} />
        <StatCard label="Active jobs" value={d?.totals.active ?? "—"} icon={CheckCircle2} tone="success" />
        <StatCard label="Duplicates (sample)" value={d?.totals.duplicatesInSample ?? "—"} icon={Copy} />
      </section>

      <Panel title="Provider health & reliability tiers">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-elevated text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Tier / source type</th>
                <th className="px-3 py-2">Health</th>
                <th className="px-3 py-2">Enabled</th>
                <th className="px-3 py-2">Jobs</th>
                <th className="px-3 py-2">Fetched / verified</th>
                <th className="px-3 py-2">Fails</th>
                <th className="px-3 py-2">Avg ms</th>
                <th className="px-3 py-2">Last success</th>
                <th className="px-3 py-2">Last attempt</th>
                <th className="px-3 py-2">Last error</th>
              </tr>
            </thead>
            <tbody>
              {(d?.sources ?? []).map((s: any) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <p className="font-medium">{providerMeta(s.id).name}</p>
                    <p
                      className="font-mono text-[10px] text-muted-foreground"
                      title={providerMeta(s.id).integrationNote}
                    >
                      {s.id}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-[11px]">
                    <span
                      className={
                        "rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider " +
                        (providerMeta(s.id).tier === 1
                          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : providerMeta(s.id).tier === 2
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-amber-500/35 bg-amber-500/10 text-amber-600 dark:text-amber-400")
                      }
                      title={TIER_LABELS[providerMeta(s.id).tier]}
                    >
                      T{providerMeta(s.id).tier}
                    </span>
                    <span className="ml-2 text-muted-foreground">{providerMeta(s.id).sourceType}</span>
                  </td>
                  <td className="px-3 py-2 text-[11px]">
                    <span
                      className={
                        s.health_status === "healthy"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : s.health_status === "degraded"
                            ? "text-amber-600 dark:text-amber-400"
                            : s.health_status === "unhealthy"
                              ? "text-destructive"
                              : "text-muted-foreground"
                      }
                    >
                      {s.health_status ?? "unknown"}
                    </span>
                    {s.disabled_reason ? (
                      <p className="text-[10px] text-muted-foreground">{s.disabled_reason}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {s.enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono">{d?.perProvider[s.id] ?? 0}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">
                    {s.last_fetched_count ?? 0} / {s.last_verified_count ?? 0}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">
                    {s.consecutive_failures ?? 0}
                    <span className="text-muted-foreground"> / {s.failure_count ?? 0}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {s.avg_response_ms ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {s.last_success_at ? new Date(s.last_success_at).toLocaleString() : "never"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {s.last_attempt_at
                      ? new Date(s.last_attempt_at).toLocaleString()
                      : s.last_run_at
                        ? new Date(s.last_run_at).toLocaleString()
                        : "—"}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-destructive">{s.last_error ?? "—"}</td>
                </tr>
              ))}
              {q.isLoading && (
                <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
