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
import { resolveTitleRole } from "./relevance";
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
  opts: {
    providerIds?: string[];
    candidateProfile?: CandidateProfile | null;
    /**
     * When true, only jobs matching the candidate's own track are stored.
     * Default false: `jobs` is a SHARED pool, so one user's discovery run must
     * never delete other tracks from it. Per-user filtering happens at match
     * and feed time (relevance engine), not at ingest.
     */
    strictProfileFilter?: boolean;
  } = {},
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

      const kept =
        profile && opts.strictProfileFilter
          ? filterJobsByProfile(jobs, profile, perProv, queryStats)
          : filterForSharedPool(jobs, perProv, queryStats, profile);
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

  // Dedup within this batch by fingerprint AND by (provider, source_id) —
  // then persist companies + jobs in bulk. The previous per-row sequential
  // loop made 3+ round trips per job which timed out on Cloudflare Workers
  // for large result sets (Greenhouse returns 3k+). Bulk upserts finish in
  // 1-2 round trips per provider.
  const byFingerprint = new Map<string, NormalizedJob>();
  const byProviderSource = new Set<string>();
  for (const j of collected) {
    if (!j.applicationUrl) continue;
    if (!j.provider || !j.sourceId) continue;
    const key = `${j.provider}::${j.sourceId}`;
    if (byProviderSource.has(key)) continue;
    byProviderSource.add(key);
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

  // 1) Bulk upsert unique companies by slug, then build slug→id map.
  const uniqueCompanies = new Map<string, NormalizedJob["company"]>();
  for (const job of byFingerprint.values()) {
    if (!uniqueCompanies.has(job.company.slug)) {
      uniqueCompanies.set(job.company.slug, job.company);
    }
  }
  const companyRows = [...uniqueCompanies.values()].map((c) => ({
    name: c.name,
    slug: c.slug,
    domain: c.domain,
    logo_url: c.logoUrl,
    website: c.website,
    industry: c.industry,
    size: c.size,
    remote_policy: c.remotePolicy,
    tech_stack: c.techStack,
    description: c.description,
  }));
  const slugToId = new Map<string, string>();
  if (companyRows.length) {
    for (let i = 0; i < companyRows.length; i += 200) {
      const chunk = companyRows.slice(i, i + 200);
      const { data: upserted, error: cErr } = await supabase
        .from("companies")
        .upsert(chunk, { onConflict: "slug" })
        .select("id, slug");
      if (cErr) {
        stats.errors.push({ provider: "companies", message: cErr.message });
        continue;
      }
      for (const row of upserted ?? []) {
        if (row.slug && row.id) slugToId.set(row.slug as string, row.id as string);
      }
    }
  }

  // 2) Bulk upsert jobs on (provider, source_id) conflict.
  const nowIso = new Date().toISOString();
  const jobRows: Array<Record<string, unknown>> = [];
  for (const [fp, job] of byFingerprint) {
    jobRows.push({
      title: job.title,
      company_id: slugToId.get(job.company.slug) ?? null,
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
      first_seen_at: nowIso,
      last_seen_at: nowIso,
      is_active: true,
    });
  }

  const providerIdRows: Array<Record<string, unknown>> = [];
  if (jobRows.length) {
    for (let i = 0; i < jobRows.length; i += 50) {
      const chunk = jobRows.slice(i, i + 50);
      const { data: upserted, error: jErr } = await supabase
        .from("jobs")
        .upsert(chunk, { onConflict: "provider,source_id" })
        .select("id, provider, source_id, application_url");
      if (jErr) {
        stats.errors.push({ provider: "jobs", message: jErr.message });
        continue;
      }
      stats.inserted += upserted?.length ?? 0;
      for (const row of upserted ?? []) {
        providerIdRows.push({
          job_id: row.id,
          provider: row.provider,
          source_id: row.source_id,
          url: row.application_url,
        });
      }
    }
  }

  if (providerIdRows.length) {
    for (let i = 0; i < providerIdRows.length; i += 200) {
      await supabase
        .from("job_provider_ids")
        .upsert(providerIdRows.slice(i, i + 200), { onConflict: "provider,source_id" });
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
/**
 * Shared-pool ingest filter. Keeps every technical posting regardless of which
 * user triggered the run — only clearly non-technical roles (sales, HR,
 * finance, support…) are rejected, since no candidate in this product should
 * ever be shown those. Query-match stats are still recorded for the debug panel.
 */
function filterForSharedPool(
  jobs: NormalizedJob[],
  perProv: PerProviderStat,
  queryStats: Map<string, PerQueryStat>,
  profile: CandidateProfile | null,
): NormalizedJob[] {
  const queries = (profile?.roleQueries ?? []).map((q) => q.toLowerCase());
  const out: NormalizedJob[] = [];
  for (const j of jobs) {
    const role = resolveTitleRole(j.title ?? "");
    if (role.nonTechnical) {
      perProv.droppedExcluded++;
      if (perProv.removed.length < 30) {
        perProv.removed.push({
          provider: j.provider,
          title: j.title,
          company: j.company?.name ?? "—",
          reason: "Non-technical role",
        });
      }
      continue;
    }
    const hay = `${(j.title ?? "").toLowerCase()} ${(j.description ?? "").toLowerCase().slice(0, 2000)}`;
    for (const q of queries) {
      if (q.length < 3 || !hay.includes(q)) continue;
      const stat = queryStats.get(q);
      if (stat) stat.matched++;
    }
    out.push(j);
  }
  return out;
}

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

