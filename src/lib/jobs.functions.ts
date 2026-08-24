/**
 * Job feed, saved jobs, collections, viewed history, natural-language search,
 * notifications. All user-scoped via `requireSupabaseAuth`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCareerBrainSnapshot, type CareerBrainSnapshot } from "./career-brain.service";
import { parseNaturalLanguage } from "./jobs/nl-search.server";
import { buildRecommendations } from "./jobs/recommendations.server";
import { refreshUserMatches } from "./jobs/matching.server";
import { domainConfidence, expandQueryKeywords, titleRelevanceScore } from "./jobs/role-synonyms";
import { computeRelevance, brainTechVocabulary, jobDedupeKey } from "./jobs/relevance";
import { buildJobSections, buildInsights } from "./jobs/sections.server";
import {
  preferredLocations,
  locationProximity,
  isIndiaJob,
  candidateIsIndian,
} from "./jobs/location";

const FiltersSchema = z.object({
  q: z.string().optional(),
  role: z.string().optional(),
  location: z.string().optional(),
  remoteStatus: z.array(z.enum(["remote","hybrid","onsite","unknown"])).optional(),
  employmentType: z.array(z.enum(["full_time","part_time","contract","internship","temporary","freelance","unknown"])).optional(),
  experienceLevel: z.array(z.enum(["intern","entry","junior","mid","senior","staff","principal","lead","executive","unknown"])).optional(),
  provider: z.array(z.string()).optional(),
  companyId: z.string().uuid().optional(),
  technology: z.array(z.string()).optional(),
  minMatch: z.number().min(0).max(100).optional(),
  postedWithinDays: z.number().min(1).max(365).optional(),
  salaryMin: z.number().optional(),
  sort: z.enum(["match","newest","salary","remote","updated"]).optional(),
  page: z.number().min(1).optional(),
  pageSize: z.number().min(1).max(50).optional(),
});

export const listJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => FiltersSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 20;

    // Career Brain provides the default ranking signal when no query is set.
    const brain = (await getCareerBrainSnapshot()) as CareerBrainSnapshot;
    const { buildProfileFromSnapshot, familyTitleRelevance, jobFamilyFitProfile, profileForExplicitSearch } = await import("./jobs/role-synonyms");
    const baseProfile = buildProfileFromSnapshot(brain);


    const rawQuery = (data.q ?? data.role ?? "").trim();
    const profile = rawQuery ? profileForExplicitSearch(baseProfile, rawQuery) : baseProfile;
    const brainFamilies = profile.families;
    const brainTechs = brainTechVocabulary(brain);
    const prefLocations = preferredLocations(brain);
    // India-first: when the resume points at India (or has no location at
    // all, which is the common case for our users), Indian postings are
    // boosted ahead of equally-relevant international ones.
    const indiaFirst = candidateIsIndian(prefLocations) || prefLocations.length === 0;

    const expansion = rawQuery ? expandQueryKeywords(rawQuery) : null;
    const roleFamily = expansion?.family ?? null;

    const overFetch = rawQuery || brainFamilies.length ? 900 : pageSize;
    const useMemoryPaging = !!rawQuery || brainFamilies.length > 0;
    const from = useMemoryPaging ? 0 : (page - 1) * pageSize;
    const to = useMemoryPaging ? overFetch - 1 : from + pageSize - 1;

    let jobsQuery = context.supabase
      .from("jobs")
      .select("*, company:companies(id,name,slug,logo_url,industry,size,remote_policy,tech_stack)", { count: "exact" })
      .eq("is_active", true);

    if (expansion && expansion.keywords.length) {
      const orClause = expansion.keywords
        .map((k) => `title.ilike.%${k.replace(/[,()]/g, " ")}%`)
        .join(",");
      jobsQuery = jobsQuery.or(orClause);
    }
    if (data.location) jobsQuery = jobsQuery.ilike("location", `%${data.location}%`);
    if (data.remoteStatus?.length) jobsQuery = jobsQuery.in("remote_status", data.remoteStatus);
    if (data.employmentType?.length) jobsQuery = jobsQuery.in("employment_type", data.employmentType);
    if (data.experienceLevel?.length) jobsQuery = jobsQuery.in("experience_level", data.experienceLevel);
    if (data.provider?.length) jobsQuery = jobsQuery.in("provider", data.provider);
    if (data.companyId) jobsQuery = jobsQuery.eq("company_id", data.companyId);
    if (data.technology?.length) jobsQuery = jobsQuery.overlaps("required_skills", data.technology);
    if (data.salaryMin) jobsQuery = jobsQuery.gte("salary_max", data.salaryMin);
    if (data.postedWithinDays) {
      const since = new Date(Date.now() - data.postedWithinDays * 86_400_000).toISOString();
      jobsQuery = jobsQuery.gte("posted_at", since);
    }

    switch (data.sort ?? "match") {
      case "newest":
        jobsQuery = jobsQuery.order("posted_at", { ascending: false, nullsFirst: false });
        break;
      case "salary":
        jobsQuery = jobsQuery.order("salary_max", { ascending: false, nullsFirst: false });
        break;
      case "remote":
        jobsQuery = jobsQuery
          .order("remote_status", { ascending: true })
          .order("posted_at", { ascending: false, nullsFirst: false });
        break;
      case "updated":
        jobsQuery = jobsQuery.order("last_seen_at", { ascending: false });
        break;
      default:
        jobsQuery = jobsQuery.order("posted_at", { ascending: false, nullsFirst: false });
    }

    const { data: rows, count, error } = await jobsQuery.range(from, to);
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r) => r.id);
    const { data: matches } = ids.length
      ? await context.supabase
          .from("job_matches")
          .select("job_id, overall_score, skill_score, experience_score, technology_score, location_score, salary_score, career_goal_score, education_score, strengths, weaknesses, missing_skills, explanation")
          .eq("user_id", context.userId)
          .in("job_id", ids)
      : { data: [] };
    const matchMap = new Map((matches ?? []).map((m: any) => [m.job_id, m]));

    const { data: saved } = ids.length
      ? await context.supabase
          .from("saved_jobs")
          .select("job_id, status")
          .eq("user_id", context.userId)
          .in("job_id", ids)
      : { data: [] };
    const savedMap = new Map((saved ?? []).map((s: any) => [s.job_id, s.status]));

    // Recommendation memory: down-rank previously ignored / archived jobs,
    // slight boost for previously saved / clicked jobs.
    const { data: history } = ids.length
      ? await context.supabase
          .from("recommendation_history")
          .select("kind, payload")
          .eq("user_id", context.userId)
          .order("created_at", { ascending: false })
          .limit(300)
      : { data: [] };
    const historyBias = new Map<string, number>();
    for (const h of (history ?? []) as any[]) {
      const jobId = h?.payload?.jobId;
      if (!jobId || !ids.includes(jobId)) continue;
      const cur = historyBias.get(jobId) ?? 0;
      if (h.kind === "ignored" || h.kind === "archived") historyBias.set(jobId, cur - 25);
      else if (h.kind === "saved" || h.kind === "applied") historyBias.set(jobId, cur + 12);
      else if (h.kind === "clicked") historyBias.set(jobId, cur + 4);
    }

    let items = (rows ?? []).map((row: any) => {
      const proximity = locationProximity({
        jobLocation: row.location,
        jobCountry: row.location_country,
        remoteStatus: row.remote_status,
        preferred: prefLocations,
      });
      const india = isIndiaJob(row.location, row.location_country);

      const titleScore = rawQuery ? titleRelevanceScore(row.title ?? "", rawQuery) : 0;
      const familyScore = brainFamilies.length
        ? Math.max(...brainFamilies.map((f) => familyTitleRelevance(row.title ?? "", f)))
        : 0;
      const jobLike = {
        title: row.title ?? "",
        description: row.description ?? "",
        requiredSkills: row.required_skills ?? [],
        preferredSkills: row.preferred_skills ?? [],
        companyTechStack: row.company?.tech_stack ?? [],
        responsibilities: row.responsibilities ?? [],
        requirements: row.requirements ?? [],
      };
      const fitInfo = brainFamilies.length
        ? jobFamilyFitProfile(jobLike, profile)
        : { fit: 1, excluded: false };
      const fit = fitInfo.fit;
      const relevance = computeRelevance(jobLike, profile, brainTechs);
      const bias = historyBias.get(row.id) ?? 0;
      // Runtime re-cap: stale cached scores from before the profile-based
      // classifier are re-bounded. Excluded domains capped to 15,
      // off-track (fit=0) capped to 22, weak (<=0.4) capped to 48.
      // Cached scores are re-bounded by the current relevance engine so a
      // stale high score can never resurface an off-track job. Jobs that
      // were never matched get an on-the-fly relevance estimate so the feed
      // is never empty and never unranked.
      const cached = matchMap.get(row.id) ?? null;
      let match: any = cached;
      if (cached && brainFamilies.length) {
        const raw = Number((cached as any).overall_score ?? 0);
        const ceiling = relevance.vetoed || fitInfo.excluded
          ? 12
          : relevance.gate
            ? Math.round(20 + relevance.relevance * 85)
            : 38;
        const capped = Math.min(raw, ceiling);
        if (capped !== raw) match = { ...(cached as any), overall_score: capped };
      } else if (!cached && brainFamilies.length && relevance.gate) {
        match = {
          job_id: row.id,
          overall_score: Math.round(25 + relevance.relevance * 70),
          career_goal_score: Math.round(relevance.relevance * 100),
          explanation: relevance.reason,
          estimated: true,
        };
      }
      return {
        ...row,
        match,
        savedStatus: savedMap.get(row.id) ?? null,
        titleScore,
        familyScore,
        familyFit: fit,
        excluded: fitInfo.excluded || relevance.vetoed,
        relevance: relevance.relevance,
        relevant: relevance.gate,
        relevanceReason: relevance.reason,
        domainConfidence: domainConfidence(jobLike, profile),
        interactionBias: bias,
        locationFit: proximity.score,
        locationTier: proximity.tier,
        locationLabel: proximity.label,
        inIndia: india,
        locationBoost:
          proximity.score * 18 +
          (proximity.tier === "same-city" ? 14 : proximity.tier === "nearby-city" ? 9 : 0) +
          (indiaFirst && india ? 12 : 0),
      };
    });


    if (rawQuery) {
      const strict = items.filter((it) => !it.excluded && (it.domainConfidence?.confidence ?? 0) >= 0.7);
      if (strict.length > 0) {
        items = strict;
      } else {
        // Fallback: don't leave the user staring at an empty feed. Keep any
        // job whose title matches the query (titleScore > 0) OR whose family
        // fits the brain, minus hard-excluded domains.
        const relaxed = items.filter(
          (it) => !it.excluded && ((it.titleScore ?? 0) > 0 || (it.familyFit ?? 0) >= 0.4),
        );
        items = relaxed.length > 0 ? relaxed : items.filter((it) => !it.excluded);
      }
    } else if (brainFamilies.length) {
      // Hard on-track filter: only jobs that clear the title-anchored
      // relevance gate reach the UI. Sales, support, ML-research and other
      // off-track postings can never leak into the feed.
      const onTrack = items.filter((it) => !it.excluded && it.relevant);
      items = onTrack.length
        ? onTrack
        : items.filter((it) => !it.excluded && (it.relevance ?? 0) >= 0.35);
    }

    // Collapse duplicate postings of the same role at the same company.
    const seenKeys = new Set<string>();
    items = items.filter((it: any) => {
      const key = jobDedupeKey(it.title ?? "", it.company?.name ?? null);
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });


    // Default: hide sub-40 matches unless the user explicitly widened the
    // filter (minMatch=0 or an active text query).
    const hideLow = (data.minMatch ?? -1) < 0 && !rawQuery;
    if (hideLow && brain.ready) {
      items = items.filter((it) => {
        const m = Number(it.match?.overall_score ?? -1);
        return m < 0 || m >= 40;
      });
    }
    if ((data.minMatch ?? 0) > 0) {
      items = items.filter((it) => Number(it.match?.overall_score ?? 0) >= data.minMatch!);
    }

    if (data.sort === "match" || !data.sort) {
      const rank = (it: any) =>
        Number(it.match?.overall_score ?? 0) +
        (it.relevance ?? 0) * 30 +
        (it.familyScore ?? 0) * 0.1 +
        (it.interactionBias ?? 0) +
        (it.locationBoost ?? 0);
      items.sort((a, b) => {
        if (rawQuery) {
          const t = (b.titleScore ?? 0) - (a.titleScore ?? 0);
          if (t !== 0) return t;
        }
        return rank(b) - rank(a);
      });
    }


    let paged = items;
    let totalOut = count ?? items.length;
    if (useMemoryPaging) {
      totalOut = items.length;
      const start = (page - 1) * pageSize;
      paged = items.slice(start, start + pageSize);
    }

    return {
      items: paged,
      total: totalOut,
      page,
      pageSize,
      roleFamily: roleFamily
        ? { id: roleFamily.id, label: roleFamily.label }
        : brainFamilies[0]
          ? { id: brainFamilies[0].id, label: brainFamilies[0].label }
          : null,
      query: rawQuery || null,
    };
  });

export const getJobDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: job, error } = await context.supabase
      .from("jobs")
      .select("*, company:companies(*)")
      .eq("id", data.jobId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!job) throw new Error("Job not found.");

    // Track view
    await context.supabase.from("viewed_jobs").upsert(
      { user_id: context.userId, job_id: data.jobId, viewed_at: new Date().toISOString() },
      { onConflict: "user_id,job_id" },
    );

    const [{ data: match }, { data: saved }, { data: otherRoles }] = await Promise.all([
      context.supabase
        .from("job_matches")
        .select("*")
        .eq("user_id", context.userId)
        .eq("job_id", data.jobId)
        .maybeSingle(),
      context.supabase
        .from("saved_jobs")
        .select("*")
        .eq("user_id", context.userId)
        .eq("job_id", data.jobId)
        .maybeSingle(),
      job.company_id
        ? context.supabase
            .from("jobs")
            .select("id, title, location, remote_status")
            .eq("company_id", job.company_id)
            .eq("is_active", true)
            .neq("id", data.jobId)
            .limit(6)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    return { job, match, saved, otherRoles: otherRoles ?? [] };
  });

export const saveJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      jobId: z.string().uuid(),
      status: z.enum(["saved","favorite","archived","ignored","applied_later"]).default("saved"),
      notes: z.string().max(4000).optional(),
      tags: z.array(z.string().max(40)).max(20).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("saved_jobs").upsert(
      {
        user_id: context.userId,
        job_id: data.jobId,
        status: data.status,
        notes: data.notes,
        tags: data.tags,
      },
      { onConflict: "user_id,job_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unsaveJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("saved_jobs")
      .delete()
      .eq("user_id", context.userId)
      .eq("job_id", data.jobId);
    return { ok: true };
  });

/**
 * Edit the notes / status / tags of an already-saved job. Upserts so the
 * user can also convert a viewed job into a saved one from the detail page.
 */
export const updateSavedJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      jobId: z.string().uuid(),
      status: z.enum(["saved","favorite","archived","ignored","applied_later"]).optional(),
      notes: z.string().max(4000).nullable().optional(),
      tags: z.array(z.string().max(40)).max(20).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: { user_id: string; job_id: string; status?: string; notes?: string | null; tags?: string[] } = {
      user_id: context.userId,
      job_id: data.jobId,
    };
    if (data.status !== undefined) patch.status = data.status;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.tags !== undefined) patch.tags = data.tags;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await context.supabase.from("saved_jobs").upsert(patch as any, { onConflict: "user_id,job_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Similar roles for the current job detail page. Uses title-family + skill
 * overlap + company tech-stack overlap, ranked by the user's cached matches
 * when available. Fall back to raw overlap when the user hasn't matched
 * those jobs yet.
 */
export const getSimilarJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid(), limit: z.number().min(1).max(20).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const limit = data.limit ?? 6;
    const { data: source } = await context.supabase
      .from("jobs")
      .select("id, title, required_skills, preferred_skills, company_id, company:companies(tech_stack)")
      .eq("id", data.jobId)
      .maybeSingle();
    if (!source) return [];

    const skills = new Set<string>([
      ...((source.required_skills as string[] | null) ?? []),
      ...((source.preferred_skills as string[] | null) ?? []),
      ...(((source.company as { tech_stack?: string[] } | null)?.tech_stack) ?? []),
    ].map((s) => String(s).toLowerCase()));
    const titleFamily = expandQueryKeywords(String(source.title ?? ""));

    let q = context.supabase
      .from("jobs")
      .select("id, title, location, remote_status, required_skills, preferred_skills, posted_at, company:companies(id, name, logo_url, tech_stack)")
      .eq("is_active", true)
      .neq("id", data.jobId)
      .limit(60);
    if (titleFamily && titleFamily.keywords.length) {
      const or = titleFamily.keywords.map((k) => `title.ilike.%${k.replace(/[,()]/g, " ")}%`).join(",");
      q = q.or(or);
    }
    const { data: rows } = await q;
    const candidates = (rows ?? []) as Array<Record<string, unknown>>;

    const { data: matches } = candidates.length
      ? await context.supabase
          .from("job_matches")
          .select("job_id, overall_score")
          .eq("user_id", context.userId)
          .in("job_id", candidates.map((c) => c.id as string))
      : { data: [] as Array<{ job_id: string; overall_score: number }> };
    const matchMap = new Map((matches ?? []).map((m: { job_id: string; overall_score: number }) => [m.job_id, Number(m.overall_score ?? 0)]));

    const scored = candidates.map((row) => {
      const rSkills = new Set<string>([
        ...(((row.required_skills as string[] | null) ?? [])),
        ...(((row.preferred_skills as string[] | null) ?? [])),
        ...(((row.company as { tech_stack?: string[] } | null)?.tech_stack) ?? []),
      ].map((s) => String(s).toLowerCase()));
      let overlap = 0;
      for (const s of rSkills) if (skills.has(s)) overlap++;
      const titleScore = titleRelevanceScore(String(row.title ?? ""), String(source.title ?? ""));
      const match = matchMap.get(row.id as string) ?? null;
      const rank = (match ?? 0) * 0.6 + overlap * 6 + titleScore * 8;
      return { row, overlap, match, rank };
    });
    scored.sort((a, b) => b.rank - a.rank);
    return scored.slice(0, limit).map((s) => {
      const r = s.row as {
        id: string;
        title: string;
        location: string | null;
        remote_status: string | null;
        company: { id: string; name: string; logo_url: string | null } | null;
      };
      return {
        id: r.id,
        title: r.title,
        location: r.location,
        remote_status: r.remote_status,
        company: r.company,
        overlap: s.overlap,
        match: s.match,
      };
    });
  });

export const listSavedJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      status: z.enum(["saved","favorite","archived","ignored","applied_later"]).optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("saved_jobs")
      .select("id, status, notes, tags, created_at, job:jobs(id, title, location, remote_status, application_url, posted_at, company:companies(id,name,slug,logo_url))")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listCollections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Seed defaults on first use
    const { data: existing } = await context.supabase
      .from("job_collections")
      .select("id")
      .eq("user_id", context.userId)
      .eq("is_default", true)
      .limit(1);
    if (!existing || existing.length === 0) {
      await context.supabase.rpc("ensure_default_job_collections", { _user_id: context.userId });
    }
    const { data, error } = await context.supabase
      .from("job_collections")
      .select("id, name, description, is_default, created_at, items:job_collection_items(count)")
      .eq("user_id", context.userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ name: z.string().min(1).max(80), description: z.string().max(200).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("job_collections")
      .insert({ user_id: context.userId, name: data.name, description: data.description })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const addToCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ collectionId: z.string().uuid(), jobId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("job_collection_items").upsert(
      { collection_id: data.collectionId, job_id: data.jobId, user_id: context.userId },
      { onConflict: "collection_id,job_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeFromCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ collectionId: z.string().uuid(), jobId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("job_collection_items")
      .delete()
      .eq("collection_id", data.collectionId)
      .eq("job_id", data.jobId)
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const getCollectionItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ collectionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("job_collection_items")
      .select("id, added_at, job:jobs(id, title, location, remote_status, application_url, company:companies(id,name,logo_url))")
      .eq("collection_id", data.collectionId)
      .eq("user_id", context.userId)
      .order("added_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const nlSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ query: z.string().min(1).max(400) }).parse(d))
  .handler(async ({ data, context }) => {
    const filters = await parseNaturalLanguage(data.query);
    await context.supabase.from("search_history").insert({
      user_id: context.userId,
      query: data.query,
      parsed_filters: filters as any,
      kind: "natural",
    });
    return filters;
  });

export const listRecentSearches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("search_history")
      .select("id, query, parsed_filters, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(10);
    return data ?? [];
  });

export const listRecentlyViewed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("viewed_jobs")
      .select("viewed_at, job:jobs(id, title, location, remote_status, company:companies(name,logo_url))")
      .eq("user_id", context.userId)
      .order("viewed_at", { ascending: false })
      .limit(15);
    return data ?? [];
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("job_notifications")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);
    return data ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("job_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const getFeedRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return buildRecommendations(context.supabase, context.userId);
  });

export const getDashboardJobStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ count: totalActive }, { count: savedCount }, { data: topMatches }] = await Promise.all([
      context.supabase.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
      context.supabase.from("saved_jobs").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
      context.supabase
        .from("job_matches")
        .select("overall_score, explanation, job:jobs(id,title,location,remote_status,company:companies(name,logo_url))")
        .eq("user_id", context.userId)
        .order("overall_score", { ascending: false })
        .limit(3),
    ]);
    return {
      totalActive: totalActive ?? 0,
      savedCount: savedCount ?? 0,
      topMatches: topMatches ?? [],
    };
  });

/**
 * Trigger a full discovery + match refresh for the current user.
 * Runs providers via the admin client (RLS-bypass — catalog data is global),
 * then matches per-user via the user client (RLS-scoped).
 * If DEV and every provider returned zero, seeds a realistic dev dataset so
 * the pipeline can be verified end-to-end.
 */
export const kickMatchRefresh = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const brain = (await getCareerBrainSnapshot()) as CareerBrainSnapshot;
    if (!brain.ready) return { discovery: null, evaluated: 0, upserted: 0, skipped: 0, seeded: 0 };

    // Fast path: score the existing real catalog first. Discovery can take
    // many seconds against public providers; users should see matches from
    // the current catalog immediately instead of waiting on network fetches.
    const match = await refreshUserMatches(context.supabase, brain, { limit: 180 });
    if (match.newMatches.length) {
      const { notifyNewJobMatches } = await import("./email/notify-matches.server");
      await notifyNewJobMatches(context.supabase, context.userId, match.newMatches);
    }
    if (match.evaluated > 0 || match.skipped > 0 || match.upserted > 0) {
      return { discovery: null, seeded: 0, ...match };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count: jobsCount } = await supabaseAdmin
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);
    if ((jobsCount ?? 0) > 0) {
      return { discovery: null, seeded: 0, ...match };
    }

    const { runDiscovery } = await import("./jobs/discovery.server");
    const { buildProfileFromSnapshot } = await import("./jobs/role-synonyms");
    const candidateProfile = buildProfileFromSnapshot(brain);
    const discovery = await runDiscovery(supabaseAdmin, { candidateProfile });
    const retry = await refreshUserMatches(context.supabase, brain, { limit: 180 });
    if (retry.newMatches.length) {
      const { notifyNewJobMatches } = await import("./email/notify-matches.server");
      await notifyNewJobMatches(context.supabase, context.userId, retry.newMatches);
    }
    return { discovery, seeded: 0, ...retry };
  });

/**
 * Idempotent bootstrap for the Jobs feed. Called by the Jobs page on mount
 * so the default view is ALWAYS a Career-Brain-personalized ranked feed —
 * never raw newest jobs. No-op when the user already has recent matches.
 */
export const ensureInitialMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const brain = (await getCareerBrainSnapshot()) as CareerBrainSnapshot;
    if (!brain.ready) return { ready: false, ran: false, evaluated: 0 };

    const { count: existingMatches } = await context.supabase
      .from("job_matches")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId);
    if ((existingMatches ?? 0) >= 25) return { ready: true, ran: false, evaluated: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count: jobsCount } = await supabaseAdmin
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    if ((jobsCount ?? 0) === 0) {
      const { runDiscovery } = await import("./jobs/discovery.server");
      const { buildProfileFromSnapshot } = await import("./jobs/role-synonyms");
      const candidateProfile = buildProfileFromSnapshot(brain);
      await runDiscovery(supabaseAdmin, { candidateProfile });
    }

    const result = await refreshUserMatches(context.supabase, brain, { limit: 90 });
    if (result.newMatches.length) {
      const { notifyNewJobMatches } = await import("./email/notify-matches.server");
      await notifyNewJobMatches(context.supabase, context.userId, result.newMatches);
    }
    return { ready: true, ran: true, ...result };
  });

/**
 * DEV-only pipeline health snapshot for the on-dashboard debug panel.
 */
export const getPipelineDebug = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [
      { count: jobsCount },
      { count: companiesCount },
      { count: matchesCount },
      { data: sources },
      { data: lastMatch },
      { data: brainRow },
      { data: activeResume },
      { data: health },
      { data: dna },
      { data: avgMatches },
      { data: rankedRows },
    ] = await Promise.all([
      supabaseAdmin.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabaseAdmin.from("companies").select("id", { count: "exact", head: true }),
      context.supabase.from("job_matches").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
      supabaseAdmin.from("job_sources").select("id, enabled, last_run_at, last_error, config"),
      context.supabase.from("job_matches").select("computed_at").eq("user_id", context.userId).order("computed_at", { ascending: false }).limit(1).maybeSingle(),
      context.supabase.from("career_brain").select("version, ai_model, last_generated_at").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("resumes").select("id, version, status, is_active, file_name").eq("user_id", context.userId).eq("is_active", true).maybeSingle(),
      context.supabase.from("career_health").select("score, updated_at").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("career_dna").select("updated_at").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("job_matches").select("overall_score").eq("user_id", context.userId),
      context.supabase
        .from("job_matches")
        .select("overall_score, job:jobs(id,title,description,required_skills,preferred_skills,responsibilities,requirements,provider,company:companies(name,tech_stack))")
        .eq("user_id", context.userId)
        .order("overall_score", { ascending: false })
        .limit(12),
    ]);
    const avg = avgMatches?.length
      ? Math.round(avgMatches.reduce((s: number, r: any) => s + Number(r.overall_score ?? 0), 0) / avgMatches.length)
      : 0;

    // Career-Brain-driven CandidateProfile — the source of truth for
    // Discovery. Rendered in the DEV Debug Panel so we can eyeball which
    // families are ALLOWED, which are EXCLUDED, and which queries the
    // discovery layer will hand to providers.
    const brain = (await getCareerBrainSnapshot()) as CareerBrainSnapshot;
    const { buildProfileFromSnapshot } = await import("./jobs/role-synonyms");
    const profile = buildProfileFromSnapshot(brain);
    const rankedJobs = ((rankedRows ?? []) as any[]).map((r) => {
      const job = r.job;
      const dc = domainConfidence({
        title: job?.title,
        description: job?.description,
        requiredSkills: job?.required_skills ?? [],
        preferredSkills: job?.preferred_skills ?? [],
        companyTechStack: job?.company?.tech_stack ?? [],
        responsibilities: job?.responsibilities ?? [],
        requirements: job?.requirements ?? [],
      }, profile);
      return {
        title: job?.title ?? "—",
        company: job?.company?.name ?? "—",
        provider: job?.provider ?? "—",
        score: Number(r.overall_score ?? 0),
        domainConfidence: Math.round(dc.confidence * 100),
        reason: dc.reason,
        kept: !dc.excluded && dc.confidence >= 0.7,
      };
    });

    return {
      userId: context.userId,
      brainVersion: brainRow?.version ?? null,
      brainModel: brainRow?.ai_model ?? null,
      brainLastGeneratedAt: brainRow?.last_generated_at ?? null,
      resume: activeResume ?? null,
      health: health ?? null,
      hasDna: !!dna,
      jobsCount: jobsCount ?? 0,
      companiesCount: companiesCount ?? 0,
      matchesCount: matchesCount ?? 0,
      averageMatchScore: avg,
      lastMatchAt: lastMatch?.computed_at ?? null,
      sources: sources ?? [],
      discoveryStats: (sources ?? []).map((s: any) => ({
        provider: s.id,
        enabled: s.enabled,
        lastRunAt: s.last_run_at,
        lastError: s.last_error,
        lastDiscovery: s.config?.lastDiscovery ?? null,
      })),
      rankedJobs,
      candidateProfile: {
        ready: brain.ready,
        primary: profile.primaryLabel,
        domain: profile.primaryDomain,
        families: profile.familyLabels,
        excluded: profile.excludedFamilyLabels,
        queries: profile.roleQueries,
        seniority: profile.seniority,
        yearsOfExperience: profile.yearsOfExperience,
        techStack: (profile.techStack ?? []).slice(0, 20),
        locations: profile.locations,
        remotePreference: profile.remotePreference,
      },
    };
  });

// ============= AI Recommendation Center =============

/**
 * Personalized job sections + suggested companies for the top of /jobs.
 * All data derived from real matches + job rows. Skips empty sections.
 */
export const getJobSections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const brain = (await getCareerBrainSnapshot()) as CareerBrainSnapshot;
    if (!brain.ready) return { ready: false, sections: [], companies: [] };
    const { sections, companies } = await buildJobSections(context.supabase, context.userId, brain);
    return { ready: true, sections, companies };
  });

// ============= Recommendation Memory =============

const InteractionSchema = z.object({
  jobId: z.string().uuid(),
  kind: z.enum(["viewed", "clicked", "saved", "ignored", "archived", "applied"]),
  meta: z.record(z.string(), z.any()).optional(),
});

/**
 * Log a user interaction with a job into `recommendation_history`. Used as
 * an additional ranking signal in the future. Fire-and-forget from the UI.
 */
export const trackJobInteraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InteractionSchema.parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("recommendation_history").insert({
      user_id: context.userId,
      kind: data.kind,
      payload: { jobId: data.jobId, ...(data.meta ?? {}) },
      seen_at: data.kind === "viewed" || data.kind === "clicked" ? new Date().toISOString() : null,
    });
    return { ok: true };
  });

export const listInteractionHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("recommendation_history")
      .select("id, kind, payload, seen_at, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

// ============= Dashboard Widgets =============

/**
 * Compact widgets powered by the matching engine for the workspace
 * dashboard: top match today, missing skill of the week, new-since-yesterday,
 * top recommended company.
 */
export const getDashboardWidgets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const brain = (await getCareerBrainSnapshot()) as CareerBrainSnapshot;
    if (!brain.ready) {
      return {
        ready: false,
        topMatch: null,
        newSinceYesterday: 0,
        topCompany: null,
        missingSkill: null,
        highMatchesCount: 0,
      };
    }

    const yesterday = new Date(Date.now() - 86_400_000).toISOString();

    const { buildProfileFromSnapshot } = await import("./jobs/role-synonyms");
    const profile = buildProfileFromSnapshot(brain);

    const [{ data: topMatchRows }, { count: newSince }, { data: matches }] = await Promise.all([
      context.supabase
        .from("job_matches")
        .select("overall_score, skill_score, experience_score, technology_score, career_goal_score, explanation, missing_skills, strengths, job:jobs(id, title, location, remote_status, description, required_skills, preferred_skills, responsibilities, requirements, experience_level, company:companies(id, name, logo_url, tech_stack))")
        .eq("user_id", context.userId)
        .order("overall_score", { ascending: false })
        .limit(20),
      context.supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .gte("first_seen_at", yesterday),
      context.supabase
        .from("job_matches")
        .select("overall_score, missing_skills, skill_score, experience_score, technology_score, career_goal_score, job:jobs(id, company_id, title, description, required_skills, preferred_skills, responsibilities, requirements, experience_level, company:companies(id, name, logo_url, industry, tech_stack))")
        .eq("user_id", context.userId)
        .order("overall_score", { ascending: false })
        .limit(40),
    ]);

    const passesDashboardValidation = (m: any) => {
      const job = m?.job;
      if (!job) return false;
      const dc = domainConfidence({
        title: job.title,
        description: job.description,
        requiredSkills: job.required_skills ?? [],
        preferredSkills: job.preferred_skills ?? [],
        companyTechStack: job.company?.tech_stack ?? [],
        responsibilities: job.responsibilities ?? [],
        requirements: job.requirements ?? [],
      }, profile);
      const score = Number(m.overall_score ?? 0);
      const seniorityOk = !profile.seniority || job.experience_level === "unknown" || job.experience_level === profile.seniority || ["senior", "staff", "lead", "principal"].includes(job.experience_level);
      return !dc.excluded && dc.confidence >= 0.82 && seniorityOk && score >= 70 && Number(m.skill_score ?? 0) >= 50 && Number(m.technology_score ?? 0) >= 50 && Number(m.career_goal_score ?? 0) >= 80;
    };

    const topMatchRow = ((topMatchRows ?? []) as any[]).find(passesDashboardValidation) ?? null;

    // Top company: most matched roles among top 40, sorted by aggregate score
    const bucket = new Map<string, { id: string; name: string; logo_url: string | null; industry: string | null; count: number; topScore: number }>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const m of (matches ?? []) as any[]) {
      if (!passesDashboardValidation(m)) continue;
      const c = m.job?.company;
      if (!c?.id) continue;
      const cur = bucket.get(c.id) ?? { id: c.id, name: c.name, logo_url: c.logo_url, industry: c.industry, count: 0, topScore: 0 };
      cur.count += 1;
      cur.topScore = Math.max(cur.topScore, Number(m.overall_score ?? 0));
      bucket.set(c.id, cur);
    }
    const topCompany = Array.from(bucket.values())
      .filter((c) => c.count >= 2)
      .sort((a, b) => b.topScore - a.topScore || b.count - a.count)[0] ?? null;

    // Missing skill of the week: high-priority missing skill appearing across
    // the most high matches.
    const skillFreq = new Map<string, number>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const m of (matches ?? []) as any[]) {
      if (Number(m.overall_score ?? 0) < 70) continue;
      for (const ms of (m.missing_skills ?? []) as Array<{ skill: string; priority: string }>) {
        if (ms.priority !== "high") continue;
        skillFreq.set(ms.skill, (skillFreq.get(ms.skill) ?? 0) + 1);
      }
    }
    const missingSkill = Array.from(skillFreq.entries()).sort((a, b) => b[1] - a[1])[0] ?? null;

    const highMatchesCount = (matches ?? []).filter((m) => Number(m.overall_score ?? 0) >= 85).length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tm = topMatchRow as any;
    const topMatch = tm
      ? {
          jobId: tm.job?.id,
          title: tm.job?.title,
          companyName: tm.job?.company?.name ?? null,
          companyLogo: tm.job?.company?.logo_url ?? null,
          score: Number(tm.overall_score ?? 0),
          insights: buildInsights(tm, { required_skills: [] }, brain),
        }
      : null;

    return {
      ready: true,
      topMatch,
      newSinceYesterday: newSince ?? 0,
      topCompany,
      missingSkill: missingSkill ? { skill: missingSkill[0], jobsAffected: missingSkill[1] } : null,
      highMatchesCount,
    };
  });


/**
 * Feed pulse — real freshness + coverage telemetry for the Jobs header.
 * Every number here is a live count against the jobs catalog; nothing is
 * simulated. Used by <FeedPulse /> to explain what the user is looking at.
 */
export const getFeedPulse = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const nowMs = Date.now();
    const dayAgo = new Date(nowMs - 86_400_000).toISOString();
    const weekAgo = new Date(nowMs - 7 * 86_400_000).toISOString();

    const [totalActive, newToday, newThisWeek, latest, brainRaw, matchAgg] = await Promise.all([
      context.supabase.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
      context.supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .gte("first_seen_at", dayAgo),
      context.supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .gte("first_seen_at", weekAgo),
      context.supabase
        .from("jobs")
        .select("last_verified_at, provider")
        .eq("is_active", true)
        .order("last_verified_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      getCareerBrainSnapshot(),
      context.supabase
        .from("job_matches")
        .select("overall_score")
        .eq("user_id", context.userId)
        .gte("overall_score", 75)
        .limit(500),
    ]);

    const brain = brainRaw as CareerBrainSnapshot;
    const { buildProfileFromSnapshot } = await import("./jobs/role-synonyms");
    const profile = brain.ready ? buildProfileFromSnapshot(brain) : null;
    const domains = (profile?.families ?? []).map((f: any) => f.label).slice(0, 4);

    // job_sources is admin-only, so derive live source coverage from the
    // catalog itself: distinct providers seen in the last 7 days.
    const { data: recentProviders } = await context.supabase
      .from("jobs")
      .select("provider")
      .eq("is_active", true)
      .gte("last_verified_at", weekAgo)
      .limit(1000);
    const providerCount = new Set(
      (recentProviders ?? []).map((r: any) => String(r.provider ?? "")).filter(Boolean),
    ).size;


    const strongMatches = (matchAgg.data ?? []).length;
    const insight = !brain.ready
      ? "Upload and approve a resume to activate live matching."
      : strongMatches > 0
        ? `We're tracking ${strongMatches} strong match${strongMatches === 1 ? "" : "es"}${domains.length ? ` across your ${domains.slice(0, 2).join(" and ")} experience` : ""}.`
        : `Scanning ${totalActive.count ?? 0} live roles${domains.length ? ` for ${domains[0]} opportunities` : ""}.`;

    return {
      ready: Boolean(brain.ready),
      totalActive: totalActive.count ?? 0,
      newToday: newToday.count ?? 0,
      newThisWeek: newThisWeek.count ?? 0,
      strongMatches,
      lastVerifiedAt: (latest.data as any)?.last_verified_at ?? null,
      activeSources: providerCount,
      domains,
      insight,
      displayName:
        (brain.identity?.fullName ?? "").split(/\s+/)[0] || "there",
    };
  });
