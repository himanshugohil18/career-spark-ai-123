import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getProviderMonitoring } from "@/lib/admin.functions";
import { Panel, StatCard } from "@/features/admin/ui";
import { ExportBar } from "@/features/admin/ExportMenu";
import { CHART_COLORS } from "@/features/admin/report-pdf";
import { REGION_LABELS, COUNTRY_NAMES } from "@/lib/jobs/geo";
import { Radio, ShieldCheck, AlertTriangle, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/providers")({
  component: AdminProviders,
});

const PIE_COLORS = ["#2F5CFF", "#16A34A", "#D97706", "#DC2626", "#7C3AED", "#0891B2", "#DB2777", "#65A30D", "#475569"];

function ago(iso: string | null) {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

function AdminProviders() {
  const [filter, setFilter] = useState<"all" | "enabled" | "failing">("all");
  const q = useQuery({
    queryKey: ["admin-providers"],
    queryFn: () => getProviderMonitoring(),
    refetchInterval: 60_000,
  });
  const d = q.data;

  const providers = useMemo(() => {
    const list = d?.providers ?? [];
    if (filter === "enabled") return list.filter((p) => p.enabled);
    if (filter === "failing") return list.filter((p) => p.consecutiveFailures > 0 || p.health === "unhealthy");
    return list;
  }, [d, filter]);

  const regionData = (d?.regions ?? []).map((r) => ({
    name: REGION_LABELS[r.region as keyof typeof REGION_LABELS] ?? r.region,
    value: r.count,
  }));
  const countryData = (d?.topCountries ?? []).map((c) => ({
    name: COUNTRY_NAMES[c.code] ?? c.code,
    jobs: c.count,
  }));

  return (
    <div className="space-y-6">
      <ExportBar
        title="Job provider monitoring"
        description="Live crawl health, catalogue contribution and geography coverage per provider."
        filenameBase="careeros-providers"
        rows={providers as unknown as Record<string, unknown>[]}
        extra={
          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
            {(["all", "enabled", "failing"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  "px-2.5 py-1 text-[11px] font-medium capitalize transition-colors " +
                  (filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")
                }
              >
                {f}
              </button>
            ))}
          </div>
        }
        buildReport={() =>
          d
            ? {
                title: "Job Provider Monitoring Report",
                subtitle:
                  "Crawl reliability, catalogue contribution and geographic distribution across all configured job providers.",
                filters: { View: filter, Providers: providers.length, "Jobs added (24h)": d.summary.jobs24h },
                filename: "careeros-provider-report",
                kpis: [
                  { label: "Providers", value: String(d.summary.totalProviders) },
                  { label: "Enabled", value: String(d.summary.enabled), tone: "good" },
                  { label: "Healthy", value: String(d.summary.healthy), tone: "good" },
                  { label: "Degraded", value: String(d.summary.degraded) },
                  { label: "Failing", value: String(d.summary.failing), tone: d.summary.failing ? "bad" : "default" },
                  { label: "Jobs added (24h)", value: d.summary.jobs24h.toLocaleString() },
                ],
                barLists: [
                  {
                    title: "Active jobs by region",
                    items: regionData.map((r) => ({ label: r.name, value: r.value })),
                  },
                  {
                    title: "Active jobs by country (top 15)",
                    items: countryData.map((c) => ({ label: c.name, value: c.jobs })),
                    color: CHART_COLORS.green,
                  },
                  {
                    title: "Catalogue contribution by provider",
                    items: [...providers]
                      .sort((a, b) => b.activeJobs - a.activeJobs)
                      .slice(0, 12)
                      .map((p) => ({ label: p.name, value: p.activeJobs })),
                    color: CHART_COLORS.amber,
                  },
                ],
                tables: [
                  {
                    title: "Provider health matrix",
                    columns: ["Provider", "Tier", "Type", "On", "Health", "Active", "24h", "India", "Apply %", "Fails", "Last success"],
                    rows: providers.map((p) => [
                      p.name,
                      `T${p.tier}`,
                      p.sourceType,
                      p.enabled ? "yes" : "no",
                      p.health,
                      p.activeJobs,
                      p.jobs24h,
                      p.indiaJobs,
                      `${p.applyUrlCoverage}%`,
                      `${p.consecutiveFailures}/${p.failureCount}`,
                      ago(p.lastSuccessAt),
                    ]),
                  },
                ],
              }
            : null
        }
      />

      <section className="grid gap-3 md:grid-cols-4">
        <StatCard label="Providers" value={d?.summary.totalProviders ?? "—"} icon={Radio} />
        <StatCard label="Enabled" value={d?.summary.enabled ?? "—"} icon={ShieldCheck} tone="success" />
        <StatCard label="Failing" value={d?.summary.failing ?? "—"} icon={AlertTriangle} tone="danger" />
        <StatCard label="Jobs added (24h)" value={d?.summary.jobs24h ?? "—"} icon={Activity} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Panel title="Active jobs by region">
          <div className="h-72 w-full px-3 py-3">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={regionData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {regionData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Top countries by active jobs">
          <div className="h-72 w-full px-3 py-3">
            <ResponsiveContainer>
              <BarChart data={countryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-35} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="jobs" fill="#2F5CFF" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <Panel title={`Provider health matrix (${providers.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-elevated text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Health</th>
                <th className="px-3 py-2">Active jobs</th>
                <th className="px-3 py-2">24h</th>
                <th className="px-3 py-2">India</th>
                <th className="px-3 py-2">Apply URL</th>
                <th className="px-3 py-2">Fails</th>
                <th className="px-3 py-2">Last success</th>
                <th className="px-3 py-2">Last error</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <p className="font-medium">{p.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {p.id} · {p.sourceType}
                    </p>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">T{p.tier}</td>
                  <td className="px-3 py-2 text-[11px]">
                    <span
                      className={
                        p.health === "healthy"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : p.health === "degraded"
                            ? "text-amber-600 dark:text-amber-400"
                            : p.health === "unhealthy"
                              ? "text-destructive"
                              : "text-muted-foreground"
                      }
                    >
                      {p.enabled ? p.health : "disabled"}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono">{p.activeJobs.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono">{p.jobs24h}</td>
                  <td className="px-3 py-2 font-mono">{p.indiaJobs}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{p.applyUrlCoverage}%</td>
                  <td className="px-3 py-2 font-mono text-[11px]">
                    {p.consecutiveFailures}
                    <span className="text-muted-foreground"> / {p.failureCount}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{ago(p.lastSuccessAt)}</td>
                  <td className="max-w-[220px] truncate px-3 py-2 text-[11px] text-destructive" title={p.lastError ?? ""}>
                    {p.lastError ?? "—"}
                  </td>
                </tr>
              ))}
              {q.isLoading && (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">
                    Loading provider telemetry…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
