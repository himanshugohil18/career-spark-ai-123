/**
 * Recommendation cards for the Dashboard. Rule-based today, extensible.
 * Every recommendation is derived from real data (job_matches, jobs, saved_jobs).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { SupabaseClient } from "@supabase/supabase-js";

export type RecommendationCard = {
  kind: "top_matches" | "learn_skill" | "career_health" | "saved_progress" | "remote_signal";
  title: string;
  body: string;
  cta?: { label: string; href: string };
};

export async function buildRecommendations(
  supabase: SupabaseClient,
  userId: string,
): Promise<RecommendationCard[]> {
  const cards: RecommendationCard[] = [];

  const [{ data: topMatches }, { data: highMatches }, { data: saved }] = await Promise.all([
    supabase
      .from("job_matches")
      .select("id, overall_score, missing_skills, job:jobs(id, title, company_id)")
      .eq("user_id", userId)
      .order("overall_score", { ascending: false })
      .limit(3),
    supabase
      .from("job_matches")
      .select("id")
      .eq("user_id", userId)
      .gte("overall_score", 85),
    supabase
      .from("saved_jobs")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["saved","favorite","applied_later"]),
  ]);

  if ((topMatches ?? []).length > 0) {
    const avg = Math.round(
      (topMatches ?? []).reduce((s, m) => s + Number(m.overall_score ?? 0), 0) /
        Math.max(topMatches!.length, 1),
    );
    cards.push({
      kind: "top_matches",
      title: "Your strongest opportunities today",
      body: `${topMatches!.length} roles matched at an average of ${avg}%. Review them before they close.`,
      cta: { label: "Open feed", href: "/jobs" },
    });
  }

  if ((highMatches ?? []).length >= 3) {
    cards.push({
      kind: "top_matches",
      title: `${highMatches!.length} jobs perfectly match your Career Brain`,
      body: "These roles scored 85% or higher across skills, experience, and preferences.",
      cta: { label: "See high matches", href: "/jobs" },
    });
  }

  // Learn a skill — top missing skill across recent matches
  const skillCounts = new Map<string, number>();
  for (const m of topMatches ?? []) {
    const missing = (m as any).missing_skills as { skill: string; priority: string }[] | null;
    for (const ms of missing ?? []) {
      if (ms.priority !== "high") continue;
      skillCounts.set(ms.skill, (skillCounts.get(ms.skill) ?? 0) + 1);
    }
  }
  const topMissing = Array.from(skillCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topMissing) {
    // Count jobs requiring that skill
    const { count } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .contains("required_skills", [topMissing[0]]);
    cards.push({
      kind: "learn_skill",
      title: `Learning ${topMissing[0]} could unlock ${count ?? 0} additional opportunities`,
      body: "Adding this skill would strengthen your match on multiple high-priority roles.",
    });
  }

  if ((saved ?? []).length > 0) {
    cards.push({
      kind: "saved_progress",
      title: `You have ${saved!.length} saved role${saved!.length === 1 ? "" : "s"}`,
      body: "Come back to them or move them into a collection to keep momentum.",
      cta: { label: "Open saved", href: "/jobs/saved" },
    });
  }

  return cards;
}
