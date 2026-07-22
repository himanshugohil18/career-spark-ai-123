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
                // Load fresh payment row (webhook UPDATE above may have set
                // invoice_number via trigger) and dispatch Brevo email.
                const { data: pay } = await supabaseAdmin
                  .from("payments")
                  .select("*")
                  .eq("order_id", p.order_id)
                  .maybeSingle();
                if (pay) {
                  const { data: profile } = await supabaseAdmin
                    .from("profiles")
                    .select("email, full_name")
                    .eq("user_id", pay.user_id)
                    .maybeSingle();
                  let email: string | null = profile?.email ?? null;
                  if (!email) {
                    try {
                      const { data: userRes } = await (supabaseAdmin as any).auth.admin.getUserById(
                        pay.user_id,
                      );
                      email = userRes?.user?.email ?? null;
                    } catch {
                      /* ignore */
                    }
                  }
                  if (email) {
                    const { sendPaymentSuccessEmail } = await import(
                      "@/lib/email/senders.server"
                    );
                    const amount = (Number(pay.amount) / 100).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    });
                    const planName =
                      (pay.notes && typeof pay.notes === "object" && (pay.notes as any).plan_name) ||
                      "CareerOS Subscription";
                    await sendPaymentSuccessEmail(email, {
                      invoiceNumber: pay.invoice_number ?? p.order_id,
                      planName,
                      amountFormatted: `₹${amount}`,
                      currency: String(pay.currency ?? "INR"),
                      transactionId: String(pay.payment_id ?? p.id ?? ""),
                      when: new Date(pay.invoice_issued_at ?? Date.now()).toUTCString(),
                      dashboardUrl: "https://careerosai.site/dashboard",
                      invoiceUrl: `https://careerosai.site/billing`,
                    });
                  }
                }
              } catch (e) {
                console.error("[razorpay-webhook] payment email failed", (e as Error).message);
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
