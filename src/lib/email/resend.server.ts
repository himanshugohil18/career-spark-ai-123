/**
 * Resend transactional email client (server-only).
 * Sends via https://api.resend.com/emails using RESEND_API_KEY.
 *
 * Writes every attempt (sent/failed/throttled) to `public.email_logs`
 * for admin analytics. Never throws — returns a structured result so
 * callers can decide whether to warn without crashing the user flow.
 */

export type EmailRecipient = { email: string; name?: string };

export interface SendEmailInput {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  tag?: string;
  replyTo?: EmailRecipient;
  headers?: Record<string, string>;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SendEmailResult {
  sent: boolean;
  status?: number;
  messageId?: string;
  error?: string;
  reason?: string;
  retries?: number;
}

const RESEND_URL = "https://api.resend.com/emails";

function getConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "support@careerosai.site";
  const fromName = process.env.RESEND_FROM_NAME || "CareerOS";
  const replyTo = process.env.RESEND_REPLY_TO || "support@careerosai.site";
  return { apiKey, fromEmail, fromName, replyTo };
}

function formatAddress(r: EmailRecipient): string {
  return r.name ? `${r.name} <${r.email}>` : r.email;
}

function firstRecipient(to: EmailRecipient | EmailRecipient[]): string {
  return Array.isArray(to) ? to[0]?.email ?? "" : to.email;
}

async function persistLog(entry: {
  userId?: string | null;
  recipient: string;
  template: string;
  subject: string;
  status: string;
  providerMessageId?: string | null;
  retryCount: number;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("email_logs").insert({
      user_id: entry.userId ?? null,
      recipient: entry.recipient,
      template: entry.template,
      subject: entry.subject,
      status: entry.status,
      provider_message_id: entry.providerMessageId ?? null,
      retry_count: entry.retryCount,
      error_message: entry.errorMessage ?? null,
      metadata: (entry.metadata ?? {}) as never,
    });
  } catch (e) {
    console.warn("[email] log insert failed", (e as Error).message);
  }
}

function logSend(tag: string, to: EmailRecipient | EmailRecipient[], result: SendEmailResult) {
  const recipients = Array.isArray(to) ? to.map((r) => r.email).join(",") : to.email;
  console.info("[email]", {
    tag,
    to: recipients,
    sent: result.sent,
    status: result.status,
    messageId: result.messageId,
    reason: result.reason,
    error: result.error,
    retries: result.retries,
    at: new Date().toISOString(),
  });
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const cfg = getConfig();
  const tag = input.tag ?? "unknown";
  const recipient = firstRecipient(input.to);

  if (!cfg.apiKey) {
    const result: SendEmailResult = { sent: false, reason: "missing_api_key", retries: 0 };
    logSend(tag, input.to, result);
    void persistLog({
      userId: input.userId,
      recipient,
      template: tag,
      subject: input.subject,
      status: "failed",
      retryCount: 0,
      errorMessage: "RESEND_API_KEY not configured",
      metadata: input.metadata,
    });
    return result;
  }

  const toList = (Array.isArray(input.to) ? input.to : [input.to]).map(formatAddress);
  const from = formatAddress({ email: cfg.fromEmail, name: cfg.fromName });
  const replyTo = input.replyTo ? formatAddress(input.replyTo) : cfg.replyTo;

  const payload: Record<string, unknown> = {
    from,
    to: toList,
    reply_to: replyTo,
    subject: input.subject,
    html: input.html,
    text: input.text,
    headers: input.headers,
    tags: [{ name: "template", value: tag.slice(0, 256) }],
  };

  const attempt = async (): Promise<SendEmailResult> => {
    try {
      const res = await fetch(RESEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${cfg.apiKey!}`,
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let body: { id?: string; message?: string; name?: string } = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        return {
          sent: false,
          status: res.status,
          error: body.message ?? body.name ?? text.slice(0, 300),
          reason: `resend_${res.status}`,
        };
      }
      return { sent: true, status: res.status, messageId: body.id };
    } catch (e) {
      return { sent: false, error: (e as Error).message, reason: "network_error" };
    }
  };

  let retries = 0;
  let result = await attempt();
  if (!result.sent && (!result.status || result.status >= 500 || result.reason === "network_error")) {
    await new Promise((r) => setTimeout(r, 400));
    retries = 1;
    result = await attempt();
  }
  result.retries = retries;
  logSend(tag, input.to, result);

  void persistLog({
    userId: input.userId,
    recipient,
    template: tag,
    subject: input.subject,
    status: result.sent ? "sent" : "failed",
    providerMessageId: result.messageId ?? null,
    retryCount: retries,
    errorMessage: result.sent ? null : (result.error ?? result.reason ?? "unknown"),
    metadata: input.metadata,
  });

  return result;
}

/** Record a throttled/skipped send in email_logs without hitting the provider. */
export async function logSkippedSend(entry: {
  userId?: string | null;
  recipient: string;
  template: string;
  reason: string;
  metadata?: Record<string, unknown>;
}) {
  console.info("[email] skipped", entry);
  await persistLog({
    userId: entry.userId,
    recipient: entry.recipient,
    template: entry.template,
    subject: `[${entry.reason}]`,
    status: "throttled",
    retryCount: 0,
    errorMessage: entry.reason,
    metadata: entry.metadata,
  });
}
