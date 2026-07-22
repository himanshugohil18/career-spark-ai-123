/**
 * Razorpay webhook receiver.
 * Verifies X-Razorpay-Signature before touching the DB.
 */
import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookSignature } from "@/lib/billing/razorpay.server";

export const Route = createFileRoute("/api/public/hooks/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const signature = request.headers.get("x-razorpay-signature") ?? "";
        if (!verifyWebhookSignature(raw, signature)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: any;
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        const event: string = payload?.event ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        try {
          if (event === "payment.captured" || event === "payment.failed") {
            const p = payload?.payload?.payment?.entity ?? {};
            await supabaseAdmin
              .from("payments")
              .update({
                status: event === "payment.captured" ? "captured" : "failed",
                payment_id: p.id ?? null,
                method: p.method ?? null,
              })
              .eq("order_id", p.order_id);

            if (event === "payment.captured" && p.order_id) {
              try {
                const { sendInvoiceEmailByOrderId } = await import("@/features/billing/send-invoice-email.server");
                const invoiceEmail = await sendInvoiceEmailByOrderId(p.order_id);
                if (!invoiceEmail.sent) {
                  console.error("[razorpay-webhook] invoice email not sent", invoiceEmail);
                }
              } catch (e) {
                console.error("[razorpay-webhook] invoice email failed", (e as Error).message);
              }
            }
          } else if (event === "subscription.cancelled" || event === "subscription.completed") {
            const s = payload?.payload?.subscription?.entity ?? {};
            await supabaseAdmin
              .from("subscriptions")
              .update({
                status: event === "subscription.cancelled" ? "cancelled" : "expired",
                cancelled_at: new Date().toISOString(),
              })
              .eq("razorpay_subscription_id", s.id);
          }
        } catch (err) {
          console.error("[razorpay-webhook] handler error", err);
          return new Response("Handler error", { status: 500 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
