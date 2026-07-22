/**
 * High-level sender helpers. Each function renders a template and calls
 * Brevo via sendEmail. Server-only.
 */
import { sendEmail, type SendEmailResult } from "./brevo.server";
import * as T from "./templates";

// Simple in-memory rate limit for the current worker instance. Prevents
// duplicate sends for the same (tag+recipient) within `windowMs`.
const recent = new Map<string, number>();
function rateLimit(key: string, windowMs: number): boolean {
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < windowMs) return false;
  recent.set(key, now);
  // best-effort cleanup
  if (recent.size > 500) {
    for (const [k, v] of recent) if (now - v > 60 * 60 * 1000) recent.delete(k);
  }
  return true;
}

function ok(email: string): { email: string } {
  return { email };
}

function skip(tag: string, to: string, reason: string): SendEmailResult {
  console.info("[email] skipped", { tag, to, reason });
  return { sent: false, reason };
}

export async function sendWelcomeEmail(to: string, name?: string | null) {
  if (!to) return skip("welcome", to, "no_recipient");
  if (!rateLimit(`welcome:${to.toLowerCase()}`, 24 * 60 * 60 * 1000))
    return skip("welcome", to, "rate_limited");
  const rendered = T.welcomeEmail({ name });
  return sendEmail({ tag: "welcome", to: ok(to), ...rendered });
}

export async function sendLoginAlertEmail(
  to: string,
  info: { provider?: string; ip?: string | null; userAgent?: string | null; location?: string | null },
) {
  if (!to) return skip("login_alert", to, "no_recipient");
  // Throttle: at most one alert per 10 min per recipient+provider.
  const key = `login:${to.toLowerCase()}:${info.provider ?? "unknown"}`;
  if (!rateLimit(key, 10 * 60 * 1000)) return skip("login_alert", to, "rate_limited");
  const rendered = T.loginAlertEmail({
    provider: info.provider,
    when: new Date().toUTCString(),
    ip: info.ip ?? null,
    userAgent: info.userAgent ?? null,
    location: info.location ?? null,
  });
  return sendEmail({ tag: "login_alert", to: ok(to), ...rendered });
}

export async function sendPasswordChangedEmail(
  to: string,
  info: { ip?: string | null; userAgent?: string | null },
) {
  if (!to) return skip("password_changed", to, "no_recipient");
  if (!rateLimit(`pwchange:${to.toLowerCase()}`, 5 * 60 * 1000))
    return skip("password_changed", to, "rate_limited");
  const rendered = T.passwordChangedEmail({
    when: new Date().toUTCString(),
    ip: info.ip ?? null,
    userAgent: info.userAgent ?? null,
  });
  return sendEmail({ tag: "password_changed", to: ok(to), ...rendered });
}

export async function sendPaymentSuccessEmail(
  to: string,
  input: Parameters<typeof T.paymentSuccessEmail>[0],
) {
  if (!to) return skip("payment_success", to, "no_recipient");
  if (!rateLimit(`pay:${input.invoiceNumber}`, 24 * 60 * 60 * 1000))
    return skip("payment_success", to, "duplicate_invoice");
  const rendered = T.paymentSuccessEmail(input);
  return sendEmail({ tag: "payment_success", to: ok(to), ...rendered });
}

export async function sendSubscriptionActivatedEmail(
  to: string,
  input: Parameters<typeof T.subscriptionActivatedEmail>[0],
) {
  if (!to) return skip("subscription_activated", to, "no_recipient");
  const rendered = T.subscriptionActivatedEmail(input);
  return sendEmail({ tag: "subscription_activated", to: ok(to), ...rendered });
}

export async function sendSubscriptionCancelledEmail(
  to: string,
  input: Parameters<typeof T.subscriptionCancelledEmail>[0],
) {
  if (!to) return skip("subscription_cancelled", to, "no_recipient");
  const rendered = T.subscriptionCancelledEmail(input);
  return sendEmail({ tag: "subscription_cancelled", to: ok(to), ...rendered });
}

export async function sendResumeParsedEmail(
  to: string,
  input: Parameters<typeof T.resumeParsedEmail>[0],
) {
  if (!to) return skip("resume_parsed", to, "no_recipient");
  // At most one per hour per user (edits can trigger multiple regenerations).
  if (!rateLimit(`resume:${to.toLowerCase()}`, 60 * 60 * 1000))
    return skip("resume_parsed", to, "rate_limited");
  const rendered = T.resumeParsedEmail(input);
  return sendEmail({ tag: "resume_parsed", to: ok(to), ...rendered });
}

export async function sendAIApplicationSubmittedEmail(
  to: string,
  input: Parameters<typeof T.aiApplicationSubmittedEmail>[0],
) {
  if (!to) return skip("ai_application_submitted", to, "no_recipient");
  const key = `apply:${to.toLowerCase()}:${input.company}:${input.role}`;
  if (!rateLimit(key, 60 * 60 * 1000))
    return skip("ai_application_submitted", to, "duplicate");
  const rendered = T.aiApplicationSubmittedEmail(input);
  return sendEmail({ tag: "ai_application_submitted", to: ok(to), ...rendered });
}

export async function sendSecurityAlertEmail(
  to: string,
  input: Parameters<typeof T.securityAlertEmail>[0],
) {
  if (!to) return skip("security_alert", to, "no_recipient");
  if (!rateLimit(`security:${to.toLowerCase()}:${input.reason}`, 5 * 60 * 1000))
    return skip("security_alert", to, "rate_limited");
  const rendered = T.securityAlertEmail(input);
  return sendEmail({ tag: "security_alert", to: ok(to), ...rendered });
}
