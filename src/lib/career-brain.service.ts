/**
 * Career Brain Service — the single source of truth for every downstream
 * module. Job Discovery, Matching, Optimizer, Cover Letter, Interview Prep
 * ALL consume `getCareerBrainSnapshot` instead of re-parsing resumes.
 *
 * Do not add UI here. Do not add fetch/mutation logic. This is a pure
 * server-side aggregator over the normalized tables the review + approve
 * flow already populates.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeCompleteness } from "./completeness";

export type CareerBrainSnapshot = {
  userId: string;
  ready: boolean; // true once at least one resume is approved
  metadata: {
    brainVersion: number | null;
    resumeVersion: number | null;
    resumeId: string | null;
    resumeName: string | null;
    aiModel: string | null;
    overallConfidence: number | null;
    lastGeneratedAt: string | null;
    lastUpdatedAt: string | null;
    completenessScore: number | null;
  };
  identity: {
    fullName: string | null;
    currentTitle: string | null;
    location: string | null;
    yearsOfExperience: number | null;
    email: string | null;
    phone: string | null;
    links: {
      linkedin: string | null;
      github: string | null;
      portfolio: string | null;
      website: string | null;
    };
    preferences: {
      preferredRole: string | null;
      preferredLocation: string | null;
      expectedSalary: string | null;
    };
    professionalSummary: string | null;
  };
  skills: Array<{ category: string; name: string; confidence: number | null; userVerified: boolean }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  experiences: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  projects: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  education: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  certifications: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  languages: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  achievements: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  brain: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dna: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  health: any | null;
};

export const getCareerBrainSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const snapshot = await buildSnapshot(context.supabase, context.userId);
    return snapshot as unknown as CareerBrainSnapshot;
  });

/**
 * Direct helper for other server-side flows that already hold a Supabase
 * client + userId (e.g. approveResume) and don't want the RPC round-trip.
 */
export async function getCareerBrainSnapshotFor(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<CareerBrainSnapshot> {
  return buildSnapshot(supabase, userId);
}


async function buildSnapshot(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<CareerBrainSnapshot> {
    

    const [
      profile,
      resumes,
      brain,
      dna,
      health,
      skills,
      experiences,
      projects,
      education,
      certifications,
      languages,
      achievements,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("resumes")
        .select("*")
        .eq("user_id", userId)
        .order("version", { ascending: false }),
      supabase.from("career_brain").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("career_dna").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("career_health").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("skills").select("*").eq("user_id", userId).order("category").order("sort_order"),
      supabase.from("work_experiences").select("*").eq("user_id", userId).order("sort_order"),
      supabase.from("projects").select("*").eq("user_id", userId).order("sort_order"),
      supabase.from("education").select("*").eq("user_id", userId).order("sort_order"),
      supabase.from("certifications").select("*").eq("user_id", userId).order("sort_order"),
      supabase.from("languages").select("*").eq("user_id", userId).order("sort_order"),
      supabase.from("achievements").select("*").eq("user_id", userId).order("sort_order"),
    ]);

    const p = profile.data as Record<string, unknown> | null;
    const b = brain.data as Record<string, unknown> | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeResume = (resumes.data ?? []).find((r: any) => r.is_active) as
      | Record<string, unknown>
      | undefined;
    const completeness = computeCompleteness({
      profile: p as Parameters<typeof computeCompleteness>[0]["profile"],
      certificationsCount: certifications.data?.length ?? 0,
      projectsCount: projects.data?.length ?? 0,
    });

    return {
      userId,
      ready: !!b,
      metadata: {
        brainVersion: (b?.version as number | null) ?? null,
        resumeVersion: (activeResume?.version as number | null) ?? null,
        resumeId: (activeResume?.id as string | null) ?? null,
        resumeName: (activeResume?.file_name as string | null) ?? null,
        aiModel: (b?.ai_model as string | null) ?? (activeResume?.ai_model as string | null) ?? null,
        overallConfidence:
          (b?.overall_confidence as number | null) ??
          (activeResume?.overall_confidence as number | null) ??
          null,
        lastGeneratedAt: (b?.last_generated_at as string | null) ?? null,
        lastUpdatedAt: (b?.updated_at as string | null) ?? null,
        completenessScore: completeness.score,
      },
      identity: {
        fullName: (p?.full_name as string | null) ?? null,
        currentTitle: (p?.current_title as string | null) ?? null,
        location: (p?.location as string | null) ?? null,
        yearsOfExperience: (p?.years_of_experience as number | null) ?? null,
        email: (p?.email as string | null) ?? null,
        phone: (p?.phone as string | null) ?? null,
        links: {
          linkedin: (p?.linkedin_url as string | null) ?? null,
          github: (p?.github_url as string | null) ?? null,
          portfolio: (p?.portfolio_url as string | null) ?? null,
          website: (p?.website_url as string | null) ?? null,
        },
        preferences: {
          preferredRole: (p?.preferred_role as string | null) ?? null,
          preferredLocation: (p?.preferred_location as string | null) ?? null,
          expectedSalary: (p?.expected_salary as string | null) ?? null,
        },
        professionalSummary: (p?.professional_summary as string | null) ?? null,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      skills: (skills.data ?? []).map((s: any) => {
        const row = s as Record<string, unknown>;
        return {
          category: (row.category as string) ?? "",
          name: (row.name as string) ?? "",
          confidence: (row.confidence as number | null) ?? null,
          userVerified: Boolean(row.user_verified),
        };
      }),
      experiences: experiences.data ?? [],
      projects: projects.data ?? [],
      education: education.data ?? [],
      certifications: certifications.data ?? [],
      languages: languages.data ?? [],
      achievements: achievements.data ?? [],
      brain: b,
      dna: dna.data,
      health: health.data,
    };
}

