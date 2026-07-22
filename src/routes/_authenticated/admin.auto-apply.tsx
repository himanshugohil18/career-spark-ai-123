import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAutoApplyOverview } from "@/lib/admin.functions";
import { Bot, PlayCircle, CheckCircle2, XCircle, PauseCircle } from "lucide-react";
import { StatCard, Panel, StatusPill } from "@/features/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/auto-apply")({
  component: AdminAutoApply,
});

function AdminAutoApply() {
  const q = useQuery({
    queryKey: ["admin-auto-apply"],
    queryFn: () => getAutoApplyOverview(),
    refetchInterval: 15_000,
  });
  const d = q.data;
  const s = d?.perStatus ?? {};

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-4">
        <StatCard label="Running" value={s.running ?? 0} icon={PlayCircle} tone="success" />
        <StatCard label="Completed" value={s.completed ?? 0} icon={CheckCircle2} tone="success" />
        <StatCard label="Failed" value={s.failed ?? 0} icon={XCircle} tone="danger" />
        <StatCard label="Paused" value={s.paused ?? 0} icon={PauseCircle} />
        <StatCard label="Awaiting approval" value={s.awaiting_approval ?? s.needs_review ?? 0} icon={Bot} />
        <StatCard label="Submitted" value={s.submitted ?? 0} icon={CheckCircle2} tone="success" />
        <StatCard label="Cancelled" value={s.cancelled ?? 0} icon={XCircle} />
        <StatCard label="Queued" value={s.queued ?? s.pending ?? 0} icon={Bot} />
      </section>

      <Panel title="Recent sessions">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-elevated text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Started</th>
                <th className="px-3 py-2">Step</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Finished</th>
                <th className="px-3 py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {(d?.recent ?? []).map((r: any) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-[11px]">
                    {new Date(r.started_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-[12px]">{r.current_step ?? "—"}</td>
                  <td className="px-3 py-2"><StatusPill status={r.status} /></td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {r.finished_at ? new Date(r.finished_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-destructive line-clamp-2">{r.error ?? "—"}</td>
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
