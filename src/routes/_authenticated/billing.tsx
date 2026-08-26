import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import {
  Check, Sparkles, Crown, Zap, Loader2, XCircle, CheckCircle2,
  Download, Eye, Search, FileText, PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/product/page-header";
import { supabase } from "@/integrations/supabase/client";
import {
  createCheckoutOrder,
  verifyPayment,
  getMySubscription,
  listMyPayments,
  cancelMySubscription,
  getInvoice,
} from "@/lib/billing.functions";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { loadRazorpay } from "@/lib/billing/use-razorpay";
import { buildInvoice } from "@/features/billing/invoice";
import { downloadInvoicePDF } from "@/features/billing/invoice-pdf";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Billing · CareerOS" }] }),
  component: BillingPage,
});

type PaymentRow = {
  id: string;
  created_at: string;
  plan: string | null;
  amount: number;
  status: string;
  receipt: string | null;
  invoice_number: string | null;
  method: string | null;
};

function BillingPage() {
  const qc = useQueryClient();
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);
  const [successPaymentId, setSuccessPaymentId] = useState<string | null>(null);

  // History filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const subQ = useQuery({ queryKey: ["my-subscription"], queryFn: () => getMySubscription() });
  const paysQ = useQuery({ queryKey: ["my-payments"], queryFn: () => listMyPayments() });

  const currentPlan: PlanId = subQ.data?.plan ?? "free";
  const isPremium = Boolean(subQ.data?.isPremium);
  const sub = subQ.data?.subscription;

  const payments: PaymentRow[] = (paysQ.data?.payments ?? []) as PaymentRow[];
  const years = useMemo(() => {
    const s = new Set<string>();
    payments.forEach((p) => s.add(new Date(p.created_at).getFullYear().toString()));
    return Array.from(s).sort().reverse();
  }, [payments]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return payments
      .filter((p) => {
        if (statusFilter !== "all" && p.status !== statusFilter) return false;
        if (yearFilter !== "all" && new Date(p.created_at).getFullYear().toString() !== yearFilter) return false;
        if (s) {
          const hay = `${p.invoice_number ?? ""} ${p.plan ?? ""} ${p.receipt ?? ""}`.toLowerCase();
          if (!hay.includes(s)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const av = new Date(a.created_at).getTime();
        const bv = new Date(b.created_at).getTime();
        return sortOrder === "newest" ? bv - av : av - bv;
      });
  }, [payments, statusFilter, yearFilter, sortOrder, search]);

  const cancel = useMutation({
    mutationFn: () => cancelMySubscription(),
    onSuccess: () => {
      toast.success("Subscription cancelled. Access remains until the end of the billing period.");
      void qc.invalidateQueries({ queryKey: ["my-subscription"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function downloadInvoice(paymentId: string) {
    try {
      const data = await getInvoice({ data: { paymentId } });
      const inv = buildInvoice({
        payment: data.payment as never,
        subscription: data.subscription as never,
        customer: data.customer as never,
      });
      downloadInvoicePDF(inv);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to build invoice");
    }
  }

  async function upgrade(plan: PlanId) {
    if (plan === "free") return;
    setBusyPlan(plan);
    try {
      await loadRazorpay();
      const order = await createCheckoutOrder({ data: { plan } });
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email ?? "";
      const name = (userData.user?.user_metadata?.display_name as string) ?? email;

      const paymentId: string = await new Promise<string>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "CareerOS",
          description: `${order.planName} plan — monthly`,
          order_id: order.orderId,
          prefill: { email, name },
          theme: { color: "#6366f1" },
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
          handler: async (resp: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const verification = await verifyPayment({
                data: {
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                  plan,
                },
              });
              if (verification.invoiceEmail && !verification.invoiceEmail.sent) {
                toast.warning(`Payment verified, but invoice email was not sent: ${verification.invoiceEmail.reason ?? "delivery failed"}`);
              }
              // Refresh payments then find the one for this order
              const paysRes = await listMyPayments();
              const match = (paysRes.payments as PaymentRow[]).find(
                (p) => (p as unknown as { order_id: string }).order_id === resp.razorpay_order_id,
              );
              resolve(match?.id ?? "");
            } catch (err) {
              reject(err);
            }
          },
        });
        rzp.on("payment.failed", (resp: { error?: { description?: string } }) => {
          reject(new Error(resp?.error?.description ?? "Payment failed"));
        });
        rzp.open();
      });

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["my-subscription"] }),
        qc.invalidateQueries({ queryKey: ["my-payments"] }),
      ]);
      if (paymentId) setSuccessPaymentId(paymentId);
      toast.success(`🎉 Welcome to ${PLANS[plan].name}! Premium unlocked.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg !== "Payment cancelled") toast.error(msg);
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-6 md:p-10">
      {successPaymentId && (
        <SuccessModal paymentId={successPaymentId} onClose={() => setSuccessPaymentId(null)} onDownload={downloadInvoice} />
      )}

      <PageHeader
        eyebrow="Billing"
        title="Plans & subscription"
        description="Manage your CareerOS subscription, download invoices, and review payment history."
      />

      {/* Current subscription */}
      <section className="surface-card p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-elevated text-primary">
            {isPremium ? <Crown className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Current plan</p>
            <div className="mt-0.5 flex items-center gap-2">
              <h2 className="font-display text-xl font-semibold">{PLANS[currentPlan].name}</h2>
              <span
                className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
                  isPremium ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {sub?.status ?? "free"}
              </span>
            </div>
            {sub?.expires_at && (
              <p className="mt-1 text-xs text-muted-foreground">
                {sub.status === "cancelled" ? "Access until" : "Renews on"}{" "}
                {new Date(sub.expires_at).toLocaleDateString()}
              </p>
            )}
          </div>
          {isPremium && sub?.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("Cancel your subscription? You keep access until the end of the current period.")) {
                  cancel.mutate();
                }
              }}
              disabled={cancel.isPending}
            >
              {cancel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel subscription"}
            </Button>
          )}
        </div>
      </section>

      {/* Plans */}
      <section className="grid gap-4 md:grid-cols-3">
        {(Object.values(PLANS) as (typeof PLANS)[PlanId][]).map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const busy = busyPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`surface-card relative p-6 ${
                plan.highlight ? "border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]" : ""
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary-foreground">
                  Most popular
                </span>
              )}
              <div className="flex items-center gap-2">
                {plan.id === "enterprise" ? <Zap className="h-4 w-4 text-primary" /> :
                  plan.id === "pro" ? <Crown className="h-4 w-4 text-primary" /> :
                  <Sparkles className="h-4 w-4 text-primary" />}
                <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="font-display text-3xl font-semibold">{plan.priceLabel}</span>
                <span className="text-xs text-muted-foreground">{plan.cadence}</span>
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground/85">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    <CheckCircle2 className="h-4 w-4" /> Current plan
                  </Button>
                ) : plan.id === "free" ? (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    Downgrade at renewal
                  </Button>
                ) : (
                  <Button
                    variant={plan.highlight ? "primary" : "secondary"}
                    size="sm"
                    className="w-full"
                    disabled={busy}
                    onClick={() => upgrade(plan.id)}
                  >
                    {busy ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Opening checkout…</>
                    ) : (
                      plan.cta
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Billing history */}
      <section className="surface-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Billing history</p>
            <h2 className="mt-1 font-display text-lg font-semibold">Invoices & payments</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search invoice, plan…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-56 pl-8"
              />
            </div>
            <FilterSelect value={statusFilter} onChange={setStatusFilter} options={[
              ["all", "All statuses"], ["captured", "Paid"], ["created", "Pending"],
              ["failed", "Failed"], ["refunded", "Refunded"],
            ]} />
            <FilterSelect value={yearFilter} onChange={setYearFilter} options={[
              ["all", "All years"], ...years.map((y) => [y, y] as [string, string]),
            ]} />
            <FilterSelect value={sortOrder} onChange={(v) => setSortOrder(v as "newest" | "oldest")} options={[
              ["newest", "Newest first"], ["oldest", "Oldest first"],
            ]} />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-elevated text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Invoice #</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Tax</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-2 h-6 w-6 opacity-50" />
                    No invoices match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const tax = Math.round(p.amount - p.amount / 1.18);
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-[11px]">{p.invoice_number ?? "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2 capitalize">{p.plan ?? "—"}</td>
                      <td className="px-3 py-2">₹{(p.amount / 100).toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2 text-muted-foreground">₹{(tax / 100).toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2">
                        {p.status === "captured" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </span>
                        ) : p.status === "failed" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                            <XCircle className="h-3 w-3" /> Failed
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                            {p.status}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{p.method ?? "Razorpay"}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {p.status === "captured" && p.invoice_number ? (
                            <>
                              <Link to="/invoice/$paymentId" params={{ paymentId: p.id }}>
                                <Button variant="ghost" size="sm" className="h-7 px-2">
                                  <Eye className="h-3.5 w-3.5" /> View
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => downloadInvoice(p.id)}
                              >
                                <Download className="h-3.5 w-3.5" /> PDF
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function FilterSelect({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}

function SuccessModal({
  paymentId, onClose, onDownload,
}: { paymentId: string; onClose: () => void; onDownload: (id: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10">
          <PartyPopper className="h-8 w-8 text-emerald-500" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold">Payment Successful</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Thank you for your purchase. Your invoice is ready.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button variant="primary" size="default" onClick={() => onDownload(paymentId)}>
            <Download className="h-4 w-4" /> Download Invoice (PDF)
          </Button>
          <Link to="/invoice/$paymentId" params={{ paymentId }}>
            <Button variant="secondary" size="default" className="w-full">
              <Eye className="h-4 w-4" /> View Invoice
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline" size="default" className="w-full" onClick={onClose}>
              Go to Dashboard
            </Button>
          </Link>
          <button className="mt-1 text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={onClose}>
            View billing history
          </button>
        </div>
      </div>
    </div>
  );
}
