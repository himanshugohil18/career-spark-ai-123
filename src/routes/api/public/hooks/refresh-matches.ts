/**
 * Cron endpoint: refresh AI matches for every user with an approved Career Brain.
 * Runs in batches to keep per-invocation cost bounded.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createFileRoute } from "@tanstack/react-router";
import { computeMatch, persistMatch } from "@/lib/jobs/matching.server";
import { computeCompleteness } from "@/lib/completeness";
import { isAuthorizedCronRequest } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/hooks/refresh-matches")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorizedCronRequest(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const stats = await refreshAll(supabaseAdmin);
          return Response.json({ ok: true, stats });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return new Response(JSON.stringify({ ok: false, error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

async function refreshAll(admin: any) {
  const { data: brains } = await admin
    .from("career_brain")
    .select("user_id, version");
  const stats = { users: 0, jobsMatched: 0 };
  const { data: newestJobs } = await admin
    .from("jobs")
    .select("*, company:companies(*)")
    .eq("is_active", true)
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(30);

  for (const b of brains ?? []) {
    stats.users++;
    // Build a minimal snapshot server-side (avoid the isomorphic snapshot helper).
    const [{ data: profile }, { data: skills }, { data: edu }, { data: certs }, { data: dna }] =
      await Promise.all([
        admin.from("profiles").select("*").eq("user_id", b.user_id).maybeSingle(),
        admin.from("skills").select("*").eq("user_id", b.user_id),
        admin.from("education").select("*").eq("user_id", b.user_id),
        admin.from("certifications").select("*").eq("user_id", b.user_id),
        admin.from("career_dna").select("*").eq("user_id", b.user_id).maybeSingle(),
      ]);
    const brain = {
      userId: b.user_id,
      ready: true,
      metadata: {
        brainVersion: b.version, resumeVersion: null, resumeId: null, resumeName: null,
        aiModel: null, overallConfidence: null, lastGeneratedAt: null, lastUpdatedAt: null,
        completenessScore: computeCompleteness({
          profile: profile as any,
          certificationsCount: certs?.length ?? 0,
          projectsCount: 0,
        }).score,
      },
      identity: {
        fullName: profile?.full_name ?? null,
        currentTitle: profile?.current_title ?? null,
        location: profile?.location ?? null,
        yearsOfExperience: profile?.years_of_experience ?? null,
        email: profile?.email ?? null,
        phone: profile?.phone ?? null,
        links: {
          linkedin: profile?.linkedin_url ?? null,
          github: profile?.github_url ?? null,
          portfolio: profile?.portfolio_url ?? null,
          website: profile?.website_url ?? null,
        },
        preferences: {
          preferredRole: profile?.preferred_role ?? null,
          preferredLocation: profile?.preferred_location ?? null,
          expectedSalary: profile?.expected_salary ?? null,
        },
        professionalSummary: profile?.professional_summary ?? null,
      },
      skills: (skills ?? []).map((s: any) => ({
        category: s.category, name: s.name, confidence: s.confidence, userVerified: !!s.user_verified,
      })),
      experiences: [], projects: [], education: edu ?? [], certifications: certs ?? [],
      languages: [], achievements: [], brain: null, dna: dna ?? null, health: null,
    };

    for (const row of newestJobs ?? []) {
      const job = {
        title: row.title,
        company: {
          name: row.company?.name ?? "", slug: row.company?.slug ?? "",
          domain: null, logoUrl: row.company?.logo_url ?? null, website: null,
          industry: row.company?.industry ?? null, size: null, remotePolicy: null,
          techStack: (row.company?.tech_stack as string[]) ?? [], description: null,
        },
        location: row.location, locationCountry: row.location_country,
        remoteStatus: row.remote_status, employmentType: row.employment_type,
        experienceLevel: row.experience_level,
        salaryMin: row.salary_min, salaryMax: row.salary_max, salaryCurrency: row.salary_currency,
        description: row.description ?? "",
        responsibilities: row.responsibilities ?? [],
        requirements: row.requirements ?? [],
        requiredSkills: row.required_skills ?? [],
        preferredSkills: row.preferred_skills ?? [],
        benefits: row.benefits ?? [],
        applicationUrl: row.application_url,
        provider: row.provider, sourceId: row.source_id,
        postedAt: row.posted_at, expiresAt: row.expires_at,
      };
      const score = await computeMatch(brain as any, job as any);
      await persistMatch(admin, b.user_id, row.id, b.version, score);
      stats.jobsMatched++;
    }
  }
  return stats;
}
