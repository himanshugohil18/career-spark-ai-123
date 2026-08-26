import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCareerBrainSnapshotFor } from "./career-brain-logic.server";
import { computeCareerReadiness } from "./intelligence/readiness.server";
import { getNextBestActions } from "./intelligence/next-action.server";
import { computeCareerInsights } from "./intelligence/insights.server";
import { getTodayMissions } from "./intelligence/missions.server";
import { computeSkillGap, type JobForGap } from "./intelligence/skill-gap.server";

export const getCommandCenter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const brain = await getCareerBrainSnapshotFor(supabase, userId);
    const [readiness, actions, insights] = await Promise.all([
      computeCareerReadiness(supabase, userId, brain),
      getNextBestActions(supabase, userId),
      computeCareerInsights(supabase, userId, brain.skills.map((s) => s.name)),
    ]);
    const missions = await getTodayMissions(supabase, userId, actions);
    return {
      firstName: (brain.identity.fullName ?? "").split(" ")[0] || null,
      brainReady: brain.ready,
      readiness,
      actions,
      insights,
      missions,
    };
  });

export const getJobSkillGap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ jobId: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [brain, jobRes] = await Promise.all([
      getCareerBrainSnapshotFor(supabase, userId),
      supabase
        .from("jobs")
        .select("id, title, location, remote_status, experience_level, required_skills, preferred_skills, keywords, description")
        .eq("id", data.jobId)
        .maybeSingle(),
    ]);
    if (!jobRes.data) throw new Error("Job not found");
    const gap = computeSkillGap(jobRes.data as JobForGap, brain);
    return { gap, brainReady: brain.ready };
  });
