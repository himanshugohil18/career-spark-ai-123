/**
 * Cron endpoint: run global job discovery across all enabled providers.
 * Auth: server-only shared secret (AUTO_APPLY_WORKER_SECRET) via
 * `Authorization: Bearer`, `x-cron-secret`, or `apikey` header.
 */

import { createFileRoute } from "@tanstack/react-router";
import { runDiscovery } from "@/lib/jobs/discovery.server";
import { isAuthorizedCronRequestAsync } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/hooks/discover-jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await isAuthorizedCronRequestAsync(request))) {
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
