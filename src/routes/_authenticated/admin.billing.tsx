import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getBillingOverview, exportAdminTable } from "@/lib/admin.functions";
import { getInvoice } from "@/lib/billing.functions";
import { CreditCard, TrendingUp, CheckCircle2, XCircle, Crown, Sparkles, Download, Zap, Eye } from "lucide-react";
import { StatCard, Panel, money, StatusPill } from "@/features/admin/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { downloadCSV, downloadXLSX } from "@/features/admin/export";
import { ExportBar } from "@/features/admin/ExportMenu";
import { buildInvoice } from "@/features/billing/invoice";
import { downloadInvoicePDF } from "@/features/billing/invoice-pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/billing")({
  component: AdminBilling,
});

function AdminBilling() {
  const q = useQuery({
    queryKey: ["admin-billing"],
    queryFn: () => getBillingOverview(),
    refetchInterval: 30_000,
  });
  const [search, setSearch] = useState("");

  async function exportRows(kind: "csv" | "xlsx", table: "payments" | "subscriptions") {
    const res = await exportAdminTable({ data: { table } });
    const name = `${table}-${new Date().toISOString().slice(0, 10)}.${kind}`;
    if (kind === "csv") downloadCSV(name, res.rows as any);
    else downloadXLSX(name, res.rows as any);
  }

  const d = q.data;
  const filtered = (d?.recentPayments ?? []).filter((p: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.email?.toLowerCase().includes(s) ||
      p.order_id?.toLowerCase().includes(s) ||
      p.payment_id?.toLowerCase().includes(s) ||
      p.plan?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <ExportBar
        title="Billing & revenue"
        description="Revenue totals, subscription mix and recent payment activity."
        filenameBase="careeros-billing"
        buildReport={() =>
          d
            ? {
                title: "Billing & Revenue Report",
                subtitle: "Revenue performance, plan distribution and recent payment ledger.",
                filters: { Search: search || "none", "Payments listed": filtered.length },
                filename: "careeros-billing-report",
                kpis: [
                  { label: "Total revenue", value: money(d.revenue.totalPaise), tone: "good" },
                  { label: "Revenue (30 days)", value: money(d.revenue.monthPaise), tone: "good" },
                  { label: "Revenue today", value: money(d.revenue.todayPaise) },
                  { label: "Active subscriptions", value: String(d.subscriptions.active), tone: "good" },
                  { label: "Captured payments", value: String(d.counts.captured), tone: "good" },
                  { label: "Failed payments", value: String(d.counts.failed), tone: d.counts.failed ? "bad" : "default" },
                  { label: "Refunded", value: String(d.counts.refunded) },
                  { label: "Cancelled subs", value: String(d.subscriptions.cancelled) },
                ],
                barLists: [
                  {
                    title: "Active subscriptions by plan",
                    items: Object.entries(d.subscriptions.planCounts ?? {}).map(([k, v]) => ({
                      label: k,
                      value: v as number,
                    })),
                  },
                ],
                tables: [
                  {
                    title: "Recent payments",
                    columns: ["Invoice", "Customer", "Plan", "Amount", "Status", "Date"],
                    rows: filtered.map((p: any) => [
                      p.invoice_number ?? p.order_id ?? "—",
                      p.email ?? p.user_id,
                      p.plan,
                      money(p.amount),
                      p.status,
                      new Date(p.created_at).toLocaleString(),
                    ]),
                  },
                ],
              }
            : null
        }
      />
      <section className="grid gap-3 md:grid-cols-4">
        <StatCard label="Total revenue" value={d ? money(d.revenue.totalPaise) : "—"} icon={TrendingUp} tone="success" />
        <StatCard label="Revenue today" value={d ? money(d.revenue.todayPaise) : "—"} icon={TrendingUp} />
        <StatCard label="Revenue (30d)" value={d ? money(d.revenue.monthPaise) : "—"} icon={TrendingUp} tone="success" />
        <StatCard label="Active subscriptions" value={d?.subscriptions.active ?? "—"} icon={CreditCard} tone="success" />
        <StatCard label="Captured" value={d?.counts.captured ?? "—"} icon={CheckCircle2} tone="success" />
        <StatCard label="Failed" value={d?.counts.failed ?? "—"} icon={XCircle} tone="danger" />
        <StatCard label="Refunded" value={d?.counts.refunded ?? "—"} icon={XCircle} />
        <StatCard label="Cancelled" value={d?.subscriptions.cancelled ?? "—"} icon={XCircle} />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard label="Free" value={d?.subscriptions.planCounts.free ?? 0} icon={Sparkles} />
        <StatCard label="Pro" value={d?.subscriptions.planCounts.pro ?? 0} icon={Crown} tone="success" />
        <StatCard label="Enterprise" value={d?.subscriptions.planCounts.enterprise ?? 0} icon={Zap} tone="success" />
      </section>

      <Panel
        title="Recent payments"
        action={
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search email / order / payment id"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-72"
            />
            <Button variant="outline" size="sm" onClick={() => exportRows("csv", "payments")}>
              <Download className="h-3.5 w-3.5" /> Payments CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportRows("xlsx", "payments")}>
              <Download className="h-3.5 w-3.5" /> XLSX
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportRows("csv", "subscriptions")}>
              <Download className="h-3.5 w-3.5" /> Subs CSV
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-elevated text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Order ID</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {q.isLoading && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!q.isLoading && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No payments.</td></tr>
              )}
              {filtered.map((p: any) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-[11px]">{p.invoice_number ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">
                    {new Date(p.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <p className="text-[13px]">{p.full_name || "—"}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{p.email}</p>
                  </td>
                  <td className="px-3 py-2 capitalize">{p.plan ?? "—"}</td>
                  <td className="px-3 py-2 font-mono">₹{(p.amount / 100).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2"><StatusPill status={p.status} /></td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{p.order_id}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {p.status === "captured" && p.invoice_number ? (
                        <>
                          <Link to="/invoice/$paymentId" params={{ paymentId: p.id }}>
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={async () => {
                              try {
                                const inv = await getInvoice({ data: { paymentId: p.id } });
                                downloadInvoicePDF(buildInvoice({
                                  payment: inv.payment as never,
                                  subscription: inv.subscription as never,
                                  customer: inv.customer as never,
                                }));
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : "Failed");
                              }
                            }}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
