import { computeCompleteness } from "./completeness";
import type { CareerBrainSnapshot } from "./career-brain.service";

export async function getCareerBrainSnapshotFor(
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
    supabase.from("resumes").select("*").eq("user_id", userId).order("version", { ascending: false }),
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

  const failures = [
    ["profile", profile.error], ["resumes", resumes.error], ["career brain", brain.error],
    ["career DNA", dna.error], ["career health", health.error], ["skills", skills.error],
    ["experience", experiences.error], ["projects", projects.error], ["education", education.error],
    ["certifications", certifications.error], ["languages", languages.error], ["achievements", achievements.error],
  ] as const;
  const failure = failures.find(([, error]) => Boolean(error));
  if (failure) {
    const [resource, error] = failure;
    throw new Error(`Could not load ${resource}: ${error?.message ?? "Unknown database error"}`);
  }

  const p = profile.data as Record<string, unknown> | null;
  const b = brain.data as Record<string, unknown> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeResume = (resumes.data ?? []).find((row: any) => row.is_active) as Record<string, unknown> | undefined;
  const completeness = computeCompleteness({
    profile: p as Parameters<typeof computeCompleteness>[0]["profile"],
    certificationsCount: certifications.data?.length ?? 0,
    projectsCount: projects.data?.length ?? 0,
  });

  return {
    userId,
    ready: Boolean(b),
    metadata: {
      brainVersion: (b?.version as number | null) ?? null,
      resumeVersion: (activeResume?.version as number | null) ?? null,
      resumeId: (activeResume?.id as string | null) ?? null,
      resumeName: (activeResume?.file_name as string | null) ?? null,
      aiModel: (b?.ai_model as string | null) ?? (activeResume?.ai_model as string | null) ?? null,
      overallConfidence: (b?.overall_confidence as number | null) ?? (activeResume?.overall_confidence as number | null) ?? null,
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
    skills: (skills.data ?? []).map((skill: any) => ({
      category: skill.category ?? "",
      name: skill.name ?? "",
      confidence: skill.confidence ?? null,
      userVerified: Boolean(skill.user_verified),
    })),
    experiences: experiences.data ?? [], projects: projects.data ?? [], education: education.data ?? [],
    certifications: certifications.data ?? [], languages: languages.data ?? [], achievements: achievements.data ?? [],
    brain: b, dna: dna.data, health: health.data,
  };
}