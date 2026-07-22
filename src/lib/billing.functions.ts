/**
 * Billing server functions — Razorpay TEST MODE.
 * All privileged writes use supabaseAdmin, loaded inside handlers.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLANS, type PlanId } from "./billing/plans";

const PlanEnum = z.enum(["pro", "enterprise"]);

export const getRazorpayPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { keyId: process.env.RAZORPAY_KEY_ID ?? "" };
});

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = Date.now();
    const active =
      data &&
      data.status === "active" &&
      (!data.expires_at || new Date(data.expires_at).getTime() > now);

    return {
      subscription: data ?? null,
      plan: (active ? data!.plan : "free") as PlanId,
      isPremium: Boolean(active && (data!.plan === "pro" || data!.plan === "enterprise")),
    };
  });

export const listMyPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("payments")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return { payments: data ?? [] };
  });

export const createCheckoutOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ plan: PlanEnum }).parse(d))
  .handler(async ({ data, context }) => {
    const plan = PLANS[data.plan];
    if (!plan || plan.priceInPaise <= 0) throw new Error("Invalid plan.");

    const { createRazorpayOrder, getRazorpayKeys } = await import("./billing/razorpay.server");
    const { keyId } = getRazorpayKeys();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const receipt = `rcpt_${context.userId.slice(0, 8)}_${Date.now()}`;
    const order = await createRazorpayOrder({
      amount: plan.priceInPaise,
      currency: "INR",
      receipt,
      notes: { user_id: context.userId, plan: plan.id },
    });

    await supabaseAdmin.from("payments").insert({
      user_id: context.userId,
      amount: plan.priceInPaise,
      currency: "INR",
      order_id: order.id,
      receipt,
      status: "created",
      plan: plan.id,
      notes: { plan: plan.id },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      plan: plan.id,
      planName: plan.name,
    };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        razorpay_order_id: z.string().min(1),
        razorpay_payment_id: z.string().min(1),
        razorpay_signature: z.string().min(1),
        plan: PlanEnum,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { verifyCheckoutSignature } = await import("./billing/razorpay.server");
    const ok = verifyCheckoutSignature({
      orderId: data.razorpay_order_id,
      paymentId: data.razorpay_payment_id,
      signature: data.razorpay_signature,
    });
    if (!ok) throw new Error("Payment signature invalid. Payment NOT activated.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Update payment row
    await supabaseAdmin
      .from("payments")
      .update({
        payment_id: data.razorpay_payment_id,
        signature: data.razorpay_signature,
        status: "captured",
      })
      .eq("order_id", data.razorpay_order_id)
      .eq("user_id", context.userId);

    // Deactivate previous active subs
    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "expired", cancelled_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .eq("status", "active");

    const now = new Date();
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + 1);

    const { data: sub, error } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id: context.userId,
        plan: data.plan,
        status: "active",
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: data.razorpay_payment_id,
        started_at: now.toISOString(),
        expires_at: expires.toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Link payment to subscription
    await supabaseAdmin
      .from("payments")
      .update({ subscription_id: sub.id })
      .eq("order_id", data.razorpay_order_id);

    let invoiceEmail: { sent: boolean; reason?: string; status?: number; email?: string; invoiceNumber?: string; response?: string } | null = null;

    // Send invoice email after payment activation. Do not roll back premium access if email delivery fails.
    try {
      const { sendInvoiceEmailByOrderId } = await import("@/features/billing/send-invoice-email.server");
      invoiceEmail = await sendInvoiceEmailByOrderId(data.razorpay_order_id);
      if (!invoiceEmail.sent) {
        console.error("[verifyPayment] invoice email not sent", invoiceEmail);
      }
    } catch (e) {
      console.error("[verifyPayment] invoice email failed", (e as Error).message);
      invoiceEmail = { sent: false, reason: "exception", response: (e as Error).message };
    }

    return { ok: true, subscription: sub, invoiceEmail };
  });

export const cancelMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .eq("status", "active")
      .select();
    if (error) throw new Error(error.message);
    return { ok: true, cancelled: data?.length ?? 0 };
  });

/** Fetch a single invoice (payment + subscription + customer profile). Admin bypass via has_role. */
export const getInvoice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ paymentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    let q = supabaseAdmin.from("payments").select("*").eq("id", data.paymentId);
    if (!isAdmin) q = q.eq("user_id", context.userId);
    const { data: payment, error } = await q.maybeSingle();
    if (error) throw new Error(error.message);
    if (!payment) throw new Error("Invoice not found.");

    const [subRes, profRes] = await Promise.all([
      payment.subscription_id
        ? supabaseAdmin.from("subscriptions").select("*").eq("id", payment.subscription_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin
        .from("profiles")
        .select("user_id, full_name, email, location")
        .eq("user_id", payment.user_id)
        .maybeSingle(),
    ]);

    return {
      payment,
      subscription: subRes.data ?? null,
      customer: profRes.data ?? { user_id: payment.user_id, full_name: null, email: null, location: null },
    };
  });
