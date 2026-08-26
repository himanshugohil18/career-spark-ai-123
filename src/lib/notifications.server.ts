/**
 * Smart notification engine — server-only.
 * Generates notifications from real events (new high matches, stale saved
 * jobs, roadmap progress) respecting per-user notification preferences.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type Ctx = { supabase: SupabaseClient<any>; userId: string };

export const DEFAULT_PREFS = {
  job_matches: true,
  follow_ups: true,
  skill_gaps: true,
  interview_reminders: true,
  roadmap_progress: true,
  career_insights: true,
};

export async function getOrCreatePrefs(c: Ctx) {
  const { data } = await c.supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", c.userId)
    .maybeSingle();
  if (data) return data;
  const { data: created, error } = await c.supabase
    .from("notification_preferences")
    .insert({ user_id: c.userId, ...DEFAULT_PREFS })
    .select("*")
    .single();
  if (error) return { user_id: c.userId, ...DEFAULT_PREFS } as any;
  return created;
}

export async function updatePrefs(c: Ctx, patch: Record<string, boolean>) {
  await getOrCreatePrefs(c);
  const allowed = [
    "job_matches",
    "follow_ups",
    "skill_gaps",
    "interview_reminders",
    "roadmap_progress",
    "career_insights",
  ];
  const clean: Record<string, boolean> = {};
  for (const k of allowed) if (typeof patch[k] === "boolean") clean[k] = patch[k];
  const { error } = await c.supabase
    .from("notification_preferences")
    .update(clean)
    .eq("user_id", c.userId);
  if (error) throw new Error(error.message);
  return getOrCreatePrefs(c);
}

async function alreadyNotified(c: Ctx, kind: string, jobId: string | null) {
  let q = c.supabase
    .from("job_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", c.userId)
    .eq("kind", kind);
  if (jobId) q = q.eq("job_id", jobId);
  const { count } = await q;
  return (count ?? 0) > 0;
}

export async function generateSmartNotifications(c: Ctx) {
  const prefs = await getOrCreatePrefs(c);
  let created = 0;

  // 1. New high matches (last 48h, score >= 80)
  if (prefs.job_matches) {
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data: matches } = await c.supabase
      .from("job_matches")
      .select("overall_score, job_id, job:jobs(title, company:companies(name))")
      .eq("user_id", c.userId)
      .gte("overall_score", 80)
      .gte("created_at", since)
      .order("overall_score", { ascending: false })
      .limit(5);
    for (const m of (matches ?? []) as any[]) {
      if (!m.job_id || (await alreadyNotified(c, "new_high_match", m.job_id))) continue;
      await c.supabase.from("job_notifications").insert({
        user_id: c.userId,
        job_id: m.job_id,
        kind: "new_high_match",
        title: `${Math.round(m.overall_score)}% match — ${m.job?.title ?? "New role"}`,
        body: `${m.job?.company?.name ?? "A company"} posted a role that strongly matches your Career Brain.`,
        link: `/jobs/${m.job_id}`,
      });
      created += 1;
    }
  }

  // 2. Saved jobs going stale (saved > 7 days ago, still active, not applied)
  if (prefs.follow_ups) {
    const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data: stale } = await c.supabase
      .from("saved_jobs")
      .select("job_id, job:jobs(title, expires_at, company:companies(name))")
      .eq("user_id", c.userId)
      .eq("status", "saved")
      .lte("created_at", cutoff)
      .limit(5);
    for (const s of (stale ?? []) as any[]) {
      if (!s.job_id || (await alreadyNotified(c, "application_reminder", s.job_id))) continue;
      await c.supabase.from("job_notifications").insert({
        user_id: c.userId,
        job_id: s.job_id,
        kind: "application_reminder",
        title: `Still interested in ${s.job?.title ?? "this role"}?`,
        body: `You saved this role at ${s.job?.company?.name ?? "a company"} over a week ago. Apply before it closes.`,
        link: `/jobs/${s.job_id}`,
      });
      created += 1;
    }
  }

  // 3. Roadmap progress (items completed in last 24h → encouragement, once per day)
  if (prefs.roadmap_progress) {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: done } = await c.supabase
      .from("career_roadmap_items")
      .select("id")
      .eq("user_id", c.userId)
      .eq("status", "completed")
      .gte("updated_at", since);
    if ((done ?? []).length > 0) {
      const { count } = await c.supabase
        .from("job_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", c.userId)
        .eq("kind", "system")
        .gte("created_at", since);
      if ((count ?? 0) === 0) {
        await c.supabase.from("job_notifications").insert({
          user_id: c.userId,
          kind: "system",
          title: "Roadmap progress logged",
          body: `You completed ${(done ?? []).length} roadmap step(s) today. Momentum compounds — keep going.`,
          link: "/roadmap",
        });
        created += 1;
      }
    }
  }

  return { created };
}
