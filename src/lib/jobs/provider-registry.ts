/**
 * Provider reliability registry — the single source of truth for HOW a job
 * reached CareerOS and how much we trust it.
 *
 * Tier 1  Official company ATS boards / documented company career APIs.
 *         Stable, permitted, canonical application URLs. Production core.
 * Tier 2  Documented public job APIs and RSS feeds from aggregators that
 *         publish real source metadata and original application links.
 * Tier 3  Experimental: unofficial endpoints or public search-page parsing.
 *         Never a production dependency, always demoted in ranking, and never
 *         presented to users as an official integration with that platform.
 *
 * This module is isomorphic (no server imports) so the UI, ranking layer and
 * discovery orchestrator all label providers identically.
 */

export type ProviderTier = 1 | 2 | 3;

export type ProviderSourceType =
  | "company_ats" // Greenhouse / Lever / Ashby / Workable hosted board
  | "company_careers" // Company's own careers page, configured explicitly
  | "official_api" // Documented public JSON API from the platform itself
  | "public_feed" // Documented public RSS/Atom feed
  | "unofficial_endpoint" // Undocumented JSON endpoint, may break without notice
  | "search_page_parse"; // Public search-results page parsing

export type ProviderMeta = {
  id: string;
  /** Internal, factual name. */
  name: string;
  tier: ProviderTier;
  sourceType: ProviderSourceType;
  /** What the UI is allowed to show as the job's source. Never a brand claim. */
  uiLabel: string;
  /** One-line honest description of the integration, shown in admin. */
  integrationNote: string;
};

const META: ProviderMeta[] = [
  // ---------- Tier 1: official ATS + company career feeds ----------
  {
    id: "greenhouse",
    name: "Greenhouse",
    tier: 1,
    sourceType: "company_ats",
    uiLabel: "Greenhouse",
    integrationNote: "Official Greenhouse public job board API (boards-api.greenhouse.io) per company board.",
  },
  {
    id: "lever",
    name: "Lever",
    tier: 1,
    sourceType: "company_ats",
    uiLabel: "Lever",
    integrationNote: "Official Lever public postings API (api.lever.co/v0/postings) per company.",
  },
  {
    id: "ashby",
    name: "Ashby",
    tier: 1,
    sourceType: "company_ats",
    uiLabel: "Ashby",
    integrationNote: "Official Ashby public posting API (api.ashbyhq.com/posting-api) per organisation.",
  },
  {
    id: "workable",
    name: "Workable",
    tier: 1,
    sourceType: "company_ats",
    uiLabel: "Workable",
    integrationNote: "Official Workable API. Inactive until per-account API tokens are provisioned.",
  },
  {
    id: "ycombinator",
    name: "Y Combinator",
    tier: 1,
    sourceType: "official_api",
    uiLabel: "Company Careers",
    integrationNote: "Y Combinator Work at a Startup public listings; links resolve to the company's own posting.",
  },
  {
    id: "custom",
    name: "Company Careers",
    tier: 1,
    sourceType: "company_careers",
    uiLabel: "Company Careers",
    integrationNote: "Explicitly configured company career feeds.",
  },

  // ---------- Tier 2: documented public APIs / feeds ----------
  {
    id: "remoteok",
    name: "RemoteOK",
    tier: 2,
    sourceType: "official_api",
    uiLabel: "Job API · RemoteOK",
    integrationNote: "Public RemoteOK JSON API; application URLs point to the original employer posting.",
  },
  {
    id: "remotive",
    name: "Remotive",
    tier: 2,
    sourceType: "official_api",
    uiLabel: "Job API · Remotive",
    integrationNote: "Documented Remotive public API (/api/remote-jobs).",
  },
  {
    id: "arbeitnow",
    name: "Arbeitnow",
    tier: 2,
    sourceType: "official_api",
    uiLabel: "Job API · Arbeitnow",
    integrationNote: "Documented Arbeitnow job board API.",
  },
  {
    id: "jobicy",
    name: "Jobicy",
    tier: 2,
    sourceType: "official_api",
    uiLabel: "Job API · Jobicy",
    integrationNote: "Documented Jobicy v2 public API.",
  },
  {
    id: "himalayas",
    name: "Himalayas",
    tier: 2,
    sourceType: "official_api",
    uiLabel: "Job API · Himalayas",
    integrationNote: "Public Himalayas jobs API.",
  },
  {
    id: "weworkremotely",
    name: "We Work Remotely",
    tier: 2,
    sourceType: "public_feed",
    uiLabel: "Job Feed · We Work Remotely",
    integrationNote:
      "Public WWR full-catalog RSS feed (remote-jobs.rss), filtered locally. The search RSS endpoint rejects non-browser clients.",
  },
  {
    id: "workingnomads",
    name: "Working Nomads",
    tier: 2,
    sourceType: "official_api",
    uiLabel: "Job API · Working Nomads",
    integrationNote: "Documented Working Nomads public jobs API (/api/exposed_jobs/).",
  },
  {
    id: "indeed",
    name: "Indeed",
    tier: 2,
    sourceType: "public_feed",
    uiLabel: "Job Feed · Indeed",
    integrationNote: "Public Indeed RSS endpoint. Not the paid Indeed Publisher API.",
  },

  // ---------- Tier 3: experimental / unofficial ----------
  {
    id: "linkedin",
    name: "LinkedIn (unofficial public search)",
    tier: 3,
    sourceType: "unofficial_endpoint",
    uiLabel: "Aggregated listing (experimental)",
    integrationNote:
      "NOT an official LinkedIn API or partner integration. Reads the public guest jobs search endpoint, which is undocumented and may change or block at any time. Never present this as a LinkedIn integration.",
  },
  {
    id: "naukri",
    name: "Naukri (unofficial public search)",
    tier: 3,
    sourceType: "search_page_parse",
    uiLabel: "Aggregated listing (experimental)",
    integrationNote:
      "NOT an official Naukri API or partner integration. Parses the public search page, which is anti-bot protected and currently returns zero usable results. Disabled.",
  },
  ...(
    [
      ["instahyre", "Instahyre"],
      ["hirist", "Hirist"],
      ["cutshort", "Cutshort"],
      ["wellfound", "Wellfound"],
      ["foundit", "Foundit (Monster)"],
      ["shine", "Shine"],
      ["timesjobs", "TimesJobs"],
      ["simplyhired", "SimplyHired"],
      ["glassdoor", "Glassdoor"],
      ["internshala", "Internshala"],
      ["talent", "Talent.com"],
      ["ziprecruiter", "ZipRecruiter"],
      ["dice", "Dice"],
      ["builtin", "Built In"],
      ["remoteco", "Remote.co"],
      ["remoteleads", "RemoteLeads"],
      ["levelsfyi", "Levels.fyi"],
      ["flexjobs", "FlexJobs"],
      ["upwork", "Upwork"],
    ] as const
  ).map(([id, name]) => ({
    id,
    name: `${name} (public search parse)`,
    tier: 3 as ProviderTier,
    sourceType: "search_page_parse" as ProviderSourceType,
    uiLabel: "Aggregated listing (experimental)",
    integrationNote: `Public search-page parsing for ${name}. No official API or partnership; treated as experimental and demoted in ranking.`,
  })),
];

const BY_ID = new Map(META.map((m) => [m.id, m] as const));

const FALLBACK: ProviderMeta = {
  id: "unknown",
  name: "Unknown source",
  tier: 3,
  sourceType: "search_page_parse",
  uiLabel: "Aggregated listing (experimental)",
  integrationNote: "Unregistered provider; treated as experimental until classified.",
};

export function providerMeta(id: string | null | undefined): ProviderMeta {
  if (!id) return FALLBACK;
  return BY_ID.get(id) ?? { ...FALLBACK, id };
}

export function providerTier(id: string | null | undefined): ProviderTier {
  return providerMeta(id).tier;
}

/** Truthful source label for job cards and detail pages. */
export function providerSourceLabel(id: string | null | undefined): string {
  return providerMeta(id).uiLabel;
}

/**
 * Ranking weight by trust tier. Never large enough to outrank relevance, but
 * a Tier 1 company-ATS listing always beats a comparable experimental one.
 */
export function providerTrustBoost(id: string | null | undefined): number {
  switch (providerTier(id)) {
    case 1:
      return 14;
    case 2:
      return 5;
    default:
      return -12;
  }
}

export function providersByTier(tier: ProviderTier): ProviderMeta[] {
  return META.filter((m) => m.tier === tier);
}

export function allProviderMeta(): ProviderMeta[] {
  return [...META];
}

export const TIER_LABELS: Record<ProviderTier, string> = {
  1: "Tier 1 · Official company ATS",
  2: "Tier 2 · Documented public API",
  3: "Tier 3 · Experimental",
};

/** Health lifecycle used by the discovery orchestrator + admin surfaces. */
export type ProviderHealth = "healthy" | "degraded" | "unhealthy" | "unknown";

/** Consecutive failures after which a provider is auto-disabled. */
export const AUTO_DISABLE_AFTER_FAILURES = 6;
/** Consecutive failures after which a provider is flagged degraded. */
export const DEGRADED_AFTER_FAILURES = 2;

export function healthFromFailures(consecutiveFailures: number, everSucceeded: boolean): ProviderHealth {
  if (!everSucceeded && consecutiveFailures === 0) return "unknown";
  if (consecutiveFailures >= AUTO_DISABLE_AFTER_FAILURES) return "unhealthy";
  if (consecutiveFailures >= DEGRADED_AFTER_FAILURES) return "degraded";
  return "healthy";
}
