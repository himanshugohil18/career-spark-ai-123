/**
 * Job Discovery server functions. Real orchestrator now — no longer a stub.
 * Admin-gated. Anyone signed in can trigger a personal match refresh.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCareerBrainSnapshot, type CareerBrainSnapshot } from "./career-brain.service";
import { runDiscovery } from "./jobs/discovery.server";
import { refreshUserMatches } from "./jobs/matching.server";

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return Boolean(data);
}

export const discoverJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ providerIds: z.array(z.string()).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context.supabase, context.userId);
    if (!admin) {
      throw new Error("Only admins can trigger discovery.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const stats = await runDiscovery(supabaseAdmin, { providerIds: data.providerIds });
    return stats;
  });

export const refreshMyMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().min(1).max(200).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const brain = (await getCareerBrainSnapshot()) as CareerBrainSnapshot;
    if (!brain.ready) {
      throw new Error("Approve your Career Brain first, then we'll match you against jobs.");
    }
    const result = await refreshUserMatches(context.supabase, brain, { limit: data.limit ?? 80 });
    if (result.evaluated > 0 || result.skipped > 0 || result.upserted > 0) {
      if (result.newMatches.length) {
        const { notifyNewJobMatches } = await import("./email/notify-matches.server");
        await notifyNewJobMatches(context.supabase, context.userId, result.newMatches);
      }
      return result;
    }

    // Only hit external providers when the catalog cannot produce matches.
    // This keeps the user-facing refresh fast and avoids Worker timeouts.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count: jobsCount } = await supabaseAdmin
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      if ((jobsCount ?? 0) === 0) {
        const { buildProfileFromSnapshot } = await import("./jobs/role-synonyms");
        const candidateProfile = buildProfileFromSnapshot(brain);
        await runDiscovery(supabaseAdmin, { candidateProfile });
        const retry = await refreshUserMatches(context.supabase, brain, { limit: data.limit ?? 80 });
        if (retry.newMatches.length) {
          const { notifyNewJobMatches } = await import("./email/notify-matches.server");
          await notifyNewJobMatches(context.supabase, context.userId, retry.newMatches);
        }
        return retry;
      }
    } catch {
      // Providers may fail transiently; return the deterministic result.
    }
    return result;
  });
