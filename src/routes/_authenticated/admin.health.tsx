import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSystemHealth } from "@/lib/admin.functions";
import { Panel, StatusPill } from "@/features/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/health")({
  component: AdminHealth,
});

function AdminHealth() {
  const q = useQuery({
    queryKey: ["admin-health"],
    queryFn: () => getSystemHealth(),
    refetchInterval: 15_000,
  });

  return (
    <div className="space-y-6">
      <Panel title="System health">
        <ul className="divide-y divide-border">
          {(q.data?.services ?? []).map((s: any) => (
            <li key={s.name} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[13px] font-medium">{s.name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{s.detail}</p>
              </div>
              <StatusPill status={s.status} />
            </li>
          ))}
          {q.isLoading && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Checking…</li>}
        </ul>
      </Panel>
    </div>
  );
}
