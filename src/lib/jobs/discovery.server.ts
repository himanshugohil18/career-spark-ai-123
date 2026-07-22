/**
 * Discovery orchestrator. Iterates enabled providers, normalizes, dedups,
 * and upserts into `jobs` + `companies` + `job_provider_ids`.
 *
 * Runs server-side only. Callers: admin `discoverJobs` server function, the
 * user-scoped `kickMatchRefresh` / `activateCareerBrainPipeline` (which pass
 * a CandidateProfile so discovery filters at the discovery stage), and the
 * global cron endpoint at /api/public/hooks/discover-jobs.
 *
 * When `candidateProfile` is provided, results from every provider are
 * filtered BEFORE dedup/upsert:
 *   - Any job whose classified family is in the profile's excluded set is dropped.
 *   - Any job that doesn't match at least one profile family or one role query
 *     (title/description substring against `profile.roleQueries`) is dropped.
 *
 * This is the "AI Recruiter" model: the Career Brain decides WHAT to search
 * for, not just how to rank what is fetched.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { SupabaseClient } from "@supabase/supabase-js";
import { computeFingerprint } from "./fingerprint";
import { getProvider } from "./providers/registry";
import {
  classifyJob,
  domainConfidence,
  type CandidateProfile,
} from "./role-synonyms";
import type { NormalizedJob } from "./types";

export type PerQueryStat = { query: string; matched: number };
export type RemovalReason = { provider: string; title: string; company: string; reason: string };
export type PerProviderStat = {
  provider: string;
  fetched: number;
  kept: number;
  droppedExcluded: number;
  droppedOffTrack: number;
  removed: RemovalReason[];
};

export type DiscoveryStats = {
  providersRun: string[];
  fetched: number;
  inserted: number;
  updated: number;
  duplicatesMerged: number;
  filteredExcluded: number;
  filteredOffTrack: number;
  removed: RemovalReason[];
  perProvider: PerProviderStat[];
  perQuery: PerQueryStat[];
  candidateProfile: {
    primary: string | null;
    families: string[];
    excluded: string[];
    queries: string[];
  } | null;
  errors: { provider: string; message: string }[];
};

export async function runDiscovery(
  supabase: SupabaseClient,
  opts: { providerIds?: string[]; candidateProfile?: CandidateProfile | null } = {},
): Promise<DiscoveryStats> {
  const profile = opts.candidateProfile ?? null;
  const stats: DiscoveryStats = {
    providersRun: [],
    fetched: 0,
    inserted: 0,
    updated: 0,
    duplicatesMerged: 0,
    filteredExcluded: 0,
    filteredOffTrack: 0,
    removed: [],
    perProvider: [],
    perQuery: profile ? profile.roleQueries.map((q) => ({ query: q, matched: 0 })) : [],
    candidateProfile: profile
      ? {
          primary: profile.primaryLabel,
          families: profile.familyLabels,
          excluded: profile.excludedFamilyLabels,
          queries: profile.roleQueries,
        }
      : null,
    errors: [],
  };

  // Load enabled providers from job_sources.
  let query = supabase.from("job_sources").select("id, config, enabled");
  if (opts.providerIds && opts.providerIds.length > 0) {
    query = query.in("id", opts.providerIds);
  } else {
    query = query.eq("enabled", true);
  }
  const { data: sources, error } = await query;
  if (error) throw new Error(`Failed to load sources: ${error.message}`);

  const collected: NormalizedJob[] = [];
  const queryStats = new Map(stats.perQuery.map((q) => [q.query, q] as const));

  for (const src of sources ?? []) {
    const provider = getProvider(src.id);
    if (!provider) continue;
    stats.providersRun.push(src.id);
    const perProv: PerProviderStat = {
      provider: src.id,
      fetched: 0,
      kept: 0,
      droppedExcluded: 0,
      droppedOffTrack: 0,
      removed: [],
    };
    stats.perProvider.push(perProv);
    try {
      const jobs = await provider.fetch(src.config ?? {}, {
        queries: profile?.roleQueries,
        locations: profile?.locations,
        limit: 80,
      });
      perProv.fetched = jobs.length;
      stats.fetched += jobs.length;

      const kept = profile ? filterJobsByProfile(jobs, profile, perProv, queryStats) : jobs;
      perProv.kept = kept.length;
      collected.push(...kept);

      const config = typeof src.config === "object" && src.config ? src.config as Record<string, unknown> : {};
      await supabase
        .from("job_sources")
        .update({
          last_run_at: new Date().toISOString(),
          last_error: null,
          config: {
            ...config,
            lastDiscovery: {
              fetched: perProv.fetched,
              kept: perProv.kept,
              droppedExcluded: perProv.droppedExcluded,
              droppedOffTrack: perProv.droppedOffTrack,
              removed: perProv.removed.slice(0, 20),
              queries: profile?.roleQueries ?? [],
            },
          },
        })
        .eq("id", src.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      stats.errors.push({ provider: src.id, message });
      const config = typeof src.config === "object" && src.config ? src.config as Record<string, unknown> : {};
      await supabase
        .from("job_sources")
        .update({
          last_run_at: new Date().toISOString(),
          last_error: message.slice(0, 500),
          config: { ...config, lastDiscovery: { error: message.slice(0, 500), queries: profile?.roleQueries ?? [] } },
        })
        .eq("id", src.id);
    }
  }

  stats.filteredExcluded = stats.perProvider.reduce((s, p) => s + p.droppedExcluded, 0);
  stats.filteredOffTrack = stats.perProvider.reduce((s, p) => s + p.droppedOffTrack, 0);
  stats.removed = stats.perProvider.flatMap((p) => p.removed);

  // Dedup within this batch by fingerprint; upsert companies then jobs.
  const byFingerprint = new Map<string, NormalizedJob>();
  for (const j of collected) {
    if (!j.applicationUrl) continue;
    const fp = computeFingerprint({
      company: j.company.name,
      title: j.title,
      location: j.location,
      description: j.description,
    });
    if (byFingerprint.has(fp)) {
      stats.duplicatesMerged++;
      continue;
    }
    byFingerprint.set(fp, j);
  }

  for (const [fp, job] of byFingerprint) {
    const companyId = await upsertCompany(supabase, job.company);

    // Existing job with same fingerprint from another provider?
    const { data: existing } = await supabase
      .from("jobs")
      .select("id, provider, source_id, last_seen_at")
      .eq("fingerprint", fp)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    const payload: Record<string, unknown> = {
      title: job.title,
      company_id: companyId,
      location: job.location,
      location_country: job.locationCountry,
      remote_status: job.remoteStatus,
      employment_type: job.employmentType,
      experience_level: job.experienceLevel,
      salary_min: job.salaryMin,
      salary_max: job.salaryMax,
      salary_currency: job.salaryCurrency,
      description: job.description,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      required_skills: job.requiredSkills,
      preferred_skills: job.preferredSkills,
      benefits: job.benefits,
      application_url: job.applicationUrl,
      provider: job.provider,
      source_id: job.sourceId,
      posted_at: job.postedAt,
      expires_at: job.expiresAt,
      fingerprint: fp,
      raw_payload: job.rawPayload ?? null,
      last_seen_at: nowIso,
      is_active: true,
    };

    if (existing?.id) {
      await supabase.from("jobs").update(payload).eq("id", existing.id);
      stats.updated++;
      if (existing.provider !== job.provider || existing.source_id !== job.sourceId) {
        await supabase
          .from("job_provider_ids")
          .upsert(
            { job_id: existing.id, provider: job.provider, source_id: job.sourceId, url: job.applicationUrl },
            { onConflict: "provider,source_id" },
          );
        stats.duplicatesMerged++;
      }
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("jobs")
        .insert({ ...payload, first_seen_at: nowIso })
        .select("id")
        .maybeSingle();
      if (!insErr && inserted?.id) {
        stats.inserted++;
        await supabase
          .from("job_provider_ids")
          .upsert(
            { job_id: inserted.id, provider: job.provider, source_id: job.sourceId, url: job.applicationUrl },
            { onConflict: "provider,source_id" },
          );
      }
    }
  }

  return stats;
}

/**
 * Filter provider results by the CandidateProfile.
 *
 * A job is dropped when:
 *   - classifyJob resolves it into an excluded family (hard-exclude), OR
 *   - it doesn't classify into any allowed family AND its title/description
 *     doesn't match any of the profile's role queries.
 *
 * Every kept job also increments the count for each query it matched, so the
 * Debug Panel can show "which queries actually returned jobs".
 */
function filterJobsByProfile(
  jobs: NormalizedJob[],
  profile: CandidateProfile,
  perProv: PerProviderStat,
  queryStats: Map<string, PerQueryStat>,
): NormalizedJob[] {
  const out: NormalizedJob[] = [];
  const queries = profile.roleQueries.map((q) => q.toLowerCase());
  for (const j of jobs) {
    const jobLike = {
      title: j.title,
      description: j.description,
      requiredSkills: j.requiredSkills,
      preferredSkills: j.preferredSkills,
      companyTechStack: j.company?.techStack ?? [],
      responsibilities: j.responsibilities,
      requirements: j.requirements,
    };
    const family = classifyJob(jobLike);
    const confidence = domainConfidence(jobLike, profile);
    const remove = (reason: string, excluded = false) => {
      if (excluded) perProv.droppedExcluded++;
      else perProv.droppedOffTrack++;
      if (perProv.removed.length < 30) {
        perProv.removed.push({
          provider: j.provider,
          title: j.title,
          company: j.company?.name ?? "—",
          reason,
        });
      }
    };

    // Hard exclusion — cross-track leakage.
    if (family && profile.excludedFamilyIds.has(family.id)) {
      remove(`Excluded family: ${family.label}`, true);
      continue;
    }

    if (confidence.excluded) {
      remove(confidence.reason, true);
      continue;
    }

    // Allowed if family is in the brain's set …
    const allowedByFamily = !!(family && profile.familyIds.has(family.id));

    // …or the title/description contains one of the AI-generated queries.
    const hay = `${(j.title ?? "").toLowerCase()} ${(j.description ?? "").toLowerCase().slice(0, 2000)}`;
    const matchedQueries: string[] = [];
    for (const q of queries) {
      if (q.length >= 3 && hay.includes(q)) matchedQueries.push(q);
    }

    if (confidence.confidence < 0.7 || (!allowedByFamily && matchedQueries.length === 0)) {
      remove(confidence.reason || "Low domain confidence");
      continue;
    }

    for (const q of matchedQueries) {
      const stat = queryStats.get(q);
      if (stat) stat.matched++;
    }
    out.push(j);
  }
  return out;
}

async function upsertCompany(
  supabase: SupabaseClient,
  company: NormalizedJob["company"],
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("companies")
    .select("id, tech_stack, logo_url, website")
    .eq("slug", company.slug)
    .maybeSingle();

  if (existing?.id) {
    const mergedStack = Array.from(
      new Set([...(existing.tech_stack as string[] | null ?? []), ...company.techStack]),
    ).slice(0, 40);
    await supabase
      .from("companies")
      .update({
        tech_stack: mergedStack,
        logo_url: existing.logo_url ?? company.logoUrl,
        website: existing.website ?? company.website,
      })
      .eq("id", existing.id);
    return existing.id as string;
  }

  const { data: inserted } = await supabase
    .from("companies")
    .insert({
      name: company.name,
      slug: company.slug,
      domain: company.domain,
      logo_url: company.logoUrl,
      website: company.website,
      industry: company.industry,
      size: company.size,
      remote_policy: company.remotePolicy,
      tech_stack: company.techStack,
      description: company.description,
    })
    .select("id")
    .maybeSingle();
  return (inserted?.id as string) ?? null;
}
