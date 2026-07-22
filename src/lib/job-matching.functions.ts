/**
 * Job Matching server function — recomputes a single (user, job) match on demand.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCareerBrainSnapshot, type CareerBrainSnapshot } from "./career-brain.service";
import { computeMatch, persistMatch } from "./jobs/matching.server";
import type { NormalizedJob } from "./jobs/types";

function rowToNormalized(row: any): NormalizedJob {
  return {
    title: row.title,
    company: {
      name: row.company?.name ?? "",
      slug: row.company?.slug ?? "",
      domain: row.company?.domain ?? null,
      logoUrl: row.company?.logo_url ?? null,
      website: row.company?.website ?? null,
      industry: row.company?.industry ?? null,
      size: row.company?.size ?? null,
      remotePolicy: row.company?.remote_policy ?? null,
      techStack: (row.company?.tech_stack as string[] | null) ?? [],
      description: row.company?.description ?? null,
    },
    location: row.location ?? null,
    locationCountry: row.location_country ?? null,
    remoteStatus: row.remote_status,
    employmentType: row.employment_type,
    experienceLevel: row.experience_level,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    salaryCurrency: row.salary_currency,
    description: row.description ?? "",
    responsibilities: row.responsibilities ?? [],
    requirements: row.requirements ?? [],
    requiredSkills: row.required_skills ?? [],
    preferredSkills: row.preferred_skills ?? [],
    benefits: row.benefits ?? [],
    applicationUrl: row.application_url,
    provider: row.provider,
    sourceId: row.source_id,
    postedAt: row.posted_at,
    expiresAt: row.expires_at,
  };
}

export const matchJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const brain = (await getCareerBrainSnapshot()) as CareerBrainSnapshot;
    if (!brain.ready) {
      throw new Error("Approve your Career Brain first.");
    }
    const { data: row, error } = await context.supabase
      .from("jobs")
      .select("*, company:companies(*)")
      .eq("id", data.jobId)
      .maybeSingle();
    if (error || !row) throw new Error("Job not found.");
    const score = await computeMatch(brain, rowToNormalized(row));
    await persistMatch(context.supabase, brain.userId, row.id, brain.metadata.brainVersion, score);
    return score;
  });
