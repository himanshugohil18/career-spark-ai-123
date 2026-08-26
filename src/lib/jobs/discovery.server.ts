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
import { getProvider, listProviderIds } from "./providers/registry";
import {
  AUTO_DISABLE_AFTER_FAILURES,
  healthFromFailures,
  providerMeta,
} from "./provider-registry";
import {
  classifyJob,
  domainConfidence,
  type CandidateProfile,
} from "./role-synonyms";
import { resolveTitleRole } from "./relevance";
import { expandRoleQueries } from "./providers/queries";
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
  skipped: { provider: string; reason: string }[];
};

/**
 * Source registry sync — a provider added in code is registered in
 * `job_sources` automatically on the next crawl, so adding a source never
 * needs a manual database insert. Existing rows keep their ops state
 * (enabled / config / health); only tier + source_type are refreshed.
 * New tier-3 (experimental) sources land disabled and must be enabled by an
 * admin; tier 1-2 land enabled.
 */
/**
 * A source is auto-disabled when it is experimental (tier 3) and keeps
 * failing, or when it has NEVER once produced a usable crawl regardless of
 * tier — a permanently blocked endpoint is dead weight, not "awaiting
 * maintenance" forever.
 */
function shouldAutoDisable(
  failures: number,
  tier: number,
  lastSuccessAt: string | null | undefined,
): boolean {
  if (failures < AUTO_DISABLE_AFTER_FAILURES) return false;
  return tier === 3 || !lastSuccessAt;
}

export async function syncSourceRegistry(supabase: SupabaseClient): Promise<string[]> {
  const { data: existing, error } = await supabase.from("job_sources").select("id");
  if (error) return [];
  const known = new Set((existing ?? []).map((r: any) => String(r.id)));
  const added: string[] = [];
  const rows = listProviderIds()
    .filter((id) => id !== "custom")
    .map((id) => ({ id, meta: providerMeta(id) }))
    .filter(({ id }) => !known.has(id))
    .map(({ id, meta }) => {
      added.push(id);
      return {
        id,
        display_name: meta.name,
        enabled: meta.tier <= 2,
        tier: meta.tier,
        source_type: meta.sourceType,
        health_status: "unknown",
        config: {},
      };
    });
  if (rows.length > 0) {
    await supabase.from("job_sources").upsert(rows, { onConflict: "id" });
  }
  return added;
}

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
    skipped: [],
  };

  // Register any provider that exists in code but not yet in the table.
  await syncSourceRegistry(supabase);

  // Load enabled providers from job_sources.
  let query = supabase
    .from("job_sources")
    .select(
      "id, config, enabled, tier, health_status, consecutive_failures, failure_count, last_success_at, avg_response_ms",
    );
  if (opts.providerIds && opts.providerIds.length > 0) {
    query = query.in("id", opts.providerIds);
  } else {
    query = query.eq("enabled", true);
  }
  const { data: sources, error } = await query;
  if (error) throw new Error(`Failed to load sources: ${error.message}`);

  // Early-career candidates get India's fresher/trainee vocabulary added to
  // their role queries, otherwise query-first providers only ever return the
  // senior postings that dominate plain title search.
  const fetchQueries = profile
    ? expandRoleQueries(profile.roleQueries, profile.seniority, profile.yearsOfExperience)
    : undefined;

  const collected: NormalizedJob[] = [];
  const queryStats = new Map(stats.perQuery.map((q) => [q.query.toLowerCase(), q] as const));

  // Tier 1 (official company ATS / documented company feeds) crawls first so the
  // production core always lands even if a later experimental provider stalls.
  const ordered = [...(sources ?? [])].sort(
    (a: any, b: any) => providerMeta(a.id).tier - providerMeta(b.id).tier,
  );

  for (const src of ordered) {
    const provider = getProvider(src.id);
    if (!provider) continue;
    const meta = providerMeta(src.id);
    const priorFailures = Number((src as any).consecutive_failures ?? 0);
    const explicitlyRequested = (opts.providerIds?.length ?? 0) > 0;
    // Back-off: an unhealthy provider is not retried on every scheduled crawl.
    // It stays in the table with its real health so maintenance can see it, and
    // crucially its stored jobs are NOT touched, so they age out naturally.
    if (!explicitlyRequested && priorFailures >= AUTO_DISABLE_AFTER_FAILURES) {
      stats.skipped.push({ provider: src.id, reason: "unhealthy — awaiting maintenance" });
      continue;
    }
    stats.providersRun.push(src.id);
    const startedAt = Date.now();
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
        queries: fetchQueries,
        locations: profile?.locations,
        limit: 260,
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
      const elapsed = Date.now() - startedAt;
      // A crawl that returns zero listings is a SOFT FAILURE, not a success:
      // it does not refresh last_success_at and it does not reset the failure
      // streak, so a silently blocked source degrades instead of looking fine.
      const succeeded = perProv.fetched > 0;
      const failures = succeeded ? 0 : priorFailures + 1;
      const priorAvg = Number((src as any).avg_response_ms ?? 0);
      const nowStamp = new Date().toISOString();
      await supabase
        .from("job_sources")
        .update({
          last_run_at: nowStamp,
          last_attempt_at: nowStamp,
          last_success_at: succeeded ? nowStamp : ((src as any).last_success_at ?? null),
          last_error: succeeded ? null : "Crawl returned zero usable listings",
          tier: meta.tier,
          source_type: meta.sourceType,
          consecutive_failures: failures,
          failure_count: Number((src as any).failure_count ?? 0) + (succeeded ? 0 : 1),
          last_fetched_count: perProv.fetched,
          last_verified_count: perProv.kept,
          avg_response_ms: priorAvg > 0 ? Math.round(priorAvg * 0.7 + elapsed * 0.3) : elapsed,
          health_status: healthFromFailures(failures, succeeded || !!(src as any).last_success_at),
          enabled: shouldAutoDisable(failures, meta.tier, (src as any).last_success_at) ? false : src.enabled,
          disabled_reason: shouldAutoDisable(failures, meta.tier, (src as any).last_success_at)
            ? "Auto-disabled after repeated empty or failed crawls"
            : null,
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
      const failures = priorFailures + 1;
      const nowStamp = new Date().toISOString();
      // Hard failure: last_success_at and every stored job are left untouched.
      await supabase
        .from("job_sources")
        .update({
          last_run_at: nowStamp,
          last_attempt_at: nowStamp,
          last_error: message.slice(0, 500),
          tier: meta.tier,
          source_type: meta.sourceType,
          consecutive_failures: failures,
          failure_count: Number((src as any).failure_count ?? 0) + 1,
          last_fetched_count: 0,
          health_status: healthFromFailures(failures, !!(src as any).last_success_at),
          enabled: shouldAutoDisable(failures, meta.tier, (src as any).last_success_at) ? false : src.enabled,
          disabled_reason: shouldAutoDisable(failures, meta.tier, (src as any).last_success_at)
            ? `Auto-disabled after ${failures} consecutive failures`
            : null,
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
  //
  // PostgREST upserts overwrite every supplied column, so read the existing
  // provenance first: first_seen_at must stay the TRUE first-discovery date
  // and verification_count must accumulate across crawls.
  const nowIso = new Date().toISOString();
  const existingProvenance = new Map<string, { first_seen_at: string; verification_count: number }>();
  {
    const keys = [...byFingerprint.values()].map((j) => j.sourceId);
    for (let i = 0; i < keys.length; i += 300) {
      const chunk = keys.slice(i, i + 300);
      const { data: prior } = await supabase
        .from("jobs")
        .select("provider, source_id, first_seen_at, verification_count")
        .in("source_id", chunk);
      for (const row of prior ?? []) {
        existingProvenance.set(`${row.provider}::${row.source_id}`, {
          first_seen_at: row.first_seen_at as string,
          verification_count: Number(row.verification_count ?? 0),
        });
      }
    }
  }
  const jobRows: Array<Record<string, unknown>> = [];
  for (const [fp, job] of byFingerprint) {
    const prior = existingProvenance.get(`${job.provider}::${job.sourceId}`);
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
      // Never overwrite the original discovery date on re-crawl.
      first_seen_at: prior?.first_seen_at ?? nowIso,
      last_seen_at: nowIso,
      verification_count: (prior?.verification_count ?? 0) + 1,
      // The source returned this listing in the current crawl, so it is
      // verified as of now. Any previous stale flag is cleared.
      last_verified_at: nowIso,
      stale_reason: null,
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

