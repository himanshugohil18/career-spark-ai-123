import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** One call to hydrate the whole workspace — dashboard + profile use it. */
export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [
      profile,
      resumes,
      experiences,
      projects,
      education,
      certifications,
      languages,
      skills,
      achievements,
      brain,
      health,
      dna,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("resumes")
        .select("id, version, file_name, file_size, mime_type, status, is_active, created_at, parsed_at, error_message")
        .eq("user_id", userId)
        .order("version", { ascending: false }),
      supabase.from("work_experiences").select("*").eq("user_id", userId).order("sort_order"),
      supabase.from("projects").select("*").eq("user_id", userId).order("sort_order"),
      supabase.from("education").select("*").eq("user_id", userId).order("sort_order"),
      supabase.from("certifications").select("*").eq("user_id", userId).order("sort_order"),
      supabase.from("languages").select("*").eq("user_id", userId).order("sort_order"),
      supabase.from("skills").select("*").eq("user_id", userId).order("category").order("sort_order"),
      supabase.from("achievements").select("*").eq("user_id", userId).order("sort_order"),
      supabase.from("career_brain").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("career_health").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("career_dna").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    return {
      profile: profile.data,
      resumes: resumes.data ?? [],
      experiences: experiences.data ?? [],
      projects: projects.data ?? [],
      education: education.data ?? [],
      certifications: certifications.data ?? [],
      languages: languages.data ?? [],
      skills: skills.data ?? [],
      achievements: achievements.data ?? [],
      careerBrain: brain.data,
      careerHealth: health.data,
      careerDna: dna.data,
    };
  });

const ProfilePatchSchema = z.object({
  full_name: z.string().max(200).nullable().optional(),
  phone: z.string().max(60).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  linkedin_url: z.string().max(400).nullable().optional(),
  github_url: z.string().max(400).nullable().optional(),
  portfolio_url: z.string().max(400).nullable().optional(),
  website_url: z.string().max(400).nullable().optional(),
  professional_summary: z.string().max(4000).nullable().optional(),
  current_title: z.string().max(200).nullable().optional(),
  years_of_experience: z.number().min(0).max(80).nullable().optional(),
  preferred_role: z.string().max(200).nullable().optional(),
  preferred_location: z.string().max(200).nullable().optional(),
  expected_salary: z.string().max(120).nullable().optional(),
  avatar_url: z.string().max(400).nullable().optional(),
});


export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ProfilePatchSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DeleteInput = z.object({
  table: z.enum([
    "work_experiences",
    "projects",
    "education",
    "certifications",
    "languages",
    "skills",
    "achievements",
    "resumes",
  ]),
  id: z.string().uuid(),
});

export const deleteRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => DeleteInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from(data.table)
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Update a single entity row. Marks `user_verified=true` so downstream
 * modules know this value has been human-corrected. Never overwrites
 * the original AI extraction stored in `ai_original`.
 */
const UpdateEntityInput = z.object({
  table: z.enum([
    "work_experiences",
    "projects",
    "education",
    "certifications",
    "languages",
    "skills",
    "achievements",
  ]),
  id: z.string().uuid(),
  patch: z.record(z.string(), z.unknown()),
});

export const updateEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => UpdateEntityInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch = { ...data.patch, user_verified: true };
    // Never mutate ai_original — it's the immutable AI snapshot.
    delete (patch as Record<string, unknown>).ai_original;
    const { error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from(data.table as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(patch as any)
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

