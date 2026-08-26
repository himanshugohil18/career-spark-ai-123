import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSystemHealth, getErrorMonitoring } from "@/lib/admin.functions";
import { Panel, StatusPill, StatCard } from "@/features/admin/ui";
import { ExportBar } from "@/features/admin/ExportMenu";
import { CHART_COLORS } from "@/features/admin/report-pdf";
import { AlertTriangle, Bot, CreditCard, Mail, Radio } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/health")({
  component: AdminHealth,
});

function when(v?: string | null) {
  return v ? new Date(v).toLocaleString() : "—";
}

function ErrorList({
  title,
  icon: Icon,
  rows,
  primary,
  secondary,
  time,
}: {
  title: string;
  icon: typeof Bot;
  rows: any[];
  primary: (r: any) => string;
  secondary: (r: any) => string;
  time: (r: any) => string | null;
}) {
  return (
    <Panel title={title}>
      <div className="max-h-[320px] overflow-y-auto">
        {rows.length === 0 ? (
          <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
            <Icon className="h-4 w-4" /> No incidents recorded.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r, i) => (
              <li key={r.id ?? i} className="px-4 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate text-[13px] font-medium">{primary(r)}</p>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{when(time(r))}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-destructive">{secondary(r)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

function AdminHealth() {
  const health = useQuery({
    queryKey: ["admin-health"],
    queryFn: () => getSystemHealth(),
    refetchInterval: 15_000,
  });
  const errors = useQuery({
    queryKey: ["admin-errors"],
    queryFn: () => getErrorMonitoring(),
    refetchInterval: 30_000,
  });
  const e = errors.data;
  const services = health.data?.services ?? [];

  return (
    <div className="space-y-6">
      <ExportBar
        title="System health & error monitoring"
        description="Live service checks plus recent AI, session, payment, email and crawler incidents."
        filenameBase="careeros-health"
        buildReport={() =>
          e
            ? {
                title: "System Health & Error Audit",
                subtitle:
                  "Service availability checks and recent failure incidents across AI, automation, billing, email and job crawling.",
                filename: "careeros-health-audit",
                kpis: [
                  { label: "Services checked", value: String(services.length) },
                  {
                    label: "Services degraded",
                    value: String(services.filter((s: any) => s.status !== "ok" && s.status !== "healthy").length),
                    tone: services.some((s: any) => s.status !== "ok" && s.status !== "healthy") ? "bad" : "good",
                  },
                  { label: "AI failures", value: String(e.counts.aiFailed), tone: e.counts.aiFailed ? "bad" : "good" },
                  { label: "AI failures (24h)", value: String(e.counts.aiFailed24h) },
                  { label: "Sessions failed", value: String(e.counts.sessionsFailed) },
                  { label: "Payments not captured", value: String(e.counts.paymentsNotCaptured) },
                  { label: "Emails failed", value: String(e.counts.emailsFailed) },
                  { label: "Failing providers", value: String(e.counts.failingProviders), tone: e.counts.failingProviders ? "bad" : "good" },
                ],
                barLists: [
                  {
                    title: "Incident volume by category",
                    items: [
                      { label: "AI generations", value: e.counts.aiFailed },
                      { label: "Auto-apply sessions", value: e.counts.sessionsFailed },
                      { label: "Payments", value: e.counts.paymentsNotCaptured },
                      { label: "Emails", value: e.counts.emailsFailed },
                      { label: "Job providers", value: e.counts.failingProviders },
                    ],
                    color: CHART_COLORS.red,
                  },
                ],
                tables: [
                  {
                    title: "Service checks",
                    columns: ["Service", "Status", "Detail"],
                    rows: services.map((s: any) => [s.name, s.status, s.detail ?? "—"]),
                  },
                  {
                    title: "Recent AI generation failures",
                    columns: ["Feature", "Error", "When"],
                    rows: e.aiFailures.map((r: any) => [r.kind, (r.error ?? "—").slice(0, 90), when(r.created_at)]),
                  },
                  {
                    title: "Failing job providers",
                    columns: ["Provider", "Health", "Consecutive fails", "Last error", "Last attempt"],
                    rows: e.providerFailures.map((r: any) => [
                      r.display_name ?? r.id,
                      r.health_status ?? "—",
                      r.consecutive_failures ?? 0,
                      (r.last_error ?? "—").slice(0, 70),
                      when(r.last_attempt_at),
                    ]),
                  },
                  {
                    title: "Payments not captured",
                    columns: ["Plan", "Amount (paise)", "Status", "When"],
                    rows: e.paymentFailures.map((r: any) => [r.plan, r.amount, r.status, when(r.created_at)]),
                  },
                ],
              }
            : null
        }
      />

      <section className="grid gap-3 md:grid-cols-4">
        <StatCard label="AI failures" value={e?.counts.aiFailed ?? "—"} icon={AlertTriangle} tone="danger" />
        <StatCard label="Sessions failed" value={e?.counts.sessionsFailed ?? "—"} icon={Bot} tone="warn" />
        <StatCard label="Payments pending" value={e?.counts.paymentsNotCaptured ?? "—"} icon={CreditCard} tone="warn" />
        <StatCard label="Failing providers" value={e?.counts.failingProviders ?? "—"} icon={Radio} tone="danger" />
      </section>

      <Panel title="System health">
        <ul className="divide-y divide-border">
          {services.map((s: any) => (
            <li key={s.name} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[13px] font-medium">{s.name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{s.detail}</p>
              </div>
              <StatusPill status={s.status} />
            </li>
          ))}
          {health.isLoading && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Checking…</li>}
        </ul>
      </Panel>

      <section className="grid gap-4 md:grid-cols-2">
        <ErrorList
          title="Recent AI generation failures"
          icon={AlertTriangle}
          rows={e?.aiFailures ?? []}
          primary={(r) => String(r.kind).replace(/_/g, " ")}
          secondary={(r) => r.error ?? "Unknown error"}
          time={(r) => r.created_at}
        />
        <ErrorList
          title="Failed auto-apply sessions"
          icon={Bot}
          rows={e?.sessionFailures ?? []}
          primary={(r) => r.current_step ?? "session"}
          secondary={(r) => r.error ?? "Unknown error"}
          time={(r) => r.started_at}
        />
        <ErrorList
          title="Failing job providers"
          icon={Radio}
          rows={e?.providerFailures ?? []}
          primary={(r) => `${r.display_name ?? r.id} · ${r.consecutive_failures} consecutive fails`}
          secondary={(r) => r.last_error ?? "No error message"}
          time={(r) => r.last_attempt_at}
        />
        <ErrorList
          title="Email delivery issues"
          icon={Mail}
          rows={e?.emailFailures ?? []}
          primary={(r) => `${r.template ?? "email"} · ${r.status}`}
          secondary={(r) => r.error ?? "Not delivered"}
          time={(r) => r.created_at}
        />
      </section>
    </div>
  );
}
