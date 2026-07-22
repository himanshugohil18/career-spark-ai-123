import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getJobsOverview } from "@/lib/admin.functions";
import { Briefcase, CheckCircle2, XCircle, Copy } from "lucide-react";
import { StatCard, Panel } from "@/features/admin/ui";

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
      <section className="grid gap-3 md:grid-cols-3">
        <StatCard label="Total jobs" value={d?.totals.total ?? "—"} icon={Briefcase} />
        <StatCard label="Active jobs" value={d?.totals.active ?? "—"} icon={CheckCircle2} tone="success" />
        <StatCard label="Duplicates (sample)" value={d?.totals.duplicatesInSample ?? "—"} icon={Copy} />
      </section>

      <Panel title="Jobs per provider">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-elevated text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Enabled</th>
                <th className="px-3 py-2">Jobs</th>
                <th className="px-3 py-2">Last sync</th>
                <th className="px-3 py-2">Last error</th>
              </tr>
            </thead>
            <tbody>
              {(d?.sources ?? []).map((s: any) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <p className="font-medium">{s.display_name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{s.id}</p>
                  </td>
                  <td className="px-3 py-2">
                    {s.enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono">{d?.perProvider[s.id] ?? 0}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {s.last_run_at ? new Date(s.last_run_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-destructive">{s.last_error ?? "—"}</td>
                </tr>
              ))}
              {q.isLoading && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
