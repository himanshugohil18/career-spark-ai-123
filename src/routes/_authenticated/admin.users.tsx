import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getUsersList, exportAdminTable } from "@/lib/admin.functions";
import { Users, UserCheck, UserPlus, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { StatCard, Panel, StatusPill } from "@/features/admin/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { downloadCSV, downloadXLSX } from "@/features/admin/export";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const q = useQuery({
    queryKey: ["admin-users", search, page],
    queryFn: () => getUsersList({ data: { search, page, pageSize } }),
    refetchInterval: 60_000,
  });

  async function exportRows(kind: "csv" | "xlsx") {
    const res = await exportAdminTable({ data: { table: "users" } });
    const name = `users-${new Date().toISOString().slice(0, 10)}.${kind}`;
    if (kind === "csv") downloadCSV(name, res.rows as any);
    else downloadXLSX(name, res.rows as any);
  }

  const d = q.data;
  const totalPages = d ? Math.max(1, Math.ceil(d.total / pageSize)) : 1;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-4">
        <StatCard label="Total users" value={d?.totals.users ?? "—"} icon={Users} />
        <StatCard label="Active today" value={d?.totals.activeToday ?? "—"} icon={UserCheck} tone="success" />
        <StatCard label="Active this week" value={d?.totals.activeWeek ?? "—"} icon={UserCheck} />
        <StatCard label="Active this month" value={d?.totals.activeMonth ?? "—"} icon={UserPlus} />
      </section>

      <Panel title="Auth provider breakdown">
        <div className="flex flex-wrap gap-2 px-4 py-3">
          {Object.entries(d?.providers ?? {}).map(([p, n]) => (
            <span key={p} className="rounded-full border border-border bg-elevated px-2 py-1 font-mono text-[11px]">
              {p}: <span className="font-semibold">{n as number}</span>
            </span>
          ))}
          {!d && <span className="text-xs text-muted-foreground">Loading…</span>}
        </div>
      </Panel>

      <Panel
        title="Users"
        action={
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search name / email / role"
              value={search}
              onChange={(e) => {
                setPage(0);
                setSearch(e.target.value);
              }}
              className="h-8 w-64"
            />
            <Button variant="outline" size="sm" onClick={() => exportRows("csv")}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportRows("xlsx")}>
              <Download className="h-3.5 w-3.5" /> XLSX
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-elevated text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Apps</th>
                <th className="px-3 py-2">AI</th>
                <th className="px-3 py-2">Joined</th>
                <th className="px-3 py-2">Last login</th>
              </tr>
            </thead>
            <tbody>
              {q.isLoading && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!q.isLoading && (d?.rows ?? []).length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No users found.</td></tr>
              )}
              {(d?.rows ?? []).map((u: any) => (
                <tr key={u.user_id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-6 w-6 rounded-full" />
                      ) : (
                        <div className="grid h-6 w-6 place-items-center rounded-full bg-elevated text-[10px] font-semibold">
                          {(u.full_name || u.email || "?").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">{u.full_name || "—"}</p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">{u.provider}</td>
                  <td className="px-3 py-2"><StatusPill status={u.plan} /></td>
                  <td className="px-3 py-2 text-[12px] text-muted-foreground">{u.preferred_role || u.current_title || "—"}</td>
                  <td className="px-3 py-2 font-mono text-[12px]">{u.applications}</td>
                  <td className="px-3 py-2 font-mono text-[12px]">{u.ai_generations}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[12px] text-muted-foreground">
          <span>{d?.total ?? 0} users</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="font-mono">{page + 1} / {totalPages}</span>
            <Button variant="ghost" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
