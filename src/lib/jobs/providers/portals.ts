/**
 * Public job-portal API adapters (query-first, no API key required).
 *
 * These portals expose JSON/RSS search endpoints, so they respond to the
 * CandidateProfile's generated role queries and locations directly. They are
 * the main volume source for the shared job pool alongside the ATS providers.
 */

import { slugify } from "../fingerprint";
import {
  detectCountry,
  detectExperience,
  detectRemoteStatus,
  extractSkills,
  normalizeEmployment,
  parseSalary,
  sanitizeDescription,
  stripHtml,
} from "../normalize";
import type { NormalizedJob } from "../types";
import type { JobProvider, ProviderFetchOptions } from "./base";
import { expandSearchLocations } from "./locations";

const UA = "Mozilla/5.0 (compatible; CareerOS/1.0; +https://careerosai.site)";

type PortalJob = {
  title: string;
  company: string;
  location?: string | null;
  url: string;
  description?: string | null;
  postedAt?: string | null;
  sourceId: string;
  remote?: boolean;
  employmentType?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  raw?: unknown;
};

export function toNormalized(provider: string, j: PortalJob): NormalizedJob {
  const html = j.description ?? "";
  const plain = stripHtml(html);
  const skills = extractSkills(`${j.title} ${plain}`);
  const salary = parseSalary(plain);
  return {
    title: j.title,
    company: {
      name: j.company,
      slug: slugify(j.company),
      domain: null,
      logoUrl: null,
      website: null,
      industry: null,
      size: null,
      remotePolicy: j.remote ? "remote" : null,
      techStack: skills.slice(0, 12),
      description: null,
    },
    location: j.location || null,
    locationCountry: detectCountry(j.location),
    remoteStatus: j.remote
      ? "remote"
      : detectRemoteStatus({ location: j.location, description: plain }),
    employmentType: normalizeEmployment(j.employmentType ?? plain),
    experienceLevel: detectExperience(j.title, plain),
    salaryMin: j.salaryMin ?? salary.min,
    salaryMax: j.salaryMax ?? salary.max,
    salaryCurrency: j.salaryCurrency ?? salary.currency,
    description: sanitizeDescription(html || j.title),
    responsibilities: [],
    requirements: [],
    requiredSkills: skills,
    preferredSkills: [],
    benefits: [],
    applicationUrl: j.url,
    provider,
    sourceId: slugify(j.sourceId).slice(0, 160),
    postedAt: j.postedAt ?? null,
    expiresAt: null,
    rawPayload: j.raw ?? null,
  };
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function getText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/xml,text/xml,*/*" } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function queriesOf(opts?: ProviderFetchOptions): string[] {
  const q = opts?.queries?.filter(Boolean) ?? [];
  return (q.length ? q : ["software engineer"]).slice(0, 16);
}

function createPortal(
  id: string,
  displayName: string,
  run: (query: string, locations: string[]) => Promise<NormalizedJob[]>,
): JobProvider {
  return {
    id,
    displayName,
    async fetch(_config, opts) {
      const locations = expandSearchLocations(opts?.locations, 10);
      const out: NormalizedJob[] = [];
      const seen = new Set<string>();
      for (const query of queriesOf(opts)) {
        const jobs = await run(query, locations);
        for (const job of jobs) {
          const key = job.applicationUrl || `${job.provider}:${job.sourceId}`;
          if (!key || seen.has(key)) continue;
          seen.add(key);
          out.push(job);
          if (opts?.limit && out.length >= opts.limit * 4) return out;
        }
      }
      return out;
    },
  };
}

/* ---------------------------------------------------------------- Remotive */

export const remotiveProvider = createPortal("remotive", "Remotive", async (query) => {
  const data = await getJson<{ jobs?: Array<Record<string, unknown>> }>(
    `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=50`,
  );
  return (data?.jobs ?? []).map((j) =>
    toNormalized("remotive", {
      title: String(j.title ?? ""),
      company: String(j.company_name ?? "Remotive"),
      location: (j.candidate_required_location as string) ?? "Remote",
      url: String(j.url ?? ""),
      description: (j.description as string) ?? null,
      postedAt: (j.publication_date as string) ?? null,
      sourceId: String(j.id ?? j.url ?? ""),
      remote: true,
      employmentType: (j.job_type as string) ?? null,
    }),
  ).filter((j) => j.title && j.applicationUrl);
});

/* -------------------------------------------------------------- Arbeitnow */

export const arbeitnowProvider = createPortal("arbeitnow", "Arbeitnow", async (query) => {
  const data = await getJson<{ data?: Array<Record<string, unknown>> }>(
    "https://www.arbeitnow.com/api/job-board-api",
  );
  const q = query.toLowerCase();
  return (data?.data ?? [])
    .filter((j) => String(j.title ?? "").toLowerCase().includes(q.split(" ")[0] ?? ""))
    .map((j) =>
      toNormalized("arbeitnow", {
        title: String(j.title ?? ""),
        company: String(j.company_name ?? "Arbeitnow"),
        location: (j.location as string) ?? null,
        url: String(j.url ?? ""),
        description: (j.description as string) ?? null,
        postedAt: j.created_at ? new Date(Number(j.created_at) * 1000).toISOString() : null,
        sourceId: String(j.slug ?? j.url ?? ""),
        remote: Boolean(j.remote),
        employmentType: Array.isArray(j.job_types) ? String(j.job_types[0] ?? "") : null,
      }),
    )
    .filter((j) => j.title && j.applicationUrl);
});

/* ----------------------------------------------------------------- Jobicy */

export const jobicyProvider = createPortal("jobicy", "Jobicy", async (query) => {
  const data = await getJson<{ jobs?: Array<Record<string, unknown>> }>(
    `https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(query)}`,
  );
  return (data?.jobs ?? []).map((j) =>
    toNormalized("jobicy", {
      title: String(j.jobTitle ?? ""),
      company: String(j.companyName ?? "Jobicy"),
      location: (j.jobGeo as string) ?? "Remote",
      url: String(j.url ?? ""),
      description: (j.jobExcerpt as string) ?? (j.jobDescription as string) ?? null,
      postedAt: (j.pubDate as string) ?? null,
      sourceId: String(j.id ?? j.url ?? ""),
      remote: true,
      employmentType: Array.isArray(j.jobType) ? String(j.jobType[0] ?? "") : null,
      salaryMin: (j.annualSalaryMin as number) ?? null,
      salaryMax: (j.annualSalaryMax as number) ?? null,
      salaryCurrency: (j.salaryCurrency as string) ?? null,
    }),
  ).filter((j) => j.title && j.applicationUrl);
});

/* -------------------------------------------------------------- Himalayas */

export const himalayasProvider = createPortal("himalayas", "Himalayas", async (query) => {
  const data = await getJson<{ jobs?: Array<Record<string, unknown>> }>(
    `https://himalayas.app/jobs/api?limit=100&title=${encodeURIComponent(query)}`,
  );
  let rows = data?.jobs ?? [];
  if (rows.length < 5) {
    const broad = await getJson<{ jobs?: Array<Record<string, unknown>> }>(
      "https://himalayas.app/jobs/api?limit=100",
    );
    const token = query.toLowerCase().split(" ")[0] ?? "";
    rows = (broad?.jobs ?? []).filter((j) => String(j.title ?? "").toLowerCase().includes(token));
  }
  return rows.map((j) =>
    toNormalized("himalayas", {
      title: String(j.title ?? ""),
      company: String(j.companyName ?? "Himalayas"),
      location: Array.isArray(j.locationRestrictions) ? j.locationRestrictions.join(", ") : "Remote",
      url: String(j.applicationLink ?? j.guid ?? ""),
      description: (j.description as string) ?? null,
      postedAt: j.pubDate ? new Date(Number(j.pubDate) * 1000).toISOString() : null,
      sourceId: String(j.guid ?? j.applicationLink ?? ""),
      remote: true,
      salaryMin: (j.minSalary as number) ?? null,
      salaryMax: (j.maxSalary as number) ?? null,
      salaryCurrency: "USD",
    }),
  ).filter((j) => j.title && j.applicationUrl);
});

/* -------------------------------------------------------- We Work Remotely */

export const weworkremotelyProvider = createPortal("weworkremotely", "We Work Remotely", async (query) => {
  // WWR blocks its search RSS endpoint (HTTP 406) for non-browser clients, so
  // read the documented full feed once and filter locally by the query token.
  const xml = await getText("https://weworkremotely.com/remote-jobs.rss");
  if (!xml) return [];
  const token = (query.toLowerCase().split(" ")[0] ?? "").trim();
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  return items
    .map((item) => {
      const pick = (rx: RegExp) => rx.exec(item)?.[1]?.trim() ?? "";
      const rawTitle = decode(pick(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i));
      const link = pick(/<link>([\s\S]*?)<\/link>/i);
      if (!rawTitle || !link) return null;
      const [companyPart, ...titleParts] = rawTitle.split(":");
      const title = (titleParts.join(":").trim() || rawTitle).trim();
      return toNormalized("weworkremotely", {
        title,
        company: titleParts.length ? companyPart.trim() : "We Work Remotely",
        location: pick(/<region>([\s\S]*?)<\/region>/i) || "Remote",
        url: link,
        description: decode(pick(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)),
        postedAt: pick(/<pubDate>([\s\S]*?)<\/pubDate>/i) || null,
        sourceId: link,
        remote: true,
      });
    })
    .filter((j): j is NormalizedJob => !!j);
});

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
