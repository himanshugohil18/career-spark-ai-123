/**
 * AI Recommendation Center — builds the personalized job sections that
 * appear at the TOP of /jobs. Every section is derived from real data:
 * `job_matches`, `jobs`, `companies`, and the active Career Brain snapshot.
 *
 * Never fabricates jobs. If a section has zero real rows, it is omitted.
 *
 * Diversity contract: each job appears in at most ONE section, so the feed
 * looks like a curated set of themed shelves — not 20 near-duplicate cards.
 * Off-track roles (family fit === 0 for the brain) are hidden by default.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { diversifyByCompany } from "./diversity";
import { jobDedupeKey } from "./relevance";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CareerBrainSnapshot } from "@/lib/career-brain.service";
import {
  buildProfileFromSnapshot,
  familyTitleRelevance,
  jobFamilyFitProfile,
  type CandidateProfile,
  type RoleFamily,
} from "./role-synonyms";
import { locationAffinity, isIndiaJob } from "./location";
import {
  candidateSeniority,
  seniorityFit,
  type SeniorityTier,
} from "@/lib/career-profile";
import {
  DEFAULT_JOB_PREFERENCES,
  regionFor,
  regionLabel,
  remoteAllows,
  remoteEligibility,
  type JobPreferences,
  type RegionId,
} from "@/lib/job-preferences";

export type SectionJob = {
  id: string;
  title: string;
  location: string | null;
  remote_status: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  posted_at: string | null;
  application_url: string;
  provider: string;
  company: any;
  match: any | null;
  insights: string[];
  savedStatus?: string | null;
  /** Seniority verdict against the candidate's own level. */
  seniorityTier?: SeniorityTier;
  seniorityLabel?: string | null;
  stretch?: boolean;
  /** Resolved remote geographic eligibility label ("Remote — US only"). */
  remoteLabel?: string | null;
  remoteEligible?: boolean;
  region?: string | null;
  regionLabel?: string | null;
};

export type JobSection = {
  id: string;
  title: string;
  subtitle: string;
  reason: string;
  items: SectionJob[];
};

export type CompanyBucket = {
  id: string;
  name: string;
  logo_url: string | null;
  industry: string | null;
  matchedCount: number;
  topScore: number;
};

const JOB_SELECT =
  "id,title,location,location_country,remote_status,employment_type,experience_level,salary_min,salary_max,salary_currency,posted_at,first_seen_at,last_seen_at,last_verified_at,expires_at,stale_reason,application_url,provider,required_skills,company:companies(id,name,slug,logo_url,industry,size,remote_policy,tech_stack)";

const HIDE_BELOW = 40; // hard floor for below-relevance jobs

/** Candidate's own country, from the brain / saved preferences. */
function candidateCountry(brain: CareerBrainSnapshot | null, prefs: JobPreferences): string | null {
  if (prefs.preferredCountries[0]) return prefs.preferredCountries[0].toLowerCase();
  const loc = [
    brain?.identity?.location,
    brain?.identity?.preferences?.preferredLocation,
    ...prefs.preferredLocations,
  ]
    .filter(Boolean)
    .join(" ");
  if (!loc) return null;
  if (isIndiaJob(loc, null)) return "india";
  const region = regionFor(loc, null);
  return region ? loc.toLowerCase() : null;
}

export async function buildJobSections(
  supabase: SupabaseClient,
  userId: string,
  brain: CareerBrainSnapshot | null,
): Promise<{ sections: JobSection[]; companies: CompanyBucket[] }> {
  const sections: JobSection[] = [];
  const profile: CandidateProfile = buildProfileFromSnapshot(brain);

  // Saved job preferences drive location tiers, work mode ranking and whether
  // stretch opportunities are surfaced at all.
  const { data: prefRow } = await supabase
    .from("job_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  const prefs: JobPreferences = prefRow
    ? {
        ...DEFAULT_JOB_PREFERENCES,
        preferredRoles: (prefRow as any).preferred_roles ?? [],
        preferredLocations: (prefRow as any).preferred_locations ?? [],
        preferredCountries: (prefRow as any).preferred_countries ?? [],
        preferredRegions: (prefRow as any).preferred_regions ?? [],
        workModes: (prefRow as any).work_modes ?? [],
        experienceLevels: (prefRow as any).experience_levels ?? [],
        employmentTypes: (prefRow as any).employment_types ?? [],
        salaryMin: (prefRow as any).salary_min ?? null,
        salaryMax: (prefRow as any).salary_max ?? null,
        salaryCurrency: (prefRow as any).salary_currency ?? "INR",
        salaryPeriod: (prefRow as any).salary_period === "month" ? "month" : "year",
        willingToRelocate: !!(prefRow as any).willing_to_relocate,
        openToInternational: !!(prefRow as any).open_to_international,
        includeStretch: (prefRow as any).include_stretch ?? true,
        strictSalaryFilter: !!(prefRow as any).strict_salary_filter,
      }
    : { ...DEFAULT_JOB_PREFERENCES };

  const myCountry = candidateCountry(brain, prefs);
  const myLevel = candidateSeniority(brain);
  const myYears = brain?.identity?.yearsOfExperience ?? 0;

  /** Attach seniority + remote-eligibility + region metadata to a job row. */
  const annotate = (job: any): Partial<SectionJob> => {
    const fit = seniorityFit({
      candidate: myLevel,
      candidateYears: myYears,
      jobLevel: job.experience_level ?? null,
      jobText: `${job.title ?? ""} ${(job.description ?? "").slice(0, 2000)}`,
    });
    const elig = remoteEligibility({
      remoteStatus: job.remote_status,
      location: job.location,
      locationCountry: job.location_country,
      description: job.description,
    });
    const region = regionFor(job.location, job.location_country);
    return {
      seniorityTier: fit.tier,
      seniorityLabel: fit.label,
      stretch: fit.tier === "stretch",
      remoteLabel: elig.remote ? elig.label : null,
      remoteEligible: remoteAllows(elig, myCountry),
      region,
      regionLabel: regionLabel(region),
    };
  };

  const brainFamilies: RoleFamily[] = profile.families;
  const jobLikeFromRow = (j: any) => ({
    title: j.title ?? "",
    description: j.description ?? "",
    requiredSkills: j.required_skills ?? [],
    companyTechStack: j.company?.tech_stack ?? [],
  });
  const evalJob = (j: any) => jobFamilyFitProfile(jobLikeFromRow(j), profile);
  const onTrack = (j: any) => {
    if (!brainFamilies.length) return true;
    const { fit, excluded } = evalJob(j);
    return !excluded && fit >= 0.4;
  };

  // ---- Pull all matches for this user once, join to jobs ------------
  const { data: matches } = await supabase
    .from("job_matches")
    .select(
      `overall_score, skill_score, experience_score, technology_score, career_goal_score, location_score, salary_score, education_score, seniority_score, seniority_tier, required_years, strengths, weaknesses, missing_skills, explanation, job:jobs(${JOB_SELECT},description)`,
    )
    .eq("user_id", userId)
    .order("overall_score", { ascending: false })
    .limit(420);

  const merged: SectionJob[] = (matches ?? [])
    .filter((m: any) => m.job)
    .map((m: any) => {
      const job = m.job;
      // Runtime cap for cached scores. Uses full-classification (title +
      // description + skills + tech stack) so ML/Sales/etc jobs never survive
      // in a DevOps feed, even if their cached score was set before the
      // profile-based classifier was introduced.
      const fitInfo = brainFamilies.length
        ? evalJob(job)
        : { fit: 1, excluded: false };
      let overall = Number(m.overall_score ?? 0);
      if (brainFamilies.length && fitInfo.excluded) overall = Math.min(overall, 15);
      else if (brainFamilies.length && fitInfo.fit === 0) overall = Math.min(overall, 22);
      else if (brainFamilies.length && fitInfo.fit <= 0.4) overall = Math.min(overall, 48);

      // Seniority ceiling re-applied at read time so cached scores computed
      // before the seniority constraint existed can never show an
      // over-levelled senior role as a high match to a fresher.
      const meta = annotate(job);
      const seniorityCap: Record<string, number> = { stretch: 82, over: 46, "far-over": 30 };
      const cap = seniorityCap[meta.seniorityTier ?? "match"];
      if (cap != null) overall = Math.min(overall, cap);

      return {
        ...job,
        ...meta,
        match: {
          overall_score: overall,
          skill_score: m.skill_score,
          experience_score: m.experience_score,
          technology_score: m.technology_score,
          career_goal_score: m.career_goal_score,
          location_score: m.location_score,
          salary_score: m.salary_score,
          education_score: m.education_score,
          seniority_score: (m as any).seniority_score ?? null,
          seniority_tier: meta.seniorityTier,
          seniority_label: meta.seniorityLabel,
          required_years: (m as any).required_years ?? null,
          strengths: m.strengths,
          weaknesses: m.weaknesses,
          missing_skills: m.missing_skills,
          explanation: m.explanation,
        },
        insights: buildInsights({ ...m, overall_score: overall }, job, brain),
      };
    })
    // Hard on-track filter: excluded / off-track jobs never reach the UI.
    .filter((j) => onTrack(j) && Number(j.match?.overall_score ?? 0) >= HIDE_BELOW);


  // Cross-provider duplicate collapse: the same role syndicated to several
  // boards has different (provider, source_id) rows but one canonical
  // company+title identity. Keep the most recently verified copy.
  const canonical = new Map<string, SectionJob>();
  for (const j of merged) {
    const key = jobDedupeKey(j.title ?? "", (j as any).company?.name ?? null);
    const prev = canonical.get(key);
    if (
      !prev ||
      Date.parse((j as any).last_verified_at ?? (j as any).last_seen_at ?? 0) >
        Date.parse((prev as any).last_verified_at ?? (prev as any).last_seen_at ?? 0)
    ) {
      canonical.set(key, j);
    }
  }
  // Company diversity: a few very large employers would otherwise fill every
  // section with their own roles. Round-robin keeps ranking but spreads brands.
  const deduped = diversifyByCompany([...canonical.values()], 2);

  const byId = new Map(deduped.map((j) => [j.id, j]));
  // Diversity: no job appears in more than one section.
  const used = new Set<string>();
  const take = (candidates: SectionJob[], n: number) => {
    const out: SectionJob[] = [];
    for (const c of candidates) {
      if (used.has(c.id)) continue;
      out.push(c);
      used.add(c.id);
      if (out.length >= n) break;
    }
    return out;
  };

  // Recommendation memory: hide previously ignored/archived jobs entirely.
  const { data: history } = await supabase
    .from("recommendation_history")
    .select("kind, payload")
    .eq("user_id", userId)
    .in("kind", ["ignored", "archived"])
    .order("created_at", { ascending: false })
    .limit(200);
  for (const h of (history ?? []) as any[]) {
    const id = h?.payload?.jobId;
    if (id) used.add(id);
  }

  // Also skip anything the user already applied to / saved as applied_later.
  const { data: hiddenSaved } = await supabase
    .from("saved_jobs")
    .select("job_id, status")
    .eq("user_id", userId)
    .in("status", ["archived", "ignored"]);
  for (const s of (hiddenSaved ?? []) as any[]) used.add(s.job_id);

  // ---- Seniority partitioning (PART 4 / PART 7) ----------------------
  // Level-appropriate jobs form the primary feed. Stretch jobs get their own
  // clearly-labelled shelf. Over-levelled jobs never enter the shelves at all.
  const levelAppropriate = deduped.filter(
    (j) => j.seniorityTier === "match" || j.seniorityTier === "under",
  );
  const stretchPool = deduped.filter((j) => j.seniorityTier === "stretch");
  for (const j of deduped) {
    if (j.seniorityTier === "over" || j.seniorityTier === "far-over") used.add(j.id);
  }
  const primary = levelAppropriate;

  // 1) Recommended for You — level-appropriate, preference-aware ranking.
  const modeBoost = (j: SectionJob) => {
    if (!prefs.workModes.length) return 0;
    const mode = (j.remote_status ?? "").toLowerCase();
    const wanted = prefs.workModes as string[];
    if (wanted.includes(mode)) return 12;
    if (mode === "hybrid" && wanted.includes("remote")) return 4;
    return -6;
  };
  const salaryBoost = (j: SectionJob) => {
    const target = prefs.salaryMin;
    if (!target || !j.salary_max) return 0;
    const period = prefs.salaryPeriod === "month" ? target * 12 : target;
    return Number(j.salary_max) >= period ? 6 : -4;
  };
  const recommended = take(
    primary
      .slice()
      .sort(
        (a, b) =>
          Number(b.match?.overall_score ?? 0) + modeBoost(b) + salaryBoost(b) -
          (Number(a.match?.overall_score ?? 0) + modeBoost(a) + salaryBoost(a)),
      ),
    18,
  );
  if (recommended.length) {
    sections.push({
      id: "best",
      title: "Recommended for You",
      subtitle: "Level-appropriate roles matched to your Career Brain",
      reason:
        "Ranked across skills, projects, tech stack, seniority fit, location and your saved preferences.",
      items: recommended,
    });
  }

  // 1b) India-first shelf — CareerOS is India-first, then global.
  const isIndia = (j: SectionJob) => isIndiaJob(j.location, (j as any).location_country);
  const indiaItems = take(primary.filter(isIndia), 16);
  if (indiaItems.length) {
    sections.push({
      id: "india",
      title: "Top Roles in India",
      subtitle: "Matched openings across Indian hiring hubs",
      reason: "India-first ranking, then global opportunities.",
      items: indiaItems,
    });
  }

  // 1c) Stretch Opportunities — explicitly one level above the candidate, so
  // ambition is still served without polluting the recommended feed.
  if (prefs.includeStretch) {
    const stretchItems = take(
      stretchPool.sort(
        (a, b) => Number(b.match?.overall_score ?? 0) - Number(a.match?.overall_score ?? 0),
      ),
      10,
    );
    if (stretchItems.length) {
      sections.push({
        id: "stretch",
        title: "Stretch Opportunities",
        subtitle: "One level above you — worth applying with a strong story",
        reason:
          "These ask for slightly more experience than your resume shows. Shown separately so your main feed stays realistic.",
        items: stretchItems,
      });
    }
  }

  // 2) High Confidence (>=85)
  const high = take(primary.filter((m) => Number(m.match?.overall_score ?? 0) >= 85), 16);
  if (high.length >= 2) {
    sections.push({
      id: "high",
      title: "High Confidence Matches",
      subtitle: "AI is highly confident you'd excel here",
      reason: "Overall match is 85% or higher.",
      items: high,
    });
  }

  // 3) Dream Company — saved companies you have >=1 role from
  const { data: dreamSaves } = await supabase
    .from("job_collections")
    .select("id, items:job_collection_items(job:jobs(company_id))")
    .eq("user_id", userId)
    .eq("name", "Dream Companies");
  const dreamCompanyIds = new Set<string>();
  for (const c of (dreamSaves ?? []) as any[]) {
    for (const it of c.items ?? []) if (it?.job?.company_id) dreamCompanyIds.add(it.job.company_id);
  }
  if (dreamCompanyIds.size) {
    const dreamItems = take(
      primary.filter((j) => j.company?.id && dreamCompanyIds.has(j.company.id)),
      4,
    );
    if (dreamItems.length) {
      sections.push({
        id: "dream",
        title: "Dream Company Hiring",
        subtitle: "New roles at companies on your Dream Companies list",
        reason: "Filtered to companies you've explicitly saved as targets.",
        items: dreamItems,
      });
    }
  }

  // 4) Hidden Gem — strong match (>=75) at a small/unknown company
  const gems = take(
    primary.filter((j) => {
      const score = Number(j.match?.overall_score ?? 0);
      const size = (j.company?.size ?? "").toString().toLowerCase();
      const isSmall = /startup|1-10|11-50|51-100|small/.test(size) || !size;
      return score >= 75 && isSmall;
    }),
    10,
  );
  if (gems.length) {
    sections.push({
      id: "gems",
      title: "Hidden Gems",
      subtitle: "Strong matches at smaller or lesser-known companies",
      reason: "High match + small team — usually higher impact and ownership.",
      items: gems,
    });
  }

  // 5) Highest Salary among on-track matches
  const bySalary = primary
    .filter((j) => j.salary_max && Number(j.match?.overall_score ?? 0) >= 60)
    .sort((a, b) => Number(b.salary_max ?? 0) - Number(a.salary_max ?? 0));
  const salaryItems = take(bySalary, 8);
  if (salaryItems.length) {
    const target = parseSalary(brain?.identity?.preferences?.expectedSalary ?? null);
    sections.push({
      id: "salary",
      title: "Highest Salary",
      subtitle: target ? `Top pay bands above your ${target.toLocaleString()} target` : "Top compensation bands",
      reason: "Filtered by max salary among on-track matches.",
      items: salaryItems,
    });
  }

  // 6) Remote roles you're actually eligible for — a "Remote (US only)"
  // posting is not a real remote option for a candidate based in India.
  const remoteItems = take(
    primary
      .filter(
        (j) =>
          j.remote_status === "remote" &&
          j.remoteEligible !== false &&
          Number(j.match?.overall_score ?? 0) >= 55,
      )
      .sort((a, b) => Number(b.match?.overall_score ?? 0) - Number(a.match?.overall_score ?? 0)),
    10,
  );
  if (remoteItems.length) {
    sections.push({
      id: "remote",
      title: "Remote Roles You Can Take",
      subtitle: "Fully remote and open to your location",
      reason:
        "Remote postings restricted to other countries are filtered out, so every role here accepts applicants from where you are.",
      items: remoteItems,
    });
  }

  // 6b) International opportunities, grouped by region, only when the user
  // opted in. Keeps the India-first feed clean by default.
  if (prefs.openToInternational) {
    const intl = primary.filter(
      (j) => !isIndia(j) && j.region && Number(j.match?.overall_score ?? 0) >= 55,
    );
    const byRegion = new Map<string, SectionJob[]>();
    for (const j of intl) {
      const key = j.region as string;
      if (!byRegion.has(key)) byRegion.set(key, []);
      byRegion.get(key)!.push(j);
    }
    const wanted: RegionId[] = (prefs.preferredRegions.length
      ? prefs.preferredRegions
      : [...byRegion.keys()]) as RegionId[];
    for (const region of wanted) {
      const pool = byRegion.get(region);
      if (!pool?.length) continue;
      const items = take(
        pool.sort((a, b) => Number(b.match?.overall_score ?? 0) - Number(a.match?.overall_score ?? 0)),
        8,
      );
      if (items.length < 2) continue;
      sections.push({
        id: `intl-${region}`,
        title: `Opportunities in ${regionLabel(region)}`,
        subtitle: "International roles matched to your profile",
        reason: "Shown because you marked yourself open to international opportunities.",
        items,
      });
    }
  }

  // 7) Recently Discovered (on-track only)
  const { data: recent } = await supabase
    .from("jobs")
    .select(JOB_SELECT)
    .eq("is_active", true)
    .order("first_seen_at", { ascending: false })
    .limit(90);
  const recentItems = take(
    withMatches(recent ?? [], byId, brain)
      .filter((j) => onTrack(j))
      .filter((j) => {
        const s = Number(j.match?.overall_score ?? -1);
        return s < 0 || s >= 45;
      }),
    12,
  );
  if (recentItems.length) {
    sections.push({
      id: "recent",
      title: "Recently Discovered",
      subtitle: "Fresh on-track roles our providers just picked up",
      reason: "New jobs added in the last discovery cycle.",
      items: recentItems,
    });
  }

  // 8) Near your location
  const preferredLoc = brain?.identity?.preferences?.preferredLocation ?? brain?.identity?.location ?? null;
  if (preferredLoc) {
    const nearItems = take(
      primary
        .filter((j) => locationAffinity({
          jobLocation: j.location,
          jobCountry: (j as any).location_country,
          remoteStatus: j.remote_status,
          preferred: [preferredLoc],
        }) >= 0.75)
        .sort((a, b) =>
          locationAffinity({ jobLocation: b.location, jobCountry: (b as any).location_country, remoteStatus: b.remote_status, preferred: [preferredLoc] }) -
          locationAffinity({ jobLocation: a.location, jobCountry: (a as any).location_country, remoteStatus: a.remote_status, preferred: [preferredLoc] }),
        ),
      12,
    );
    if (nearItems.length) {
      sections.push({
        id: "near",
        title: "Near Your Location",
        subtitle: `Roles near ${preferredLoc}`,
        reason: "Matched against your preferred location.",
        items: nearItems,
      });
    }
  }

  // 9) Adjacent role families — help discovery outside the tight family.
  if (brainFamilies[0]?.related?.length) {
    const relatedIds = new Set(brainFamilies[0].related);
    const adjacent = primary.filter((j) => {
      const { jobFamily } = jobFamilyFitProfile(jobLikeFromRow(j), profile);
      return jobFamily && relatedIds.has(jobFamily.id);
    });
    const adj = take(adjacent, 10);
    if (adj.length) {
      sections.push({
        id: "adjacent",
        title: `Adjacent to ${brainFamilies[0].label}`,
        subtitle: "Roles from related tracks that still leverage your Career Brain",
        reason: "Broaden your search into adjacent role families.",
        items: adj,
      });
    }
  }

  // Companies you may like — 2+ matched roles from same company
  const bucketMap = new Map<string, CompanyBucket>();
  for (const m of deduped) {
    const c = m.company;
    if (!c?.id) continue;
    const cur = bucketMap.get(c.id) ?? {
      id: c.id,
      name: c.name,
      logo_url: c.logo_url ?? null,
      industry: c.industry ?? null,
      matchedCount: 0,
      topScore: 0,
    };
    cur.matchedCount += 1;
    cur.topScore = Math.max(cur.topScore, Number(m.match?.overall_score ?? 0));
    bucketMap.set(c.id, cur);
  }
  const companies = Array.from(bucketMap.values())
    .filter((c) => c.matchedCount >= 2)
    .sort((a, b) => b.topScore - a.topScore)
    .slice(0, 6);

  // Attach the user's saved state so the bookmark button reflects reality
  // (and toggles correctly) on every recommendation card.
  const { data: savedRows } = await supabase
    .from("saved_jobs")
    .select("job_id, status")
    .eq("user_id", userId);
  const savedMap = new Map<string, string>(
    ((savedRows ?? []) as any[]).map((r) => [r.job_id as string, r.status as string]),
  );
  for (const section of sections) {
    for (const item of section.items) item.savedStatus = savedMap.get(item.id) ?? null;
  }

  return { sections, companies };
}

function withMatches(rows: any[], byId: Map<string, SectionJob>, brain: CareerBrainSnapshot | null): SectionJob[] {
  return rows.map((r) => {
    const existing = byId.get(r.id);
    return existing ?? {
      ...r,
      match: null,
      insights: buildInsights(null, r, brain),
    };
  });
}

function parseSalary(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function buildInsights(match: any | null, job: any, brain: CareerBrainSnapshot | null): string[] {
  const out: string[] = [];
  const required: string[] = job?.required_skills ?? [];
  const missing: any[] = (match?.missing_skills as any[]) ?? [];
  const strengths: string[] = (match?.strengths as string[]) ?? [];

  if (required.length > 0 && match) {
    const missingNames = new Set(missing.map((m) => String(m.skill).toLowerCase()));
    const met = required.filter((r) => !missingNames.has(r.toLowerCase())).length;
    out.push(`You satisfy ${met} of ${required.length} required skills.`);
  }

  const overall = Number(match?.overall_score ?? 0);
  if (overall >= 95) out.push(`Perfect ${overall}% match — top-tier fit.`);
  else if (overall >= 90) out.push(`Excellent ${overall}% match across your Career Brain.`);
  else if (overall >= 80) out.push(`Strong ${overall}% match — apply confidently.`);
  else if (overall >= 70) out.push(`Good ${overall}% match with a clear path to strengthen.`);

  // Project-driven signal
  if (brain?.projects?.length) {
    const projTechs = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of (brain.projects ?? []) as any[]) for (const t of p?.technologies ?? []) projTechs.add(String(t).toLowerCase());
    const overlap = required.filter((r) => projTechs.has(r.toLowerCase()));
    if (overlap.length >= 2) {
      out.push(`Your projects in ${overlap.slice(0, 2).join(" and ")} directly map to this role.`);
    }
  }

  const topMissing = missing.find((m) => m.priority === "high");
  if (topMissing) out.push(`Learning ${topMissing.skill} could raise your match by ~8%.`);

  if (strengths[0]) out.push(strengths[0]);

  return out.slice(0, 4);
}
