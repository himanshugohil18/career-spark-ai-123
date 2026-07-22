/**
 * Career Brain activation pipeline.
 *
 * Runs the full downstream flow after a Career Brain is generated or refreshed:
 *   discovery → normalize/seed → per-user AI matching → summary notification.
 *
 * Fired automatically from:
 *   - approveResume (first resume approval or reapproval)
 *   - setActiveResume (switching to another approved version)
 * The Jobs page/Dashboard bootstrap (`ensureInitialMatches`) is a safety net
 * — after this helper runs the user already sees personalized recommendations.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CareerBrainSnapshot } from "@/lib/career-brain.service";

export type ActivationResult = {
  ok: boolean;
  discovered: number;
  seeded: number;
  evaluated: number;
  matches: number;
  topScore: number;
  notified: boolean;
};

/**
 * Runs discovery + matching for the caller's Career Brain, then writes a
 * single "career_brain_activated" summary notification like:
 *   "42 new opportunities matched your Career Brain."
 *
 * Idempotent by nature: `refreshUserMatches` skips (user, job) pairs already
 * scored for the same brain version within its stale window, and the
 * summary notification is only inserted when at least one match exists.
 */
export async function activateCareerBrainPipeline(
  userSupabase: SupabaseClient,
  brain: CareerBrainSnapshot,
): Promise<ActivationResult> {
  const empty: ActivationResult = {
    ok: false, discovered: 0, seeded: 0, evaluated: 0, matches: 0, topScore: 0, notified: false,
  };
  if (!brain.ready) return empty;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1. Ensure the global job catalog has data (discovery + dev seed fallback).
  //    Discovery is driven by the Career Brain: the CandidateProfile decides
  //    which families are allowed, which are excluded, and which role queries
  //    are used to match provider results.
  let discovered = 0;
  const seeded = 0;
  try {
    const { runDiscovery } = await import("./discovery.server");
    const { buildProfileFromSnapshot } = await import("./role-synonyms");
    const candidateProfile = buildProfileFromSnapshot(brain);
    const d = await runDiscovery(supabaseAdmin, { candidateProfile });
    discovered = (d as any)?.inserted ?? (d as any)?.upserted ?? 0;
  } catch {
    // Providers may rate-limit or fail transiently; matching still runs
    // against whatever real jobs already exist in the catalog.
  }

  // 2. Score every recent job against this Career Brain.
  const { refreshUserMatches } = await import("./matching.server");
  const match = await refreshUserMatches(userSupabase, brain, { limit: 40 });

  // 3. Summary notification — one per activation, dedup within 6 hours so
  //    reapprovals / brain version bumps don't spam the bell.
  const { data: topRows, count: matchesCount } = await userSupabase
    .from("job_matches")
    .select("overall_score", { count: "exact" })
    .eq("user_id", brain.userId)
    .order("overall_score", { ascending: false })
    .limit(1);

  const total = matchesCount ?? 0;
  const topScore = Math.round(Number(topRows?.[0]?.overall_score ?? 0));

  let notified = false;
  if (total > 0) {
    const cutoff = new Date(Date.now() - 6 * 3_600_000).toISOString();
    const { data: recent } = await userSupabase
      .from("job_notifications")
      .select("id")
      .eq("user_id", brain.userId)
      .eq("kind", "career_brain_activated")
      .gte("created_at", cutoff)
      .limit(1);
    if (!recent || recent.length === 0) {
      const title = `${total} new opportunities matched your Career Brain.`;
      const body = topScore
        ? `Top match: ${topScore}% · ranked by skills, tech, experience, and preferences.`
        : "Personalized recommendations are ready on your Jobs feed.";
      await userSupabase.from("job_notifications").insert({
        user_id: brain.userId,
        job_id: null,
        kind: "career_brain_activated",
        title,
        body,
      });
      notified = true;
    }
  }

  return {
    ok: true,
    discovered,
    seeded,
    evaluated: match.evaluated,
    matches: total,
    topScore,
    notified,
  };
}
