/**
 * CareerOS email templates. Pure functions returning { subject, html, text }.
 *
 * Design goals:
 * - Inline styles only (email clients strip <style>).
 * - White background on <body>. Brand accent on CTAs.
 * - Mobile friendly: max-width 560px container, generous padding.
 * - No external CSS, no images that aren't hosted on the app.
 */

const APP_URL = "https://careerosai.site";
const BRAND = "CareerOS";
const LOGO_URL = `${APP_URL}/careerosai.png`;
const SUPPORT_EMAIL = "support@careerosai.site";

const COLOR = {
  ink: "#0F172A",
  muted: "#64748B",
  soft: "#94A3B8",
  border: "#E2E8F0",
  accent: "#6366F1",
  accentDark: "#4F46E5",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  danger: "#DC2626",
  success: "#059669",
};

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function layout(opts: {
  preheader: string;
  title: string;
  intro: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
  footerNote?: string;
}): string {
  const cta = opts.cta
    ? `
      <tr>
        <td align="left" style="padding:8px 0 4px">
          <a href="${opts.cta.href}" style="display:inline-block;background:${COLOR.accent};color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px;letter-spacing:0.01em">${opts.cta.label}</a>
        </td>
      </tr>`
    : "";
  const foot = opts.footerNote
    ? `<p style="margin:18px 0 0;color:${COLOR.soft};font-size:12px;line-height:1.55">${opts.footerNote}</p>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.bg};color:${COLOR.ink};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${escapeHtml(opts.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.bg};padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${COLOR.card};border:1px solid ${COLOR.border};border-radius:16px;overflow:hidden">
          <tr>
            <td style="padding:24px 28px 12px;border-bottom:1px solid ${COLOR.border}">
              <table role="presentation" width="100%"><tr>
                <td align="left">
                  <img src="${LOGO_URL}" width="28" height="28" alt="CareerOS" style="display:inline-block;vertical-align:middle;border-radius:6px" />
                  <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-weight:700;font-size:15px;letter-spacing:-0.01em;color:${COLOR.ink}">CareerOS</span>
                </td>
                <td align="right" style="color:${COLOR.soft};font-size:12px">AI Career OS</td>
              </tr></table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px">
              <h1 style="margin:0 0 8px;font-size:22px;line-height:1.3;letter-spacing:-0.01em;color:${COLOR.ink};font-weight:700">${escapeHtml(opts.title)}</h1>
              <p style="margin:0 0 18px;color:${COLOR.muted};font-size:14.5px;line-height:1.6">${opts.intro}</p>
              ${opts.bodyHtml}
              <table role="presentation" style="margin-top:18px">${cta}</table>
              ${foot}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:${COLOR.bg};border-top:1px solid ${COLOR.border};color:${COLOR.soft};font-size:12px;line-height:1.6">
              <div style="margin-bottom:4px"><a href="${APP_URL}" style="color:${COLOR.muted};text-decoration:none">${APP_URL}</a> · <a href="mailto:${SUPPORT_EMAIL}" style="color:${COLOR.muted};text-decoration:none">${SUPPORT_EMAIL}</a></div>
              <div><a href="${APP_URL}/privacy" style="color:${COLOR.soft};text-decoration:none">Privacy</a> · <a href="${APP_URL}/terms" style="color:${COLOR.soft};text-decoration:none">Terms</a> · © ${new Date().getFullYear()} ${BRAND}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function kvTable(rows: Array<[string, string]>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLOR.border};border-radius:12px;overflow:hidden;font-size:14px">
    ${rows
      .map(
        ([k, v], i) => `<tr style="background:${i % 2 ? COLOR.bg : "#fff"}">
          <td style="padding:10px 14px;color:${COLOR.muted};width:40%">${escapeHtml(k)}</td>
          <td style="padding:10px 14px;color:${COLOR.ink};font-weight:600">${escapeHtml(v)}</td>
        </tr>`,
      )
      .join("")}
  </table>`;
}

function toText(title: string, body: string, cta?: { label: string; href: string }): string {
  return `${title}\n\n${body}${cta ? `\n\n${cta.label}: ${cta.href}` : ""}\n\n— CareerOS · ${APP_URL}`;
}

// -------------------- Templates --------------------

export function welcomeEmail(input: { name?: string | null }): RenderedEmail {
  const name = input.name?.trim() || "there";
  const subject = "Welcome to CareerOS 🚀";
  const intro = `Hi ${escapeHtml(name)}, we're glad you're here. CareerOS is your AI-powered career operating system — a single place to organize your resume, discover matching jobs, and prep for interviews.`;
  const bodyHtml = `
    <div style="border:1px solid ${COLOR.border};border-radius:12px;padding:16px 18px;background:${COLOR.bg};margin-bottom:18px">
      <div style="font-weight:600;font-size:14px;margin-bottom:8px">Get started in 3 steps</div>
      <ol style="margin:0;padding-left:18px;color:${COLOR.muted};font-size:14px;line-height:1.8">
        <li><b style="color:${COLOR.ink}">Upload your resume</b> — we'll parse it and build your Career Brain.</li>
        <li><b style="color:${COLOR.ink}">Discover jobs</b> — matched to your skills, experience, and goals.</li>
        <li><b style="color:${COLOR.ink}">Practice interviews</b> — tailored to your target roles.</li>
      </ol>
    </div>`;
  const html = layout({
    preheader: "Welcome to CareerOS — let's set up your workspace.",
    title: "Welcome to CareerOS",
    intro,
    bodyHtml,
    cta: { label: "Open your dashboard", href: `${APP_URL}/dashboard` },
  });
  return { subject, html, text: toText("Welcome to CareerOS", intro.replace(/<[^>]+>/g, ""), { label: "Open your dashboard", href: `${APP_URL}/dashboard` }) };
}

export function loginAlertEmail(input: {
  provider?: string;
  when?: string;
  ip?: string | null;
  userAgent?: string | null;
  location?: string | null;
}): RenderedEmail {
  const provider = input.provider === "google" ? "Google" : "Email & password";
  const when = input.when ?? new Date().toUTCString();
  const subject = "New sign in to your CareerOS account";
  const intro = `We noticed a new sign in to your CareerOS account. If this was you, no action is needed.`;
  const rows: Array<[string, string]> = [
    ["Method", provider],
    ["When", when],
  ];
  if (input.userAgent) rows.push(["Device", input.userAgent.slice(0, 160)]);
  if (input.ip) rows.push(["IP", input.ip]);
  if (input.location) rows.push(["Location", input.location]);
  const bodyHtml = kvTable(rows);
  const html = layout({
    preheader: "New sign in to your CareerOS account.",
    title: "New sign in detected",
    intro,
    bodyHtml,
    cta: { label: "Review account activity", href: `${APP_URL}/settings` },
    footerNote: `If this wasn't you, reply to this email or contact <a href="mailto:${SUPPORT_EMAIL}" style="color:${COLOR.muted}">${SUPPORT_EMAIL}</a> right away.`,
  });
  return { subject, html, text: toText(subject, `${intro}\nMethod: ${provider}\nWhen: ${when}`) };
}

export function passwordResetEmail(input: { link: string; expiresInMinutes?: number }): RenderedEmail {
  const subject = "Reset your CareerOS password";
  const mins = input.expiresInMinutes ?? 60;
  const intro = `Use the button below to choose a new password. This link expires in about ${mins} minutes.`;
  const bodyHtml = `<p style="margin:0 0 12px;color:${COLOR.muted};font-size:13.5px">If you didn't request this, you can safely ignore this email — your password will not change.</p>`;
  const html = layout({
    preheader: "Reset your CareerOS password.",
    title: "Reset your password",
    intro,
    bodyHtml,
    cta: { label: "Reset password", href: input.link },
  });
  return { subject, html, text: toText(subject, `${intro}\n\nReset link: ${input.link}`) };
}

export function passwordChangedEmail(input: { when?: string; ip?: string | null; userAgent?: string | null }): RenderedEmail {
  const subject = "Your CareerOS password was changed";
  const when = input.when ?? new Date().toUTCString();
  const intro = "This is a confirmation that your CareerOS account password was just changed.";
  const rows: Array<[string, string]> = [["When", when]];
  if (input.userAgent) rows.push(["Device", input.userAgent.slice(0, 160)]);
  if (input.ip) rows.push(["IP", input.ip]);
  const html = layout({
    preheader: "Your CareerOS password was changed.",
    title: "Password changed",
    intro,
    bodyHtml: kvTable(rows),
    cta: { label: "Open CareerOS", href: `${APP_URL}/dashboard` },
    footerNote: `Didn't do this? Reply immediately or contact <a href="mailto:${SUPPORT_EMAIL}" style="color:${COLOR.muted}">${SUPPORT_EMAIL}</a>.`,
  });
  return { subject, html, text: toText(subject, intro) };
}

export function paymentSuccessEmail(input: {
  invoiceNumber: string;
  planName: string;
  amountFormatted: string; // e.g. "₹1,299.00"
  currency: string;
  transactionId: string;
  when: string;
  periodLabel?: string;
  dashboardUrl?: string;
  invoiceUrl?: string;
}): RenderedEmail {
  const subject = `Payment received — ${input.invoiceNumber}`;
  const intro = `Thanks for upgrading to <b style="color:${COLOR.ink}">${escapeHtml(input.planName)}</b>. Your payment was received successfully.`;
  const rows: Array<[string, string]> = [
    ["Invoice", input.invoiceNumber],
    ["Plan", input.planName],
    ["Amount", `${input.amountFormatted} ${input.currency}`],
    ["Transaction", input.transactionId],
    ["Date", input.when],
  ];
  if (input.periodLabel) rows.push(["Period", input.periodLabel]);
  const cta = input.invoiceUrl
    ? { label: "Download invoice", href: input.invoiceUrl }
    : { label: "Open dashboard", href: input.dashboardUrl ?? `${APP_URL}/dashboard` };
  const html = layout({
    preheader: `Payment received — ${input.invoiceNumber}`,
    title: "Payment successful",
    intro,
    bodyHtml: kvTable(rows),
    cta,
    footerNote: input.invoiceUrl
      ? `You can also <a href="${input.dashboardUrl ?? `${APP_URL}/dashboard`}" style="color:${COLOR.muted}">open your dashboard</a>.`
      : undefined,
  });
  return { subject, html, text: toText(subject, `Invoice ${input.invoiceNumber} · ${input.planName} · ${input.amountFormatted} ${input.currency}`) };
}

export function subscriptionActivatedEmail(input: { planName: string; expiresAt?: string | null }): RenderedEmail {
  const subject = `${input.planName} is now active`;
  const intro = `Your <b style="color:${COLOR.ink}">${escapeHtml(input.planName)}</b> subscription is now active. You have full access to premium features across CareerOS.`;
  const rows: Array<[string, string]> = [["Plan", input.planName]];
  if (input.expiresAt) rows.push(["Renews / expires", input.expiresAt]);
  const html = layout({
    preheader: `${input.planName} is now active on CareerOS.`,
    title: `${input.planName} activated`,
    intro,
    bodyHtml: kvTable(rows),
    cta: { label: "Explore premium features", href: `${APP_URL}/dashboard` },
  });
  return { subject, html, text: toText(subject, intro) };
}

export function subscriptionCancelledEmail(input: { planName: string; accessUntil?: string | null }): RenderedEmail {
  const subject = `Your ${input.planName} subscription was cancelled`;
  const intro = input.accessUntil
    ? `Your ${escapeHtml(input.planName)} subscription has been cancelled. You keep access until <b style="color:${COLOR.ink}">${escapeHtml(input.accessUntil)}</b>.`
    : `Your ${escapeHtml(input.planName)} subscription has been cancelled.`;
  const html = layout({
    preheader: `Your ${input.planName} subscription was cancelled.`,
    title: "Subscription cancelled",
    intro,
    bodyHtml: `<p style="margin:0;color:${COLOR.muted};font-size:14px">Changed your mind? You can reactivate anytime from your billing page.</p>`,
    cta: { label: "Manage billing", href: `${APP_URL}/billing` },
  });
  return { subject, html, text: toText(subject, intro.replace(/<[^>]+>/g, "")) };
}

export function resumeParsedEmail(input: {
  name?: string | null;
  version?: number;
  projects?: number;
  skills?: number;
  experiences?: number;
  education?: number;
  completeness?: number | null;
}): RenderedEmail {
  const subject = "Your Career Brain is ready";
  const intro = `Hi ${escapeHtml(input.name?.trim() || "there")}, we've parsed your resume and generated your Career Brain. Here's a quick snapshot of what we found.`;
  const rows: Array<[string, string]> = [];
  if (input.version != null) rows.push(["Resume version", `v${input.version}`]);
  if (input.experiences != null) rows.push(["Experience", `${input.experiences} roles`]);
  if (input.projects != null) rows.push(["Projects", String(input.projects)]);
  if (input.skills != null) rows.push(["Skills", String(input.skills)]);
  if (input.education != null) rows.push(["Education", String(input.education)]);
  if (input.completeness != null) rows.push(["Profile completeness", `${Math.round(input.completeness)}%`]);
  const html = layout({
    preheader: "Your CareerOS Career Brain is ready.",
    title: "Career Brain generated",
    intro,
    bodyHtml: rows.length ? kvTable(rows) : "",
    cta: { label: "Open dashboard", href: `${APP_URL}/dashboard` },
  });
  return { subject, html, text: toText(subject, intro.replace(/<[^>]+>/g, "")) };
}

export function aiApplicationSubmittedEmail(input: {
  company: string;
  role: string;
  when: string;
  status: string;
  workspaceUrl?: string;
}): RenderedEmail {
  const subject = `Application submitted — ${input.role} at ${input.company}`;
  const intro = `Your AI agent just submitted an application on your behalf. We'll track updates and notify you on any change.`;
  const bodyHtml = kvTable([
    ["Company", input.company],
    ["Role", input.role],
    ["Submitted", input.when],
    ["Status", input.status],
  ]);
  const html = layout({
    preheader: `Applied to ${input.role} at ${input.company}.`,
    title: "Application submitted",
    intro,
    bodyHtml,
    cta: { label: "Open applications", href: input.workspaceUrl ?? `${APP_URL}/applications` },
  });
  return { subject, html, text: toText(subject, `${input.role} · ${input.company} · ${input.when}`) };
}

export function securityAlertEmail(input: {
  reason: string;
  details?: string | null;
  when?: string;
  ip?: string | null;
  userAgent?: string | null;
}): RenderedEmail {
  const subject = `Security alert — ${input.reason}`;
  const intro = `We detected a security-sensitive event on your CareerOS account: <b style="color:${COLOR.danger}">${escapeHtml(input.reason)}</b>. Review the details below.`;
  const rows: Array<[string, string]> = [["When", input.when ?? new Date().toUTCString()]];
  if (input.details) rows.push(["Details", input.details]);
  if (input.userAgent) rows.push(["Device", input.userAgent.slice(0, 160)]);
  if (input.ip) rows.push(["IP", input.ip]);
  const html = layout({
    preheader: `Security alert — ${input.reason}`,
    title: "Security alert",
    intro,
    bodyHtml: kvTable(rows),
    cta: { label: "Review account", href: `${APP_URL}/settings` },
    footerNote: `Not you? Reply to this email or contact <a href="mailto:${SUPPORT_EMAIL}" style="color:${COLOR.muted}">${SUPPORT_EMAIL}</a> immediately.`,
  });
  return { subject, html, text: toText(subject, intro.replace(/<[^>]+>/g, "")) };
}
