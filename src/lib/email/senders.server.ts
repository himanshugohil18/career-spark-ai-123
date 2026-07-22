/**
 * High-level sender helpers. Each function renders a template and calls
 * Resend via sendEmail. Server-only.
 */
import { sendEmail, logSkippedSend, type SendEmailResult } from "./resend.server";
import * as T from "./templates";

// In-worker rate limit for the current instance. Prevents duplicate sends
// for the same (tag+recipient) within `windowMs` on this Worker only.
// For hard cross-worker idempotency, callers pass idempotency keys.
const recent = new Map<string, number>();
function rateLimit(key: string, windowMs: number): boolean {
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < windowMs) return false;
  recent.set(key, now);
  if (recent.size > 500) {
    for (const [k, v] of recent) if (now - v > 60 * 60 * 1000) recent.delete(k);
  }
  return true;
}

function ok(email: string): { email: string } {
  return { email };
}

function skip(tag: string, to: string, reason: string, userId?: string | null): SendEmailResult {
  void logSkippedSend({ userId: userId ?? null, recipient: to, template: tag, reason });
  return { sent: false, reason };
}

export async function sendWelcomeEmail(to: string, name?: string | null, userId?: string | null) {
  if (!to) return skip("welcome", to, "no_recipient", userId);
  if (!rateLimit(`welcome:${to.toLowerCase()}`, 24 * 60 * 60 * 1000))
    return skip("welcome", to, "rate_limited", userId);
  const rendered = T.welcomeEmail({ name });
  return sendEmail({ tag: "welcome", to: ok(to), userId, ...rendered });
}

export async function sendEmailVerification(
  to: string,
  input: { name?: string | null; link: string; expiresInMinutes?: number; userId?: string | null },
) {
  if (!to) return skip("email_verification", to, "no_recipient", input.userId);
  const rendered = T.emailVerificationEmail({ name: input.name, link: input.link, expiresInMinutes: input.expiresInMinutes });
  return sendEmail({ tag: "email_verification", to: ok(to), userId: input.userId ?? null, ...rendered });
}

export async function sendPasswordResetEmail(
  to: string,
  input: { link: string; expiresInMinutes?: number; userId?: string | null },
) {
  if (!to) return skip("password_reset", to, "no_recipient", input.userId);
  if (!rateLimit(`pwreset:${to.toLowerCase()}`, 60 * 1000))
    return skip("password_reset", to, "rate_limited", input.userId);
  const rendered = T.passwordResetEmail({ link: input.link, expiresInMinutes: input.expiresInMinutes });
  return sendEmail({ tag: "password_reset", to: ok(to), userId: input.userId ?? null, ...rendered });
}

export async function sendLoginAlertEmail(
  to: string,
  info: {
    provider?: string;
    ip?: string | null;
    browser?: string | null;
    os?: string | null;
    device?: string | null;
    userAgent?: string | null;
    location?: string | null;
    userId?: string | null;
    /** Skip alert entirely for known trusted device fingerprints. */
    trustedFingerprint?: string | null;
  },
) {
  if (!to) return skip("login_alert", to, "no_recipient", info.userId);
  // Throttle repeated alerts from the same trusted device (browser+os) for 24h.
  const fp = info.trustedFingerprint ?? `${info.browser ?? ""}|${info.os ?? ""}|${info.device ?? ""}`;
  const trustedKey = `login-trusted:${to.toLowerCase()}:${fp}`;
  if (fp && !rateLimit(trustedKey, 24 * 60 * 60 * 1000)) return skip("login_alert", to, "trusted_device", info.userId);
  // Base throttle: at most one alert per 10 min per recipient+provider.
  const key = `login:${to.toLowerCase()}:${info.provider ?? "unknown"}`;
  if (!rateLimit(key, 10 * 60 * 1000)) return skip("login_alert", to, "rate_limited", info.userId);
  const rendered = T.loginAlertEmail({
    provider: info.provider,
    when: new Date().toUTCString(),
    ip: info.ip ?? null,
    browser: info.browser ?? null,
    os: info.os ?? null,
    device: info.device ?? null,
    location: info.location ?? null,
  });
  return sendEmail({
    tag: "login_alert",
    to: ok(to),
    userId: info.userId ?? null,
    metadata: { provider: info.provider, browser: info.browser, os: info.os, device: info.device },
    ...rendered,
  });
}

export async function sendPasswordChangedEmail(
  to: string,
  info: { ip?: string | null; browser?: string | null; os?: string | null; userId?: string | null },
) {
  if (!to) return skip("password_changed", to, "no_recipient", info.userId);
  if (!rateLimit(`pwchange:${to.toLowerCase()}`, 5 * 60 * 1000))
    return skip("password_changed", to, "rate_limited", info.userId);
  const rendered = T.passwordChangedEmail({
    when: new Date().toUTCString(),
    ip: info.ip ?? null,
    browser: info.browser ?? null,
    os: info.os ?? null,
  });
  return sendEmail({ tag: "password_changed", to: ok(to), userId: info.userId ?? null, ...rendered });
}

export async function sendPaymentSuccessEmail(
  to: string,
  input: Parameters<typeof T.paymentSuccessEmail>[0] & { userId?: string | null },
) {
  if (!to) return skip("payment_success", to, "no_recipient", input.userId);
  if (!rateLimit(`pay:${input.invoiceNumber}`, 24 * 60 * 60 * 1000))
    return skip("payment_success", to, "duplicate_invoice", input.userId);
  const rendered = T.paymentSuccessEmail(input);
  return sendEmail({
    tag: "payment_success",
    to: ok(to),
    userId: input.userId ?? null,
    metadata: { invoice: input.invoiceNumber, plan: input.planName, txn: input.transactionId },
    ...rendered,
  });
}

export async function sendPaymentFailedEmail(
  to: string,
  input: Parameters<typeof T.paymentFailedEmail>[0] & { userId?: string | null },
) {
  if (!to) return skip("payment_failed", to, "no_recipient", input.userId);
  if (!rateLimit(`payfail:${to.toLowerCase()}:${input.attemptedAt}`, 5 * 60 * 1000))
    return skip("payment_failed", to, "rate_limited", input.userId);
  const rendered = T.paymentFailedEmail(input);
  return sendEmail({ tag: "payment_failed", to: ok(to), userId: input.userId ?? null, ...rendered });
}

export async function sendSubscriptionActivatedEmail(
  to: string,
  input: Parameters<typeof T.subscriptionActivatedEmail>[0] & { userId?: string | null; idempotencyKey?: string },
) {
  if (!to) return skip("subscription_activated", to, "no_recipient", input.userId);
  const key = `sub-activated:${input.idempotencyKey ?? to.toLowerCase() + ":" + input.planName}`;
  if (!rateLimit(key, 24 * 60 * 60 * 1000)) return skip("subscription_activated", to, "duplicate", input.userId);
  const rendered = T.subscriptionActivatedEmail(input);
  return sendEmail({ tag: "subscription_activated", to: ok(to), userId: input.userId ?? null, ...rendered });
}

export async function sendSubscriptionRenewedEmail(
  to: string,
  input: Parameters<typeof T.subscriptionRenewedEmail>[0] & { userId?: string | null; idempotencyKey?: string },
) {
  if (!to) return skip("subscription_renewed", to, "no_recipient", input.userId);
  const key = `sub-renewed:${input.idempotencyKey ?? to.toLowerCase() + ":" + (input.invoiceNumber ?? input.nextRenewalDate ?? Date.now())}`;
  if (!rateLimit(key, 12 * 60 * 60 * 1000)) return skip("subscription_renewed", to, "duplicate", input.userId);
  const rendered = T.subscriptionRenewedEmail(input);
  return sendEmail({ tag: "subscription_renewed", to: ok(to), userId: input.userId ?? null, ...rendered });
}

export async function sendSubscriptionCancelledEmail(
  to: string,
  input: Parameters<typeof T.subscriptionCancelledEmail>[0] & { userId?: string | null; idempotencyKey?: string },
) {
  if (!to) return skip("subscription_cancelled", to, "no_recipient", input.userId);
  const key = `sub-cancelled:${input.idempotencyKey ?? to.toLowerCase() + ":" + input.planName}`;
  if (!rateLimit(key, 24 * 60 * 60 * 1000)) return skip("subscription_cancelled", to, "duplicate", input.userId);
  const rendered = T.subscriptionCancelledEmail(input);
  return sendEmail({ tag: "subscription_cancelled", to: ok(to), userId: input.userId ?? null, ...rendered });
}

export async function sendResumeParsedEmail(
  to: string,
  input: Parameters<typeof T.resumeParsedEmail>[0] & { userId?: string | null },
) {
  if (!to) return skip("resume_parsed", to, "no_recipient", input.userId);
  if (!rateLimit(`resume:${to.toLowerCase()}:v${input.version ?? 0}`, 60 * 60 * 1000))
    return skip("resume_parsed", to, "rate_limited", input.userId);
  const rendered = T.resumeParsedEmail(input);
  return sendEmail({ tag: "resume_parsed", to: ok(to), userId: input.userId ?? null, ...rendered });
}

export async function sendAIApplicationSubmittedEmail(
  to: string,
  input: Parameters<typeof T.aiApplicationSubmittedEmail>[0] & { userId?: string | null },
) {
  if (!to) return skip("ai_application_submitted", to, "no_recipient", input.userId);
  const key = `apply:${to.toLowerCase()}:${input.applicationId ?? `${input.company}:${input.role}`}`;
  if (!rateLimit(key, 60 * 60 * 1000))
    return skip("ai_application_submitted", to, "duplicate", input.userId);
  const rendered = T.aiApplicationSubmittedEmail(input);
  return sendEmail({ tag: "ai_application_submitted", to: ok(to), userId: input.userId ?? null, ...rendered });
}

export async function sendSecurityAlertEmail(
  to: string,
  input: Parameters<typeof T.securityAlertEmail>[0] & { userId?: string | null },
) {
  if (!to) return skip("security_alert", to, "no_recipient", input.userId);
  if (!rateLimit(`security:${to.toLowerCase()}:${input.reason}`, 5 * 60 * 1000))
    return skip("security_alert", to, "rate_limited", input.userId);
  const rendered = T.securityAlertEmail(input);
  return sendEmail({ tag: "security_alert", to: ok(to), userId: input.userId ?? null, ...rendered });
}
