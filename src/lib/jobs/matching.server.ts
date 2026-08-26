/**
 * AI Matching Engine.
 *
 * 1. Compute deterministic baseline scores (`scoring.ts`).
 * 2. Call Gemini for a qualitative refinement (± up to 15% on each sub-score),
 *    strengths, weaknesses, missing skills, and a human explanation.
 * 3. Persist to `job_matches` with brain version + AI model.
 *
 * Skips re-matching a (user, job) pair when computed within 7 days AND the
 * Career Brain version has not changed.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { callLovableAI, extractJson } from "@/lib/ai-gateway.server";
import type { CareerBrainSnapshot } from "@/lib/career-brain.service";
import {
  computeBaselineScores,
  computeMissingSkills,
} from "./scoring";
import {
  buildProfileFromSnapshot,
  domainConfidence,
  familyTitleRelevance,
  jobFamilyFitProfile,
  semanticTechOverlap,
  type RoleFamily,
} from "./role-synonyms";
import { computeRelevance, brainTechVocabulary, jobDedupeKey } from "./relevance";
import { locationAffinity, preferredLocations } from "./location";
import { candidateSeniority, seniorityFit } from "@/lib/career-profile";
import type { MatchScore, NormalizedJob } from "./types";


const MODEL = "google/gemini-3.6-flash";
const AI_REFINEMENT_TIMEOUT_MS = 2200;

const AiSchema = z.object({
  overall: z.number().min(0).max(100).optional(),
  skill: z.number().min(0).max(100).optional(),
  experience: z.number().min(0).max(100).optional(),
  education: z.number().min(0).max(100).optional(),
  technology: z.number().min(0).max(100).optional(),
  careerGoal: z.number().min(0).max(100).optional(),
  location: z.number().min(0).max(100).optional(),
  salary: z.number().min(0).max(100).optional(),
  strengths: z.array(z.string()).max(6).default([]),
  weaknesses: z.array(z.string()).max(6).default([]),
  missingSkills: z.array(z.object({
    skill: z.string(),
    priority: z.enum(["high","medium","low"]),
  })).max(10).default([]),
  explanation: z.string().default(""),
});

export async function computeMatch(
  brain: CareerBrainSnapshot,
  job: NormalizedJob,
  opts: { refineWithAi?: boolean } = {},
): Promise<MatchScore> {
  const baseline = computeBaselineScores(brain, job);
  const missingBaseline = computeMissingSkills(brain, job);

  let aiRefinement: z.infer<typeof AiSchema> | null = null;
  let aiModel: string | null = null;

  if (opts.refineWithAi) {
    const prompt = buildPrompt(brain, job, baseline);
    try {
      const raw = await withTimeout(
        callLovableAI({
          model: MODEL,
          responseFormat: "json_object",
          temperature: 0.3,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
        }),
        AI_REFINEMENT_TIMEOUT_MS,
      );
      const parsed = AiSchema.safeParse(JSON.parse(extractJson(raw)));
      if (parsed.success) {
        aiRefinement = parsed.data;
        aiModel = MODEL;
      }
    } catch {
      // Fall back to deterministic scores; keep pipeline resilient.
    }
  }

  const adjust = (base: number, ai?: number) => {
    if (ai == null) return base;
    const maxDelta = 15;
    return Math.round(Math.max(0, Math.min(100, base + Math.max(-maxDelta, Math.min(maxDelta, ai - base)))));
  };

  // The AI may refine sub-scores, but it can NEVER lift a job past the
  // seniority ceiling computed deterministically from the resume.
  const capOverall = (n: number) =>
    baseline.seniorityTier === "match" || baseline.seniorityTier === "under"
      ? n
      : Math.min(n, baseline.overall);

  const score: MatchScore = {
    overall: capOverall(adjust(baseline.overall, aiRefinement?.overall)),
    seniority: baseline.seniority,
    seniorityTier: baseline.seniorityTier,
    seniorityLabel: baseline.seniorityLabel,
    stretch: baseline.stretch,
    requiredYears: baseline.requiredYears,
    skill: adjust(baseline.skill, aiRefinement?.skill),
    experience: adjust(baseline.experience, aiRefinement?.experience),
    education: adjust(baseline.education, aiRefinement?.education),
    technology: adjust(baseline.technology, aiRefinement?.technology),
    careerGoal: adjust(baseline.careerGoal, aiRefinement?.careerGoal),
    location: adjust(baseline.location, aiRefinement?.location),
    salary: adjust(baseline.salary, aiRefinement?.salary),
    strengths: aiRefinement?.strengths ?? deriveStrengths(baseline),
    weaknesses: aiRefinement?.weaknesses ?? deriveWeaknesses(baseline),
    missingSkills: aiRefinement?.missingSkills?.length
      ? aiRefinement.missingSkills
      : missingBaseline,
    explanation: aiRefinement?.explanation || defaultExplanation(brain, job, baseline),
    aiModel,
  };
  return score;
}

export async function persistMatch(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
  brainVersion: number | null,
  score: MatchScore,
) {
  await supabase.from("job_matches").upsert(
    {
      user_id: userId,
      job_id: jobId,
      overall_score: score.overall,
      skill_score: score.skill,
      experience_score: score.experience,
      education_score: score.education,
      technology_score: score.technology,
      career_goal_score: score.careerGoal,
      location_score: score.location,
      salary_score: score.salary,
      seniority_score: score.seniority,
      seniority_tier: score.seniorityTier,
      required_years: score.requiredYears,
      strengths: score.strengths,
      weaknesses: score.weaknesses,
      missing_skills: score.missingSkills,
      explanation: score.explanation,
      ai_model: score.aiModel,
      brain_version: brainVersion,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,job_id" },
  );
}

/**
 * Any match computed BEFORE this timestamp used an older scoring algorithm and
 * is recomputed on the next refresh, whatever its age. Bump this whenever the
 * scoring maths changes so cached scores never go stale-but-trusted.
 */
const SCORING_EPOCH = Date.parse("2026-08-26T14:05:00Z");

/**
 * Refresh matches for a user against the newest jobs. Skips jobs already
 * matched within `staleAfterDays` for the same brain version.
 */

export async function refreshUserMatches(
  supabase: SupabaseClient,
  brain: CareerBrainSnapshot,
  opts: { limit?: number; staleAfterDays?: number } = {},
): Promise<{
  evaluated: number;
  upserted: number;
  skipped: number;
  newMatches: Array<{ jobId: string; title: string; company: string; matchPercent: number; location: string | null }>;
}> {
  const limit = opts.limit ?? 180;
  const stale = opts.staleAfterDays ?? 7;
  const profile = buildProfileFromSnapshot(brain);

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*, company:companies(id,name,slug,domain,logo_url,website,industry,size,remote_policy,tech_stack,description)")
    .eq("is_active", true)
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(Math.max(4000, limit * 24));

  const results = {
    evaluated: 0,
    upserted: 0,
    skipped: 0,
    newMatches: [] as Array<{ jobId: string; title: string; company: string; matchPercent: number; location: string | null }>,
  };
  const brainVersion = brain.metadata.brainVersion;

  const candidates = rankCandidateRows((jobs ?? []) as Array<Record<string, any>>, brain, profile).slice(0, limit);

  // AI verification pass — one batched call per 25 shortlisted jobs.
  const { aiJudgeJobs, blendScore } = await import("./ai-rerank.server");
  const verdicts = await aiJudgeJobs(
    brain,
    candidates.map((row) => {
      const company = Array.isArray(row.company) ? row.company[0] : row.company;
      return {
        title: String(row.title ?? ""),
        company: company?.name ?? null,
        description: row.description ?? null,
        requiredSkills: row.required_skills ?? [],
        preferredSkills: row.preferred_skills ?? [],
        experienceLevel: row.experience_level ?? null,
        remoteStatus: row.remote_status ?? null,
      };
    }),
  );

  // Existing matches for this user, fetched once (previously one round-trip
  // per candidate — the main reason a refresh timed out mid-way and left a
  // partially rescored feed behind).
  const existingMap = new Map<string, { computed_at: string; brain_version: number | null }>();
  {
    const ids = candidates.map((r) => String(r.id));
    for (let i = 0; i < ids.length; i += 200) {
      const { data: rows } = await supabase
        .from("job_matches")
        .select("job_id, computed_at, brain_version")
        .eq("user_id", brain.userId)
        .in("job_id", ids.slice(i, i + 200));
      for (const r of rows ?? []) {
        existingMap.set(String(r.job_id), {
          computed_at: r.computed_at as string,
          brain_version: (r.brain_version as number | null) ?? null,
        });
      }
    }
  }

  for (let index = 0; index < candidates.length; index++) {
    const row = candidates[index];
    const existing = existingMap.get(String(row.id)) ?? null;

    if (existing) {
      const computedAt = new Date(existing.computed_at).getTime();
      const age = Date.now() - computedAt;
      if (
        existing.brain_version === brainVersion &&
        age < stale * 86_400_000 &&
        computedAt >= SCORING_EPOCH
      ) {
        results.skipped++;
        continue;
      }
    }




    const job = rowToNormalized(row);
    const score = await computeMatch(brain, job, { refineWithAi: false });
    const verdict = verdicts.get(index);
    if (verdict) {
      score.overall = blendScore(score.overall, verdict);
      score.aiModel = "google/gemini-3.6-flash";
      if (verdict.reason) score.explanation = verdict.reason;
    }
    await persistMatch(supabase, brain.userId, row.id as string, brainVersion, score);

    if (!existing && score.overall >= 60) {
      const company = Array.isArray(row.company) ? row.company[0] : row.company;
      results.newMatches.push({
        jobId: row.id as string,
        title: String(row.title ?? ""),
        company: String(company?.name ?? ""),
        matchPercent: score.overall,
        location: (row.location as string | null) ?? null,
      });
    }

    // High-match notification — dedup: skip if the same (user, job, kind)
    // was fired in the last 7 days.
    if (score.overall >= 85 && !existing) {
      const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const { data: recent } = await supabase
        .from("job_notifications")
        .select("id")
        .eq("user_id", brain.userId)
        .eq("job_id", row.id)
        .eq("kind", "new_high_match")
        .gte("created_at", cutoff)
        .limit(1);
      if (!recent || recent.length === 0) {
        await supabase.from("job_notifications").insert({
          user_id: brain.userId,
          job_id: row.id,
          kind: "new_high_match",
          title: `New ${score.overall}% match: ${row.title}`,
          body: score.explanation.slice(0, 240),
        });
      }
    }

    results.evaluated++;
    results.upserted++;
  }


  return results;
}

function rowToNormalized(row: Record<string, any>): NormalizedJob {
  const company = Array.isArray(row.company) ? row.company[0] : row.company;
  return {
    title: row.title,
    company: {
      name: company?.name ?? "",
      slug: company?.slug ?? "",
      domain: company?.domain ?? null,
      logoUrl: company?.logo_url ?? null,
      website: company?.website ?? null,
      industry: company?.industry ?? null,
      size: company?.size ?? null,
      remotePolicy: company?.remote_policy ?? null,
      techStack: company?.tech_stack ?? [],
      description: company?.description ?? null,
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

function rankCandidateRows(
  rows: Array<Record<string, any>>,
  brain: CareerBrainSnapshot,
  profile: ReturnType<typeof buildProfileFromSnapshot>,
): Array<Record<string, any>> {
  const brainTech = brainTechVocabulary(brain);
  const prefLocations = preferredLocations(brain);
  const candidateRung = candidateSeniority(brain);
  const candidateYears = brain.identity.yearsOfExperience ?? 0;
  const scored = rows.map((row) => {

    const company = Array.isArray(row.company) ? row.company[0] : row.company;
    const jobLike = {
      title: row.title ?? "",
      description: row.description ?? "",
      requiredSkills: row.required_skills ?? [],
      preferredSkills: row.preferred_skills ?? [],
      companyTechStack: company?.tech_stack ?? [],
      responsibilities: row.responsibilities ?? [],
      requirements: row.requirements ?? [],
    };
    const rel = computeRelevance(jobLike, profile, brainTech);
    const fit = jobFamilyFitProfile(jobLike, profile);
    const confidence = domainConfidence(jobLike, profile);
    const familyTitle = profile.families.length
      ? Math.max(...profile.families.map((family: RoleFamily) => familyTitleRelevance(row.title ?? "", family)))
      : 0;
    const tech = semanticTechOverlap(brainTech, [
      ...(row.required_skills ?? []),
      ...(row.preferred_skills ?? []),
      ...(company?.tech_stack ?? []),
    ]);
    // Seniority appropriateness must influence the SHORTLIST, not just the
    // final score — otherwise senior/architect postings consume every
    // candidate slot and entry-level roles are never scored at all.
    const sen = seniorityFit({
      candidate: candidateRung,
      candidateYears,
      jobLevel: row.experience_level ?? null,
      jobTitle: String(row.title ?? ""),
      jobText: `${row.title ?? ""} ${(row.requirements ?? []).join(" ")} ${String(row.description ?? "").slice(0, 1500)}`,
    });
    const score =
      (rel.vetoed || fit.excluded ? -500 : 0) +
      rel.relevance * 200 +
      rel.titleFit * 100 +
      confidence.confidence * 60 +
      familyTitle * 0.5 +
      tech * 80 +
      sen.score * 1.6 +
      (sen.tier === "far-over" ? -70 : sen.tier === "over" ? -30 : 0) +
      (row.remote_status === "remote" ? 8 : 0) +
      locationAffinity({
        jobLocation: row.location,
        jobCountry: row.location_country,
        remoteStatus: row.remote_status,
        preferred: prefLocations,
      }) * 55;

    return { row, score, ok: rel.gate && !fit.excluded, key: jobDedupeKey(String(row.title ?? ""), company?.name) };
  });

  const pool = scored.filter((item) => item.ok);
  const ranked = (pool.length ? pool : scored.filter((item) => item.score > -500))
    .sort((a, b) => b.score - a.score);

  // Drop duplicate postings of the same role at the same company.
  const seen = new Set<string>();
  return ranked
    .filter((item) => {
      if (seen.has(item.key)) return false;
      seen.add(item.key);
      return true;
    })
    .map((item) => item.row);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("AI refinement timed out")), ms);
    }),
  ]);
}

function deriveStrengths(s: ReturnType<typeof computeBaselineScores>): string[] {
  const items = [
    ["Skill overlap", s.skill],
    ["Experience level", s.experience],
    ["Technology stack", s.technology],
    ["Location fit", s.location],
    ["Career goal alignment", s.careerGoal],
  ] as const;
  return items
    .filter(([, v]) => v >= 75)
    .slice(0, 3)
    .map(([label, v]) => `${label} is strong (${v}%)`);
}

function deriveWeaknesses(s: ReturnType<typeof computeBaselineScores>): string[] {
  const items = [
    ["Skill overlap", s.skill],
    ["Experience level", s.experience],
    ["Technology stack", s.technology],
    ["Salary alignment", s.salary],
    ["Location fit", s.location],
  ] as const;
  return items
    .filter(([, v]) => v < 60)
    .slice(0, 3)
    .map(([label, v]) => `${label} needs attention (${v}%)`);
}

function defaultExplanation(
  brain: CareerBrainSnapshot,
  job: NormalizedJob,
  s: ReturnType<typeof computeBaselineScores>,
): string {
  const name = brain.identity.fullName?.split(" ")[0] ?? "You";
  return `${name} matches this ${job.title} role at ${s.overall}%. Skill overlap is ${s.skill}% and experience alignment is ${s.experience}%.`;
}

const SYSTEM_PROMPT = `You are the CareerOS Job Matching Engine.
You receive a candidate's Career Brain (identity, preferred role, verified skills, PROJECTS with technologies, experience, DNA), a normalized job posting, and deterministic baseline scores.
Your job is to REFINE — never fabricate.
Rules:
- Keep every sub-score within ±15 of the baseline; never break the baseline's career-path guardrail (if baseline.overall is capped low because the job is off-track, respect it).
- Base strengths and weaknesses ONLY on the provided data.
- Missing skills must come from the job's required/preferred lists AND not already be covered by the candidate's skills or project technologies (treat Docker/K8s/EKS, Terraform/IaC, ArgoCD/GitOps as semantically equivalent — do not flag a covered concept as missing).
- Prefer PROJECT evidence over years-of-experience: "Your EKS production project maps directly to the platform work here."
- explanation: one paragraph, max 60 words, concrete + quantitative, addressed to the candidate.
- Return STRICT JSON only, matching the requested schema.`;

function buildPrompt(
  brain: CareerBrainSnapshot,
  job: NormalizedJob,
  baseline: ReturnType<typeof computeBaselineScores>,
): string {
  const brainSummary = {
    name: brain.identity.fullName,
    currentTitle: brain.identity.currentTitle,
    yearsOfExperience: brain.identity.yearsOfExperience,
    preferredRole: brain.identity.preferences.preferredRole,
    preferredLocation: brain.identity.preferences.preferredLocation,
    expectedSalary: brain.identity.preferences.expectedSalary,
    professionalSummary: brain.identity.professionalSummary,
    skills: brain.skills.map((s) => ({ name: s.name, category: s.category, verified: s.userVerified })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    projects: (brain.projects ?? []).slice(0, 8).map((p: any) => ({
      name: p?.name,
      technologies: p?.technologies ?? [],
      summary: (p?.description ?? "").slice(0, 240),
    })),
    education: brain.education.slice(0, 4),
    certifications: brain.certifications.slice(0, 6),
    dna: brain.dna,
  };
  const jobSummary = {
    title: job.title,
    company: job.company.name,
    location: job.location,
    remoteStatus: job.remoteStatus,
    employmentType: job.employmentType,
    experienceLevel: job.experienceLevel,
    salary: { min: job.salaryMin, max: job.salaryMax, currency: job.salaryCurrency },
    requiredSkills: job.requiredSkills,
    preferredSkills: job.preferredSkills,
    responsibilities: job.responsibilities,
    requirements: job.requirements,
  };
  return `CAREER_BRAIN:\n${JSON.stringify(brainSummary)}\n\nJOB:\n${JSON.stringify(jobSummary)}\n\nBASELINE_SCORES:\n${JSON.stringify(baseline)}\n\nWrite the explanation as concrete, quantitative feedback for the candidate. Use numbers where possible ("You satisfy 8 of 11 required skills.", "Your Terraform + EKS project directly matches this infrastructure role.", "Learning Helm could raise the match by ~8%."). Never say "you should apply" or generic filler. Return JSON with keys: overall, skill, experience, education, technology, careerGoal, location, salary, strengths[], weaknesses[], missingSkills[{skill,priority}], explanation.`;
}
