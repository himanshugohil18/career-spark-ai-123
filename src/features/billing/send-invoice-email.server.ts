/**
 * Server-only: generate an invoice PDF and email it via Resend (gateway).
 * Never import from client code.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildInvoice } from "./invoice";
import { generateInvoicePDF } from "./invoice-pdf";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

type InvoiceEmailResult = {
  sent: boolean;
  reason?: string;
  status?: number;
  email?: string;
  invoiceNumber?: string;
  response?: string;
};

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  // btoa is available in Workers
  return btoa(binary);
}

async function updatePaymentEmailNotes(
  supabaseAdmin: any,
  payment: any,
  patch: Record<string, unknown>,
) {
  try {
    const previousNotes = (payment.notes && typeof payment.notes === "object" ? payment.notes : {}) as Record<string, unknown>;
    await supabaseAdmin
      .from("payments")
      .update({
        notes: {
          ...previousNotes,
          ...patch,
          invoice_email_attempts: Number(previousNotes.invoice_email_attempts ?? 0) + 1,
          invoice_email_last_attempt_at: new Date().toISOString(),
        },
      })
      .eq("id", payment.id);
  } catch (e) {
    console.warn("[invoice-email] note update failed", (e as Error).message);
  }
}

export async function sendInvoiceEmailByOrderId(orderId: string): Promise<InvoiceEmailResult> {
  console.info("[invoice-email] start", { orderId });
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  console.info("[invoice-email] credential check", {
    hasLovableKey: Boolean(lovableKey),
    hasResendKey: Boolean(resendKey),
    hasCustomFrom: Boolean(process.env.INVOICE_FROM_EMAIL),
  });
  if (!lovableKey || !resendKey) {
    console.warn("[invoice-email] missing gateway credentials; skipping");
    return { sent: false, reason: "missing_credentials" };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: payment, error: payErr } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();
  if (payErr || !payment) {
    console.warn("[invoice-email] payment not found", orderId, payErr?.message);
    return { sent: false, reason: "payment_not_found" };
  }
  console.info("[invoice-email] payment loaded", {
    orderId,
    paymentRowId: payment.id,
    status: payment.status,
    hasInvoiceNumber: Boolean(payment.invoice_number),
    hasInvoiceIssuedAt: Boolean(payment.invoice_issued_at),
  });
  if (payment.status !== "captured") {
    await updatePaymentEmailNotes(supabaseAdmin, payment, {
      invoice_email_status: "skipped",
      invoice_email_error: "payment_not_captured",
    });
    return { sent: false, reason: "not_captured" };
  }
  const existingNotes = (payment.notes && typeof payment.notes === "object" ? payment.notes : {}) as Record<string, unknown>;
  if (existingNotes.invoice_email_status === "sent" && existingNotes.invoice_emailed_at) {
    console.info("[invoice-email] already sent; skipping duplicate", {
      orderId,
      invoiceNumber: payment.invoice_number,
      emailedAt: existingNotes.invoice_emailed_at,
      to: existingNotes.invoice_emailed_to,
    });
    return {
      sent: true,
      reason: "already_sent",
      status: Number(existingNotes.invoice_email_http_status ?? 200),
      email: String(existingNotes.invoice_emailed_to ?? ""),
      invoiceNumber: payment.invoice_number ?? undefined,
      response: typeof existingNotes.invoice_email_response === "string" ? existingNotes.invoice_email_response : undefined,
    };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("user_id, full_name, email")
    .eq("user_id", payment.user_id)
    .maybeSingle();

  let email: string | null | undefined = profile?.email ?? null;
  if (!email) {
    // Fall back to auth email
    try {
      const { data: userRes } = await (supabaseAdmin as any).auth.admin.getUserById(payment.user_id);
      email = userRes?.user?.email ?? null;
    } catch (e) {
      console.warn("[invoice-email] auth lookup failed", (e as Error).message);
    }
  }
  if (!email) {
    await updatePaymentEmailNotes(supabaseAdmin, payment, {
      invoice_email_status: "failed",
      invoice_email_error: "no_email",
    });
    return { sent: false, reason: "no_email" };
  }

  const { data: sub } = payment.subscription_id
    ? await supabaseAdmin.from("subscriptions").select("*").eq("id", payment.subscription_id).maybeSingle()
    : { data: null as any };

  const inv = buildInvoice({
    payment: payment as any,
    subscription: (sub as any) ?? null,
    customer: {
      user_id: payment.user_id,
      full_name: profile?.full_name ?? null,
      email,
    },
  });

  console.info("[invoice-email] invoice model ready", {
    orderId,
    invoiceNumber: inv.invoiceNumber,
    to: email,
    amount: payment.amount,
  });

  const pdf = generateInvoicePDF(inv);
  const pdfBuf = pdf.output("arraybuffer");
  const pdfBase64 = bufferToBase64(pdfBuf);
  console.info("[invoice-email] invoice PDF generated", {
    orderId,
    invoiceNumber: inv.invoiceNumber,
    pdfBytes: pdfBuf.byteLength,
  });

  const from = process.env.INVOICE_FROM_EMAIL || "CareerOS <onboarding@resend.dev>";
  const subject = `Your CareerOS invoice ${inv.invoiceNumber}`;
  const amount = (payment.amount / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
      <h2 style="margin:0 0 8px">Thanks for your purchase</h2>
      <p style="color:#555;margin:0 0 16px">Your ${inv.plan.name} subscription is active. The full invoice is attached as a PDF.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#666">Invoice</td><td style="padding:6px 0;text-align:right"><b>${inv.invoiceNumber}</b></td></tr>
        <tr><td style="padding:6px 0;color:#666">Plan</td><td style="padding:6px 0;text-align:right">${inv.plan.name}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Amount</td><td style="padding:6px 0;text-align:right">₹${amount} ${payment.currency}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Payment ID</td><td style="padding:6px 0;text-align:right;font-family:monospace">${payment.payment_id ?? ""}</td></tr>
      </table>
      <p style="color:#888;font-size:12px;margin-top:24px">If you have questions, just reply to this email.</p>
    </div>`;

  console.info("[invoice-email] sending via Resend gateway", {
    orderId,
    invoiceNumber: inv.invoiceNumber,
    from,
    to: email,
    attachment: `${inv.invoiceNumber}.pdf`,
  });

  let res: Response;
  try {
    res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      html,
      attachments: [
        {
          filename: `${inv.invoiceNumber}.pdf`,
          content: pdfBase64,
        },
      ],
    }),
    });
  } catch (e) {
    const message = (e as Error).message;
    console.error("[invoice-email] resend network exception", message);
    await updatePaymentEmailNotes(supabaseAdmin, payment, {
      invoice_email_status: "failed",
      invoice_email_error: message,
      invoice_email_failed_to: email,
    });
    return { sent: false, reason: "resend_exception", email, invoiceNumber: inv.invoiceNumber, response: message };
  }

  const responseText = await res.text();
  console.info("[invoice-email] resend response", {
    orderId,
    invoiceNumber: inv.invoiceNumber,
    status: res.status,
    ok: res.ok,
    body: responseText,
  });

  if (!res.ok) {
    console.error(`[invoice-email] resend failed [${res.status}]: ${responseText}`);
    await updatePaymentEmailNotes(supabaseAdmin, payment, {
      invoice_email_status: "failed",
      invoice_email_error: responseText,
      invoice_email_http_status: res.status,
      invoice_email_failed_to: email,
    });
    return {
      sent: false,
      reason: `resend_${res.status}`,
      status: res.status,
      email,
      invoiceNumber: inv.invoiceNumber,
      response: responseText,
    };
  }

  await updatePaymentEmailNotes(supabaseAdmin, payment, {
    invoice_email_status: "sent",
    invoice_email_error: null,
    invoice_email_http_status: res.status,
    invoice_email_response: responseText,
    invoice_emailed_at: new Date().toISOString(),
    invoice_emailed_to: email,
  });

  return { sent: true, status: res.status, email, invoiceNumber: inv.invoiceNumber, response: responseText };
}
