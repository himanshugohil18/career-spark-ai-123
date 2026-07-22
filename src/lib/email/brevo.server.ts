/**
 * Brevo transactional email client (server-only).
 * Sends via https://api.brevo.com/v3/smtp/email using BREVO_API_KEY.
 *
 * Do NOT import from client code.
 */

export type BrevoRecipient = { email: string; name?: string };

export interface SendEmailInput {
  to: BrevoRecipient | BrevoRecipient[];
  subject: string;
  html: string;
  text?: string;
  tag?: string; // used for logging / template type
  replyTo?: BrevoRecipient;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
}

export interface SendEmailResult {
  sent: boolean;
  status?: number;
  messageId?: string;
  error?: string;
  reason?: string;
}

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

function getConfig() {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL || "support@careerosai.site";
  const fromName = process.env.BREVO_FROM_NAME || "CareerOS";
  const replyTo = process.env.BREVO_REPLY_TO || "himanshugohil828@gmail.com";
  return { apiKey, fromEmail, fromName, replyTo };
}

function logSend(
  tag: string,
  to: BrevoRecipient | BrevoRecipient[],
  result: SendEmailResult,
) {
  const recipients = Array.isArray(to) ? to.map((r) => r.email).join(",") : to.email;
  // Never log body/html — only metadata.
  console.info("[email]", {
    tag,
    to: recipients,
    sent: result.sent,
    status: result.status,
    messageId: result.messageId,
    reason: result.reason,
    error: result.error,
    at: new Date().toISOString(),
  });
}

/**
 * Send one transactional email through Brevo. Retries once on 5xx / network
 * error. Never throws — returns a structured result so callers can decide
 * whether to surface a warning without crashing the user flow.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const cfg = getConfig();
  const tag = input.tag ?? "unknown";
  if (!cfg.apiKey) {
    const result = { sent: false, reason: "missing_api_key" } as SendEmailResult;
    logSend(tag, input.to, result);
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

  let result = await attempt();
  if (!result.sent && (!result.status || result.status >= 500 || result.reason === "network_error")) {
    // brief backoff, single retry
    await new Promise((r) => setTimeout(r, 400));
    result = await attempt();
  }
  logSend(tag, input.to, result);
  return result;
}
