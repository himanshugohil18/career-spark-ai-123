/**
 * Weekly Career Summary cron endpoint.
 *
 * Called by pg_cron once per week. Iterates active users, computes their
 * last-7-day activity from live tables, and sends the branded weekly
 * summary email through Resend. Rate-limited per-recipient inside the
 * sender (6-day window keyed by weekLabel) so accidental re-runs won't
 * duplicate.
 *
 * Auth: Bearer <AUTO_APPLY_WORKER_SECRET>
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/weekly-summary")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.AUTO_APPLY_WORKER_SECRET;
        if (!secret) return json({ error: "worker_secret_not_configured" }, 500);
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!timingSafeEqualStr(token, secret)) return json({ error: "unauthorized" }, 401);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabaseAdmin as any;

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
        const weekLabel = `${fmt(new Date(now.getTime() - 7 * 86_400_000))} – ${fmt(now)}`;

        // Users who have been active in the last 30 days OR have a Career Brain.
        const { data: profiles } = await sb
          .from("profiles")
          .select("user_id, email, full_name")
          .not("email", "is", null)
          .limit(2000);

        let sent = 0, skipped = 0, failed = 0;
        for (const p of (profiles ?? []) as Array<{ user_id: string; email: string; full_name: string | null }>) {
          try {
            const [apps, interviews, resumes, newJobs] = await Promise.all([
              sb.from("application_workspaces").select("id", { count: "exact", head: true })
                .eq("user_id", p.user_id).gte("created_at", weekAgo),
              sb.from("interview_sessions").select("id", { count: "exact", head: true })
                .eq("user_id", p.user_id).gte("created_at", weekAgo),
              sb.from("resume_versions").select("id", { count: "exact", head: true })
                .eq("user_id", p.user_id).gte("created_at", weekAgo),
              sb.from("job_matches").select("id", { count: "exact", head: true })
                .eq("user_id", p.user_id).gte("computed_at", weekAgo),
            ]);

            const applications = apps.count ?? 0;
            const interviewCount = interviews.count ?? 0;
            const resumeImprovements = resumes.count ?? 0;
            const newJobCount = newJobs.count ?? 0;

            // Skip completely inactive users this week.
            if (applications + interviewCount + resumeImprovements + newJobCount === 0) {
              skipped++;
              continue;
            }

            const insights: string[] = [];
            if (newJobCount > 0) insights.push(`${newJobCount} new roles matched your Career Brain this week.`);
            if (applications > 0) insights.push(`You submitted ${applications} application${applications === 1 ? "" : "s"} — keep the momentum.`);
            if (interviewCount > 0) insights.push(`${interviewCount} interview practice session${interviewCount === 1 ? "" : "s"} completed.`);
            if (resumeImprovements > 0) insights.push(`Your resume was updated ${resumeImprovements} time${resumeImprovements === 1 ? "" : "s"}.`);
            if (!insights.length) insights.push("Explore new job matches to keep your search moving.");

            const { sendWeeklyCareerSummaryEmail } = await import("@/lib/email/senders.server");
            const res = await sendWeeklyCareerSummaryEmail(p.email, {
              name: p.full_name,
              weekLabel,
              applications,
              interviews: interviewCount,
              resumeImprovements,
              newJobs: newJobCount,
              insights,
              userId: p.user_id,
            });
            if (res.sent) sent++;
            else skipped++;
          } catch (e) {
            failed++;
            console.warn("[weekly-summary]", p.user_id, (e as Error).message);
          }
        }

        return json({ ok: true, sent, skipped, failed, weekLabel });
      },
    },
  },
});

function fmt(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
function timingSafeEqualStr(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
