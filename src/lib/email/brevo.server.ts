/**
 * Brevo transactional email client (server-only).
 * Sends via https://api.brevo.com/v3/smtp/email using BREVO_API_KEY.
 *
 * Writes every attempt (sent/failed/throttled) to `public.email_logs`
 * for admin analytics. Never throws — returns a structured result so
 * callers can decide whether to warn without crashing the user flow.
 */

export type BrevoRecipient = { email: string; name?: string };

export interface SendEmailInput {
  to: BrevoRecipient | BrevoRecipient[];
  subject: string;
  html: string;
  text?: string;
  tag?: string; // template name, used for logging
  replyTo?: BrevoRecipient;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  /** Optional owning user id — associates the log entry with an account. */
  userId?: string | null;
  /** Extra metadata to persist alongside the log entry. */
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

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

function getConfig() {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL || "support@careerosai.site";
  const fromName = process.env.BREVO_FROM_NAME || "CareerOS";
  const replyTo = process.env.BREVO_REPLY_TO || "himanshugohil828@gmail.com";
  return { apiKey, fromEmail, fromName, replyTo };
}

function firstRecipient(to: BrevoRecipient | BrevoRecipient[]): string {
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
    // Never let logging failures affect send flow.
    console.warn("[email] log insert failed", (e as Error).message);
  }
}

function logSend(
  tag: string,
  to: BrevoRecipient | BrevoRecipient[],
  result: SendEmailResult,
) {
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
      errorMessage: "BREVO_API_KEY not configured",
      metadata: input.metadata,
    });
    return result;
  }

  const to = Array.isArray(input.to) ? input.to : [input.to];
  const payload = {
    sender: { name: cfg.fromName, email: cfg.fromEmail },
    to,
    replyTo: input.replyTo ?? { email: cfg.replyTo, name: cfg.fromName },
    subject: input.subject,
    htmlContent: input.html,
    textContent: input.text,
    tags: [tag],
    headers: input.headers,
    params: input.params,
  };

  const attempt = async (): Promise<SendEmailResult> => {
    try {
      const res = await fetch(BREVO_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "api-key": cfg.apiKey!,
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let body: { messageId?: string; message?: string } = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        /* ignore parse */
      }
      if (!res.ok) {
        return {
          sent: false,
          status: res.status,
          error: body.message ?? text.slice(0, 300),
          reason: `brevo_${res.status}`,
        };
      }
      return { sent: true, status: res.status, messageId: body.messageId };
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
