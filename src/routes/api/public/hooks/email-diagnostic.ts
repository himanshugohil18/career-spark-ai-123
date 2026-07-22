/**
 * Admin-only diagnostic: sends a test email via Resend and returns the
 * provider status. Guarded with a shared secret so it can be curl-tested
 * without a session.
 *
 *   GET  /api/public/hooks/email-diagnostic?to=himanshugohil828@gmail.com
 *   POST /api/public/hooks/email-diagnostic { "to": "..." }
 *
 * Auth: pass ?key=<AUTO_APPLY_WORKER_SECRET> or
 *       header  Authorization: Bearer <AUTO_APPLY_WORKER_SECRET>
 * Falls back to LOVABLE_API_KEY when the worker secret is absent.
 */
import { createFileRoute } from "@tanstack/react-router";
import { sendEmail } from "@/lib/email/resend.server";

export const Route = createFileRoute("/api/public/hooks/email-diagnostic")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});

async function handle(request: Request) {
  const secret = process.env.AUTO_APPLY_WORKER_SECRET || process.env.LOVABLE_API_KEY || "";
  const url = new URL(request.url);
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const key = bearer || url.searchParams.get("key") || "";
  if (!secret || key !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  let to = url.searchParams.get("to") ?? "himanshugohil828@gmail.com";
  if (request.method === "POST") {
    try {
      const body = (await request.json()) as { to?: string };
      if (body?.to) to = body.to;
    } catch {
      /* ignore */
    }
  }

  const result = await sendEmail({
    tag: "diagnostic",
    to: { email: to },
    subject: "CareerOS · Resend diagnostic",
    html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:24px">
      <h2>Resend diagnostic ✅</h2>
      <p>If you're reading this, CareerOS successfully sent an email through Resend.</p>
      <p style="color:#666;font-size:12px">Sent at ${new Date().toISOString()}</p>
    </div>`,
    text: `Resend diagnostic — sent at ${new Date().toISOString()}`,
  });

  return json({ ok: result.sent, result }, result.sent ? 200 : 502);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
