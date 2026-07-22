import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Printer, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInvoice } from "@/lib/billing.functions";
import { buildInvoice, formatINR } from "@/features/billing/invoice";
import { downloadInvoicePDF, printInvoicePDF } from "@/features/billing/invoice-pdf";
import { COMPANY } from "@/features/billing/company";

export const Route = createFileRoute("/_authenticated/invoice/$paymentId")({
  head: () => ({ meta: [{ title: "Invoice · CareerOS" }] }),
  component: InvoicePage,
});

function InvoicePage() {
  const { paymentId } = Route.useParams();
  const router = useRouter();
  const q = useQuery({
    queryKey: ["invoice", paymentId],
    queryFn: () => getInvoice({ data: { paymentId } }),
    retry: 0,
  });

  if (q.isLoading) return <div className="p-10 text-sm text-muted-foreground">Loading invoice…</div>;
  if (q.error || !q.data)
    return (
      <div className="p-10">
        <p className="text-sm text-destructive">{(q.error as Error)?.message ?? "Invoice not found."}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => router.history.back()}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>
    );

  const inv = buildInvoice({
    payment: q.data.payment as never,
    subscription: q.data.subscription as never,
    customer: q.data.customer as never,
  });
  const paid = inv.status === "captured";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6 md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button variant="outline" size="sm" onClick={() => router.history.back()}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => printInvoicePDF(inv)}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="primary" size="sm" onClick={() => downloadInvoicePDF(inv)}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      {/* On-screen invoice — mirrors the PDF structure */}
      <div className="rounded-2xl border border-border bg-white p-10 text-neutral-900 shadow-sm print:shadow-none">
        <header className="flex items-start justify-between border-b border-neutral-200 pb-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-indigo-500 font-display text-lg font-bold text-white">C</div>
            <div>
              <h2 className="font-display text-xl font-semibold">{COMPANY.name}</h2>
              <p className="text-xs text-neutral-500">{COMPANY.tagline}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl font-bold tracking-tight">INVOICE</p>
            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white ${
                paid ? "bg-emerald-500" : "bg-neutral-400"
              }`}
            >
              {paid ? "Paid" : inv.status}
            </span>
          </div>
        </header>

        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-3 text-sm">
            <Meta label="Invoice Number" value={inv.invoiceNumber} />
            <Meta label="Issue Date" value={new Date(inv.issueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
            <Meta label="Payment Date" value={new Date(inv.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{COMPANY.name}</p>
            <p className="text-neutral-600">{COMPANY.address}</p>
            <p className="text-neutral-600">{COMPANY.email}</p>
            <p className="text-neutral-600">{COMPANY.website.replace("https://", "")}</p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Billed To</p>
            <p className="mt-2 text-base font-semibold">{inv.customer.full_name || inv.customer.email || "Customer"}</p>
            {inv.customer.email && <p className="text-sm text-neutral-600">{inv.customer.email}</p>}
            {inv.customer.location && <p className="text-sm text-neutral-600">{inv.customer.location}</p>}
            <p className="mt-2 font-mono text-[11px] text-neutral-400">User ID: {inv.customer.user_id.slice(0, 8)}…</p>
          </div>
          <div className="md:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Payment</p>
            <div className="mt-2 space-y-1 text-sm">
              <p><span className="text-neutral-500">Method:</span> Razorpay</p>
              <p><span className="text-neutral-500">Order ID:</span> <span className="font-mono text-[11px]">{inv.payment.order_id}</span></p>
              <p><span className="text-neutral-500">Payment ID:</span> <span className="font-mono text-[11px]">{inv.payment.payment_id ?? "—"}</span></p>
            </div>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-lg border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-[10px] uppercase tracking-widest text-neutral-500">
              <tr>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-neutral-200">
                <td className="px-4 py-3">CareerOS {inv.plan.name} — Monthly subscription</td>
                <td className="px-4 py-3 text-center">{inv.amounts.quantity}</td>
                <td className="px-4 py-3 text-right">{formatINR(inv.amounts.unitPricePaise)}</td>
                <td className="px-4 py-3 text-right">{formatINR(inv.amounts.subtotalPaise)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mt-6 ml-auto w-full max-w-xs space-y-2 text-sm">
          <Row label="Subtotal" value={formatINR(inv.amounts.subtotalPaise)} />
          <Row label="GST (18%)" value={formatINR(inv.amounts.taxPaise)} />
          <div className="border-t border-neutral-200 pt-2">
            <Row label="Total (INR)" value={formatINR(inv.amounts.grandTotalPaise)} strong />
          </div>
        </section>

        <section className="mt-8">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
            Included in {inv.plan.name}
          </p>
          <ul className="mt-3 grid gap-1.5 text-sm md:grid-cols-2">
            {inv.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span className="text-neutral-700">{f}</span>
              </li>
            ))}
          </ul>
        </section>

        {inv.subscription && (
          <section className="mt-8 border-t border-neutral-200 pt-6">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Subscription</p>
            <div className="mt-3 grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
              <p><span className="text-neutral-500">Plan:</span> {inv.plan.name}</p>
              <p><span className="text-neutral-500">Cycle:</span> Monthly</p>
              <p><span className="text-neutral-500">Started:</span> {inv.subscription.started_at ? new Date(inv.subscription.started_at).toLocaleDateString("en-IN") : "—"}</p>
              <p><span className="text-neutral-500">Renews:</span> {inv.subscription.expires_at ? new Date(inv.subscription.expires_at).toLocaleDateString("en-IN") : "—"}</p>
              <p><span className="text-neutral-500">Status:</span> <span className="capitalize">{inv.subscription.status}</span></p>
            </div>
          </section>
        )}

        <footer className="mt-10 border-t border-neutral-200 pt-6 text-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-semibold">Thank you for choosing CareerOS.</p>
              <p className="text-neutral-600">Questions? {COMPANY.supportEmail}</p>
            </div>
            <p className="text-xs text-neutral-400">{COMPANY.website.replace("https://", "")}</p>
          </div>
        </footer>
      </div>

      <div className="text-center text-xs text-muted-foreground print:hidden">
        <Link to="/billing" className="underline underline-offset-4 hover:text-foreground">
          Back to billing history
        </Link>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">{label}</p>
      <p className="mt-0.5 font-semibold">{value}</p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold text-neutral-900" : "text-neutral-500"}>{label}</span>
      <span className={strong ? "text-base font-bold" : ""}>{value}</span>
    </div>
  );
}
