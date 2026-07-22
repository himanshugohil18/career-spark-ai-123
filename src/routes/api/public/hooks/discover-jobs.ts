/**
 * Cron endpoint: run global job discovery across all enabled providers.
 * Called by pg_cron. Auth uses the shared `apikey` header (Supabase anon key)
 * per the platform's public-cron pattern.
 */

import { createFileRoute } from "@tanstack/react-router";
import { runDiscovery } from "@/lib/jobs/discovery.server";

export const Route = createFileRoute("/api/public/hooks/discover-jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apikey || !expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const stats = await runDiscovery(supabaseAdmin);
          return Response.json({ ok: true, stats });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
