import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAiUsageOverview } from "@/lib/admin.functions";
import { Sparkles, CheckCircle2, XCircle, Zap } from "lucide-react";
import { StatCard, Panel } from "@/features/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/ai")({
  component: AdminAI,
});

function AdminAI() {
  const q = useQuery({
    queryKey: ["admin-ai"],
    queryFn: () => getAiUsageOverview(),
    refetchInterval: 30_000,
  });
  const d = q.data;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-4">
        <StatCard label="Total requests" value={d?.totals.total ?? "—"} icon={Sparkles} />
        <StatCard label="Today" value={d?.totals.today ?? "—"} icon={Zap} />
        <StatCard label="Success rate" value={d ? `${d.totals.successRate}%` : "—"} icon={CheckCircle2} tone="success" />
        <StatCard label="Failed" value={d?.totals.failed ?? "—"} icon={XCircle} tone="danger" />
      </section>

      <Panel title="By feature">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-elevated text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Feature</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Failed</th>
                <th className="px-3 py-2">Success rate</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(d?.perKind ?? {}).map(([kind, s]: [string, any]) => {
                const rate = s.total > 0 ? Math.round(((s.total - s.failed) / s.total) * 1000) / 10 : 100;
                return (
                  <tr key={kind} className="border-t border-border">
                    <td className="px-3 py-2 capitalize">{kind.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2 font-mono">{s.total}</td>
                    <td className="px-3 py-2 font-mono text-destructive">{s.failed}</td>
                    <td className="px-3 py-2 font-mono">{rate}%</td>
                  </tr>
                );
              })}
              {q.isLoading && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
