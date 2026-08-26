import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_JOB_PREFERENCES, type JobPreferences } from "./job-preferences";

const PrefsSchema = z.object({
  preferredRoles: z.array(z.string().max(120)).max(20).optional(),
  preferredLocations: z.array(z.string().max(120)).max(30).optional(),
  preferredCountries: z.array(z.string().max(80)).max(20).optional(),
  preferredRegions: z.array(z.string().max(40)).max(10).optional(),
  workModes: z.array(z.enum(["remote", "hybrid", "onsite"])).max(3).optional(),
  experienceLevels: z.array(z.string().max(30)).max(12).optional(),
  employmentTypes: z.array(z.string().max(30)).max(8).optional(),
  salaryMin: z.number().nonnegative().nullable().optional(),
  salaryMax: z.number().nonnegative().nullable().optional(),
  salaryCurrency: z.string().max(6).optional(),
  salaryPeriod: z.enum(["month", "year"]).optional(),
  willingToRelocate: z.boolean().optional(),
  openToInternational: z.boolean().optional(),
  includeStretch: z.boolean().optional(),
  strictSalaryFilter: z.boolean().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(row: any): JobPreferences {
  if (!row) return { ...DEFAULT_JOB_PREFERENCES };
  return {
    preferredRoles: row.preferred_roles ?? [],
    preferredLocations: row.preferred_locations ?? [],
    preferredCountries: row.preferred_countries ?? [],
    preferredRegions: row.preferred_regions ?? [],
    workModes: row.work_modes ?? [],
    experienceLevels: row.experience_levels ?? [],
    employmentTypes: row.employment_types ?? [],
    salaryMin: row.salary_min == null ? null : Number(row.salary_min),
    salaryMax: row.salary_max == null ? null : Number(row.salary_max),
    salaryCurrency: row.salary_currency ?? "INR",
    salaryPeriod: row.salary_period === "month" ? "month" : "year",
    willingToRelocate: !!row.willing_to_relocate,
    openToInternational: !!row.open_to_international,
    includeStretch: row.include_stretch ?? true,
    strictSalaryFilter: !!row.strict_salary_filter,
  };
}

export const getJobPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("job_preferences")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    return fromRow(data);
  });

export const saveJobPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PrefsSchema.parse(input))
  .handler(async ({ context, data }) => {
    const patch: Record<string, unknown> = { user_id: context.userId };
    const map: Record<string, string> = {
      preferredRoles: "preferred_roles",
      preferredLocations: "preferred_locations",
      preferredCountries: "preferred_countries",
      preferredRegions: "preferred_regions",
      workModes: "work_modes",
      experienceLevels: "experience_levels",
      employmentTypes: "employment_types",
      salaryMin: "salary_min",
      salaryMax: "salary_max",
      salaryCurrency: "salary_currency",
      salaryPeriod: "salary_period",
      willingToRelocate: "willing_to_relocate",
      openToInternational: "open_to_international",
      includeStretch: "include_stretch",
      strictSalaryFilter: "strict_salary_filter",
    };
    for (const [key, col] of Object.entries(map)) {
      const v = (data as Record<string, unknown>)[key];
      if (v !== undefined) patch[col] = v;
    }
    const { data: row, error } = await context.supabase
      .from("job_preferences")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(patch as any, { onConflict: "user_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return fromRow(row);
  });
