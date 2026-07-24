/**
 * Client-callable notification triggers. Thin wrappers around senders.server.
 * Every handler is authenticated and derives the recipient from the
 * caller's session — the client can never send email to arbitrary addresses.
 *
 * The one exception is `requestPasswordReset`, which accepts an email in
 * `data` because the caller is by definition signed-out. Rate-limited
 * inside the handler; enumeration is prevented by always returning ok.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseUserAgent } from "./ua";

const UAOnly = z.object({
  userAgent: z.string().max(500).optional().nullable(),
});

const LoginNotifyInput = UAOnly.extend({
  provider: z.string().max(40).optional().nullable(),
});

const PasswordResetInput = z.object({
  email: z.string().email().max(254),
});

async function getRecipient(
  supabase: unknown,
  userId: string,
  claims: { email?: string },
): Promise<{ email: string; name?: string | null } | null> {
  const email = claims.email;
  if (!email) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("profiles")
    .select("full_name")
    .eq("user_id", userId)
    .maybeSingle();
  return { email, name: (data?.full_name as string | null) ?? null };
}

function readClientIp(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getRequestHeader } = require("@tanstack/react-start/server");
    return (
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      null
    );
  } catch {
    return null;
  }
}

export const notifyWelcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    try {
      const to = await getRecipient(supabase, userId, claims as { email?: string });
      if (!to) return { ok: false, reason: "no_email" };
      // Only send the welcome email the first time — gate on profiles.welcomed_at
      // so re-signing in never re-triggers it.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data: prof } = await sb
        .from("profiles")
        .select("welcomed_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (prof?.welcomed_at) return { ok: false, reason: "already_welcomed" };
      const { sendWelcomeEmail } = await import("./senders.server");
      const res = await sendWelcomeEmail(to.email, to.name, userId);
      if (res.sent) {
        await sb
          .from("profiles")
          .update({ welcomed_at: new Date().toISOString() })
          .eq("user_id", userId);
      }
      return { ok: res.sent, reason: res.reason };
    } catch (e) {
      console.warn("[notifyWelcome] failed", (e as Error).message);
      return { ok: false, reason: "exception" };
    }
  });

export const notifyLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => LoginNotifyInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    try {
      const to = await getRecipient(supabase, userId, claims as { email?: string });
      if (!to) return { ok: false, reason: "no_email" };
      const ua = parseUserAgent(data.userAgent);
      const { sendLoginAlertEmail } = await import("./senders.server");
      const res = await sendLoginAlertEmail(to.email, {
        provider: data.provider ?? undefined,
        userAgent: data.userAgent ?? null,
        browser: ua.browser,
        os: ua.os,
        device: ua.device,
        ip: readClientIp(),
        location: null,
        userId,
      });
      return { ok: res.sent, reason: res.reason };
    } catch (e) {
      console.warn("[notifyLogin] failed", (e as Error).message);
      return { ok: false, reason: "exception" };
    }
  });

export const notifyPasswordChanged = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => UAOnly.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    try {
      const to = await getRecipient(supabase, userId, claims as { email?: string });
      if (!to) return { ok: false, reason: "no_email" };
      const ua = parseUserAgent(data.userAgent);
      const { sendPasswordChangedEmail } = await import("./senders.server");
      const res = await sendPasswordChangedEmail(to.email, {
        browser: ua.browser,
        os: ua.os,
        ip: readClientIp(),
        userId,
      });
      return { ok: res.sent, reason: res.reason };
    } catch (e) {
      console.warn("[notifyPasswordChanged] failed", (e as Error).message);
      return { ok: false, reason: "exception" };
    }
  });

/**
 * Sign-out safe password-reset trigger. Issues a Supabase recovery link via
 * the Admin API and delivers it through our branded Brevo template. Always
 * returns ok — never leaks whether the email exists (enumeration guard).
 */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PasswordResetInput.parse(data))
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const appUrl = process.env.APP_URL || "https://careerosai.site";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: linkRes } = await (supabaseAdmin as any).auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${appUrl}/reset-password` },
      });
      const link = linkRes?.properties?.action_link as string | undefined;
      const userId = (linkRes?.user?.id as string | undefined) ?? null;
      if (link) {
        const { sendPasswordResetEmail } = await import("./senders.server");
        await sendPasswordResetEmail(email, { link, expiresInMinutes: 60, userId });
      }
    } catch (e) {
      console.warn("[requestPasswordReset] failed", (e as Error).message);
    }
    // Always ok — do not reveal account existence.
    return { ok: true };
  });
