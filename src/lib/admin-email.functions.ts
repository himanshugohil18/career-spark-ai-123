import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: unknown; userId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = ctx.supabase as any;
  const { data, error } = await sb.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

const startOfDayIso = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};

export const getEmailAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = startOfDayIso();

    const [{ count: sentToday }, { count: failedToday }, { count: throttledToday }, byTemplateRes] = await Promise.all([
      supabaseAdmin
        .from("email_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent")
        .gte("created_at", today),
      supabaseAdmin
        .from("email_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("created_at", today),
      supabaseAdmin
        .from("email_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "throttled")
        .gte("created_at", today),
      supabaseAdmin
        .from("email_logs")
        .select("template, status, retry_count")
        .gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString())
        .limit(2000),
    ]);

    const byTemplate = new Map<string, { sent: number; failed: number; throttled: number; retries: number }>();
    let totalRetries = 0;
    for (const row of (byTemplateRes.data ?? []) as Array<{ template: string; status: string; retry_count: number | null }>) {
      const t = row.template ?? "unknown";
      const bucket = byTemplate.get(t) ?? { sent: 0, failed: 0, throttled: 0, retries: 0 };
      if (row.status === "sent") bucket.sent += 1;
      else if (row.status === "failed") bucket.failed += 1;
      else if (row.status === "throttled") bucket.throttled += 1;
      const r = row.retry_count ?? 0;
      bucket.retries += r;
      totalRetries += r;
      byTemplate.set(t, bucket);
    }

    const templateStats = Array.from(byTemplate.entries())
      .map(([template, s]) => ({ template, ...s, total: s.sent + s.failed + s.throttled }))
      .sort((a, b) => b.total - a.total);

    const totalToday = (sentToday ?? 0) + (failedToday ?? 0);
    const successRate = totalToday > 0 ? Math.round(((sentToday ?? 0) / totalToday) * 1000) / 10 : 100;

    return {
      sentToday: sentToday ?? 0,
      failedToday: failedToday ?? 0,
      throttledToday: throttledToday ?? 0,
      successRate,
      totalRetries,
      templateStats,
    };
  });

const ListInput = z.object({
  limit: z.number().int().min(1).max(200).default(100),
  status: z.enum(["sent", "failed", "throttled", "all"]).default("all"),
  template: z.string().max(80).optional(),
});

export const listEmailLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ListInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("email_logs")
      .select("id, recipient, template, subject, status, provider_message_id, retry_count, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.template) q = q.eq("template", data.template);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });
