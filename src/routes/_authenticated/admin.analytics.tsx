import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAnalyticsSeries } from "@/lib/admin.functions";
import { Panel } from "@/features/admin/ui";
import { ExportBar } from "@/features/admin/ExportMenu";
import { CHART_COLORS } from "@/features/admin/report-pdf";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AdminAnalytics,
});

function AdminAnalytics() {
  const q = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => getAnalyticsSeries(),
    refetchInterval: 60_000,
  });
  const data = q.data?.series ?? [];

  return (
    <div className="space-y-6">
      <ExportBar
        title="Growth analytics"
        description="30-day trends for signups, AI usage, applications, revenue and job discovery."
        filenameBase="careeros-analytics"
        rows={data as unknown as Record<string, unknown>[]}
        buildReport={() =>
          data.length
            ? {
                title: "Growth & Performance Report",
                subtitle: "Daily platform trends over the last 30 days.",
                filters: { Window: "Last 30 days", "Data points": data.length },
                filename: "careeros-growth-report",
                kpis: [
                  { label: "Signups (30d)", value: String(data.reduce((n, r: any) => n + r.signups, 0)) },
                  { label: "AI requests (30d)", value: String(data.reduce((n, r: any) => n + r.ai, 0)) },
                  { label: "Applications (30d)", value: String(data.reduce((n, r: any) => n + r.applications, 0)) },
                  { label: "Revenue (30d)", value: `₹${data.reduce((n, r: any) => n + r.revenue, 0).toLocaleString()}`, tone: "good" },
                  { label: "Jobs discovered (30d)", value: data.reduce((n, r: any) => n + r.jobs, 0).toLocaleString() },
                  { label: "Peak signups / day", value: String(Math.max(...data.map((r: any) => r.signups))) },
                ],
                charts: [
                  {
                    title: "Signups, AI usage and applications",
                    type: "line",
                    labels: data.map((r: any) => r.date.slice(5)),
                    series: [
                      { key: "signups", label: "Signups", color: CHART_COLORS.blue },
                      { key: "ai", label: "AI requests", color: CHART_COLORS.green },
                      { key: "applications", label: "Applications", color: CHART_COLORS.amber },
                    ],
                    rows: data as any,
                  },
                  {
                    title: "Revenue per day (₹)",
                    type: "bar",
                    labels: data.map((r: any) => r.date.slice(5)),
                    series: [{ key: "revenue", label: "Revenue", color: CHART_COLORS.blue }],
                    rows: data as any,
                  },
                  {
                    title: "Jobs discovered per day",
                    type: "bar",
                    labels: data.map((r: any) => r.date.slice(5)),
                    series: [{ key: "jobs", label: "Jobs", color: CHART_COLORS.green }],
                    rows: data as any,
                  },
                ],
                tables: [
                  {
                    title: "Daily detail",
                    columns: ["Date", "Signups", "AI", "Applications", "Jobs", "Revenue (₹)"],
                    rows: data.map((r: any) => [r.date, r.signups, r.ai, r.applications, r.jobs, r.revenue]),
                  },
                ],
              }
            : null
        }
      />
      <Panel title="Signups & AI usage (30 days)">
        <div className="h-72 w-full px-3 py-3">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Line type="monotone" dataKey="signups" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ai" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="applications" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Revenue (₹) per day">
        <div className="h-72 w-full px-3 py-3">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Jobs discovered per day">
        <div className="h-64 w-full px-3 py-3">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="jobs" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}
