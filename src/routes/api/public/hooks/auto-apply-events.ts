/**
 * Webhook for the external Playwright worker to stream progress back into
 * CareerOS. The worker MUST authenticate with:
 *   Authorization: Bearer <AUTO_APPLY_WORKER_SECRET>
 *
 * Body schema (any subset is OK per request):
 *   {
 *     "sessionId": "<uuid>",
 *     "step"?: "filling_application",
 *     "status"?: "running" | "awaiting_input" | "awaiting_approval" | "submitting" | "completed" | "failed",
 *     "events"?: [{ "step": string, "kind": "info"|"warning"|"error"|"approval",
 *                   "message": string, "data"?: object }],
 *     "screenshots"?: [{ "step": string, "imageUrl": string, "caption"?: string }],
 *     "answers"?: [{ "question": string, "answer": string, "confidence"?: number }],
 *     "fields"?: [{ "label": string, "selector"?: string, "kind"?: string,
 *                   "value"?: string, "filled"?: boolean, "needsUser"?: boolean, "note"?: string }],
 *     "error"?: string
 *   }
 *
 * Uses the service-role client (loaded inside the handler) because the worker
 * is not logged in as any user. All rows are inserted with the session's
 * `user_id` so RLS still holds for reads from the browser.
 */

import { createFileRoute } from "@tanstack/react-router";
import { stepProgress } from "@/lib/auto-apply/driver";

export const Route = createFileRoute("/api/public/hooks/auto-apply-events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.AUTO_APPLY_WORKER_SECRET;
        if (!secret) return json({ error: "worker_secret_not_configured" }, 500);

        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!timingSafeEqualStr(token, secret)) {
          return json({ error: "unauthorized" }, 401);
        }

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "invalid_json" }, 400);
        }

        const sessionId = body.sessionId;
        if (typeof sessionId !== "string" || !sessionId) {
          return json({ error: "missing_sessionId" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabaseAdmin as any;

        const sessRes = await sb
          .from("ai_application_sessions")
          .select("id, user_id, status")
          .eq("id", sessionId)
          .maybeSingle();
        const sess = sessRes.data as { id: string; user_id: string; status: string } | null;
        if (!sess) return json({ error: "session_not_found" }, 404);
        const userId = sess.user_id;

        // ---- Events ----
        const events = Array.isArray(body.events) ? (body.events as Array<Record<string, unknown>>) : [];
        if (events.length) {
          await sb.from("ai_session_events").insert(
            events.slice(0, 100).map((e) => ({
              session_id: sessionId,
              user_id: userId,
              step: typeof e.step === "string" ? e.step : null,
              kind: ["info", "warning", "error", "approval"].includes(String(e.kind))
                ? String(e.kind)
                : "info",
              message: String(e.message ?? "").slice(0, 1200),
              data: (e.data as Record<string, unknown>) ?? {},
            })),
          );
        }

        // ---- Screenshots ----
        const shots = Array.isArray(body.screenshots)
          ? (body.screenshots as Array<Record<string, unknown>>)
          : [];
        if (shots.length) {
          await sb.from("ai_session_screenshots").insert(
            shots.slice(0, 40).map((s) => ({
              session_id: sessionId,
              user_id: userId,
              step: typeof s.step === "string" ? s.step : null,
              image_url: String(s.imageUrl ?? "").slice(0, 4000),
              caption: s.caption ? String(s.caption).slice(0, 300) : null,
            })),
          );
        }

        // ---- Answers ----
        const answers = Array.isArray(body.answers) ? (body.answers as Array<Record<string, unknown>>) : [];
        if (answers.length) {
          await sb.from("ai_session_answers").insert(
            answers.slice(0, 40).map((a) => ({
              session_id: sessionId,
              user_id: userId,
              question: String(a.question ?? "").slice(0, 400),
              answer: String(a.answer ?? "").slice(0, 2400),
              confidence: typeof a.confidence === "number" ? a.confidence : null,
              source: "worker",
            })),
          );
        }

        // ---- Fields ----
        const fields = Array.isArray(body.fields) ? (body.fields as Array<Record<string, unknown>>) : [];
        if (fields.length) {
          await sb.from("ai_session_fields").insert(
            fields.slice(0, 60).map((f) => ({
              session_id: sessionId,
              user_id: userId,
              label: String(f.label ?? "").slice(0, 200),
              selector: f.selector ? String(f.selector).slice(0, 400) : null,
              kind: f.kind ? String(f.kind).slice(0, 40) : null,
              value: f.value != null ? String(f.value).slice(0, 2000) : null,
              filled: Boolean(f.filled),
              needs_user: Boolean(f.needsUser),
              note: f.note ? String(f.note).slice(0, 300) : null,
            })),
          );
        }

        // ---- Status / step patch ----
        const patch: Record<string, unknown> = {};
        if (typeof body.step === "string") {
          patch.current_step = body.step;
          patch.progress = stepProgress(body.step);
        }
        const status = typeof body.status === "string" ? body.status : null;
        if (status) {
          patch.status = status;
          if (status === "awaiting_approval") patch.approval_required_at = new Date().toISOString();
          if (status === "completed" || status === "failed" || status === "cancelled") {
            patch.finished_at = new Date().toISOString();
          }
        }
        if (typeof body.error === "string") patch.error = body.error.slice(0, 500);
        if (Object.keys(patch).length) {
          await sb.from("ai_application_sessions").update(patch).eq("id", sessionId);
        }

        return json({ ok: true });
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function timingSafeEqualStr(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
