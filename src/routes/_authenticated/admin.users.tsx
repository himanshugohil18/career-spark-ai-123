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

const IST = "Asia/Kolkata";

/** Exact date + time in IST, e.g. "23 Jul 2026, 10:47 AM IST". */
function fmtIST(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    d.toLocaleString("en-IN", {
      timeZone: IST,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }) + " IST"
  );
}

function relative(value?: string | null) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diff)) return "";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  email: "Email & password",
};

function MethodBadge({ method }: { method: string }) {
  const isGoogle = method === "google";
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        isGoogle
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-elevated text-muted-foreground"
      }`}
    >
      {PROVIDER_LABEL[method] ?? method}
    </span>
  );
}

function AdminUsers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [provider, setProvider] = useState<"all" | "google" | "manual">("all");
  const pageSize = 25;

  const q = useQuery({
    queryKey: ["admin-users", search, page, provider],
    queryFn: () => getUsersList({ data: { search, page, pageSize, provider } }),
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
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total users" value={d?.totals.users ?? "—"} icon={Users} />
        <StatCard label="Google sign-in" value={(d?.totals as any)?.googleUsers ?? "—"} icon={UserCheck} />
        <StatCard label="Manual (email)" value={(d?.totals as any)?.manualUsers ?? "—"} icon={UserPlus} />
        <StatCard label="Active today" value={d?.totals.activeToday ?? "—"} icon={UserCheck} tone="success" />
        <StatCard label="Active this week" value={d?.totals.activeWeek ?? "—"} icon={UserCheck} />
        <StatCard label="Active this month" value={d?.totals.activeMonth ?? "—"} icon={UserPlus} />
      </section>

      <Panel title="Auth provider breakdown">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          {Object.entries(d?.providers ?? {}).map(([p, n]) => (
            <span key={p} className="rounded-full border border-border bg-elevated px-2 py-1 font-mono text-[11px]">
              {PROVIDER_LABEL[p] ?? p}: <span className="font-semibold">{n as number}</span>
            </span>
          ))}
          {!d && <span className="text-xs text-muted-foreground">Loading…</span>}
        </div>
      </Panel>


      <Panel
        title="Users"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border border-border bg-elevated p-0.5">
              {([
                ["all", "All"],
                ["google", "Google"],
                ["manual", "Manual"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setPage(0);
                    setProvider(key);
                  }}
                  className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                    provider === key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
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
                <th className="px-3 py-2">Sign-in methods</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Apps</th>
                <th className="px-3 py-2">AI</th>
                <th className="px-3 py-2">Joined (IST)</th>
                <th className="px-3 py-2">Last login (IST)</th>
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
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {(u.methods ?? [u.provider]).map((m: string) => (
                        <MethodBadge key={m} method={m} />
                      ))}
                    </div>
                    {u.last_method && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        last via {PROVIDER_LABEL[u.last_method] ?? u.last_method}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2"><StatusPill status={u.plan} /></td>
                  <td className="px-3 py-2 text-[12px] text-muted-foreground">{u.preferred_role || u.current_title || "—"}</td>
                  <td className="px-3 py-2 font-mono text-[12px]">{u.applications}</td>
                  <td className="px-3 py-2 font-mono text-[12px]">{u.ai_generations}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {fmtIST(u.created_at)}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    <div>{fmtIST(u.last_sign_in_at)}</div>
                    {u.last_sign_in_at && (
                      <div className="text-[10px] opacity-70">{relative(u.last_sign_in_at)}</div>
                    )}
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
