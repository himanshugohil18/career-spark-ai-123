/**
 * Client-callable notification triggers. Thin wrappers around senders.server.
 * Every handler is authenticated and derives the recipient from the
 * caller's session — the client can never send email to arbitrary addresses.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UAOnly = z.object({
  userAgent: z.string().max(500).optional().nullable(),
});

const LoginNotifyInput = UAOnly.extend({
  provider: z.string().max(40).optional().nullable(),
});

async function getRecipient(supabase: unknown, userId: string, claims: { email?: string }): Promise<{ email: string; name?: string | null } | null> {
  const email = claims.email;
  if (!email) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb.from("profiles").select("full_name").eq("user_id", userId).maybeSingle();
  return { email, name: (data?.full_name as string | null) ?? null };
}

/** Fire welcome email once per new signup. No-ops silently on error. */
export const notifyWelcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    try {
      const to = await getRecipient(supabase, userId, claims as { email?: string });
      if (!to) return { ok: false, reason: "no_email" };
      const { sendWelcomeEmail } = await import("./senders.server");
      const res = await sendWelcomeEmail(to.email, to.name);
      return { ok: res.sent, reason: res.reason };
    } catch (e) {
      console.warn("[notifyWelcome] failed", (e as Error).message);
      return { ok: false, reason: "exception" };
    }
  });

/** Fire login alert email after successful sign-in. Throttled server-side. */
export const notifyLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => LoginNotifyInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    try {
      const to = await getRecipient(supabase, userId, claims as { email?: string });
      if (!to) return { ok: false, reason: "no_email" };
      // Best-effort IP from the request; not always available on the Worker.
      let ip: string | null = null;
      try {
        const { getRequestHeader } = await import("@tanstack/react-start/server");
        ip =
          getRequestHeader("cf-connecting-ip") ??
          getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
          null;
      } catch {
        /* header helpers unavailable */
      }
      const { sendLoginAlertEmail } = await import("./senders.server");
      const res = await sendLoginAlertEmail(to.email, {
        provider: data.provider ?? undefined,
        userAgent: data.userAgent ?? null,
        ip,
        location: null,
      });
      return { ok: res.sent, reason: res.reason };
    } catch (e) {
      console.warn("[notifyLogin] failed", (e as Error).message);
      return { ok: false, reason: "exception" };
    }
  });

/** Fire password-changed confirmation after supabase.auth.updateUser({ password }). */
export const notifyPasswordChanged = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => UAOnly.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    try {
      const to = await getRecipient(supabase, userId, claims as { email?: string });
      if (!to) return { ok: false, reason: "no_email" };
      let ip: string | null = null;
      try {
        const { getRequestHeader } = await import("@tanstack/react-start/server");
        ip =
          getRequestHeader("cf-connecting-ip") ??
          getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
          null;
      } catch {
        /* ignore */
      }
      const { sendPasswordChangedEmail } = await import("./senders.server");
      const res = await sendPasswordChangedEmail(to.email, {
        userAgent: data.userAgent ?? null,
        ip,
      });
      return { ok: res.sent, reason: res.reason };
    } catch (e) {
      console.warn("[notifyPasswordChanged] failed", (e as Error).message);
      return { ok: false, reason: "exception" };
    }
  });
