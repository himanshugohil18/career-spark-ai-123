/**
 * Razorpay webhook receiver.
 * Verifies X-Razorpay-Signature before touching the DB, then dispatches
 * branded transactional emails for every payment/subscription lifecycle
 * event via Brevo (senders.server). All email sends are best-effort and
 * never break webhook acknowledgement.
 */
import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookSignature } from "@/lib/billing/razorpay.server";

async function resolveEmailForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  userId: string | null | undefined,
): Promise<{ email: string | null; name: string | null }> {
  if (!userId) return { email: null, name: null };
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, full_name")
    .eq("user_id", userId)
    .maybeSingle();
  let email: string | null = profile?.email ?? null;
  let name: string | null = profile?.full_name ?? null;
  if (!email) {
    try {
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(userId);
      email = userRes?.user?.email ?? null;
      name = name ?? userRes?.user?.user_metadata?.full_name ?? null;
    } catch {
      /* ignore */
    }
  }
  return { email, name };
}

function paiseToInr(paise: unknown): string {
  const n = Number(paise) || 0;
  return `₹${(n / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export const Route = createFileRoute("/api/public/hooks/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const signature = request.headers.get("x-razorpay-signature") ?? "";
        if (!verifyWebhookSignature(raw, signature)) {
          return new Response("Invalid signature", { status: 401 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let payload: any;
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        const event: string = payload?.event ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        try {
          // -------- Payments --------
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

            const { data: pay } = await supabaseAdmin
              .from("payments")
              .select("*")
              .eq("order_id", p.order_id)
              .maybeSingle();

            if (pay) {
              const { email } = await resolveEmailForUser(supabaseAdmin, pay.user_id);
              const planName =
                (pay.notes && typeof pay.notes === "object" && (pay.notes as { plan_name?: string }).plan_name) ||
                "CareerOS Subscription";
              const amount = paiseToInr(pay.amount);

              if (event === "payment.captured" && email) {
                try {
                  const { sendPaymentSuccessEmail } = await import("@/lib/email/senders.server");
                  // Look up latest active subscription for renewal date hint.
                  const { data: sub } = await supabaseAdmin
                    .from("subscriptions")
                    .select("expires_at")
                    .eq("user_id", pay.user_id)
                    .eq("status", "active")
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                  await sendPaymentSuccessEmail(email, {
                    invoiceNumber: pay.invoice_number ?? p.order_id,
                    planName,
                    amountFormatted: amount,
                    currency: String(pay.currency ?? "INR"),
                    transactionId: String(pay.payment_id ?? p.id ?? ""),
                    when: new Date(pay.invoice_issued_at ?? Date.now()).toUTCString(),
                    renewalDate: sub?.expires_at ? new Date(sub.expires_at).toUTCString() : null,
                    dashboardUrl: "https://careerosai.site/dashboard",
                    billingUrl: "https://careerosai.site/billing",
                    invoiceUrl: "https://careerosai.site/billing",
                    userId: pay.user_id,
                  });
                } catch (e) {
                  console.error("[razorpay-webhook] payment_success email failed", (e as Error).message);
                }
              } else if (event === "payment.failed" && email) {
                try {
                  const { sendPaymentFailedEmail } = await import("@/lib/email/senders.server");
                  const err = p.error_description || p.error_reason || null;
                  await sendPaymentFailedEmail(email, {
                    planName,
                    amountFormatted: amount,
                    currency: String(pay.currency ?? "INR"),
                    attemptedAt: new Date().toUTCString(),
                    reason: err,
                    retryUrl: "https://careerosai.site/billing",
                    userId: pay.user_id,
                  });
                } catch (e) {
                  console.error("[razorpay-webhook] payment_failed email failed", (e as Error).message);
                }
              }
            }
          }

          // -------- Subscriptions --------
          else if (event === "subscription.activated" || event === "subscription.charged") {
            const s = payload?.payload?.subscription?.entity ?? {};
            const { data: sub } = await supabaseAdmin
              .from("subscriptions")
              .select("*")
              .eq("razorpay_subscription_id", s.id)
              .maybeSingle();
            if (sub) {
              await supabaseAdmin
                .from("subscriptions")
                .update({
                  status: "active",
                  expires_at: s.current_end
                    ? new Date(s.current_end * 1000).toISOString()
                    : sub.expires_at,
                })
                .eq("id", sub.id);
              const { email } = await resolveEmailForUser(supabaseAdmin, sub.user_id);
              const planName = sub.plan ?? "CareerOS Subscription";
              if (email) {
                if (event === "subscription.activated") {
                  const { sendSubscriptionActivatedEmail } = await import(
                    "@/lib/email/senders.server"
                  );
                  await sendSubscriptionActivatedEmail(email, {
                    planName,
                    expiresAt: s.current_end
                      ? new Date(s.current_end * 1000).toUTCString()
                      : null,
                    userId: sub.user_id,
                    idempotencyKey: `${s.id}:activated`,
                  });
                } else {
                  const { sendSubscriptionRenewedEmail } = await import(
                    "@/lib/email/senders.server"
                  );
                  const pay = payload?.payload?.payment?.entity;
                  await sendSubscriptionRenewedEmail(email, {
                    planName,
                    amountFormatted: pay?.amount ? paiseToInr(pay.amount) : null,
                    currency: pay?.currency ?? "INR",
                    nextRenewalDate: s.current_end
                      ? new Date(s.current_end * 1000).toUTCString()
                      : null,
                    invoiceNumber: pay?.invoice_id ?? null,
                    userId: sub.user_id,
                    idempotencyKey: `${s.id}:${s.current_end ?? Date.now()}`,
                  });
                }
              }
            }
          } else if (event === "subscription.cancelled" || event === "subscription.completed") {
            const s = payload?.payload?.subscription?.entity ?? {};
            const { data: sub } = await supabaseAdmin
              .from("subscriptions")
              .select("*")
              .eq("razorpay_subscription_id", s.id)
              .maybeSingle();
            await supabaseAdmin
              .from("subscriptions")
              .update({
                status: event === "subscription.cancelled" ? "cancelled" : "expired",
                cancelled_at: new Date().toISOString(),
              })
              .eq("razorpay_subscription_id", s.id);
            if (sub) {
              const { email } = await resolveEmailForUser(supabaseAdmin, sub.user_id);
              if (email) {
                const { sendSubscriptionCancelledEmail } = await import(
                  "@/lib/email/senders.server"
                );
                await sendSubscriptionCancelledEmail(email, {
                  planName: sub.plan ?? "CareerOS Subscription",
                  accessUntil: sub.expires_at ? new Date(sub.expires_at).toUTCString() : null,
                  userId: sub.user_id,
                  idempotencyKey: `${s.id}:cancelled`,
                });
              }
            }
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
