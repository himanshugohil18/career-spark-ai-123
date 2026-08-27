/**
 * Workable public job search (jobs.workable.com/api/v1/jobs).
 *
 * Workable hosts tens of thousands of employer boards and exposes a public,
 * keyless search endpoint that accepts a free-text query plus a location
 * string and returns the employer's canonical `jobs.workable.com/view/...`
 * application URL. That makes it the highest-volume India source available to
 * CareerOS without a paid aggregator key.
 *
 * India-first: search locations are expanded India-metros-first (see
 * `locations.ts`), and every (query × location) pair is paged so India supply
 * lands with the same depth as the US-heavy ATS feeds.
 */

import { slugify } from "../fingerprint";
import {
  detectCountry,
  detectExperience,
  extractSkills,
  normalizeEmployment,
  parseSalary,
  sanitizeDescription,
  stripHtml,
} from "../normalize";
import type { NormalizedJob } from "../types";
import type { JobProvider, ProviderFetchOptions } from "./base";
import { expandSearchLocations } from "./locations";

const API = "https://jobs.workable.com/api/v1/jobs";
const UA = "Mozilla/5.0 (compatible; CareerOS/1.0; +https://careerosai.site)";
const PAGES_PER_SEARCH = 4;

/**
 * Global crawls (cron, no candidate profile) still need breadth, so a default
 * query set covers the roles that dominate India's tech hiring market.
 */
const DEFAULT_QUERIES = [
  "software engineer",
  "software developer fresher",
  "full stack developer",
  "react developer",
  "java developer",
  "python developer",
  "data analyst",
  "devops engineer",
  "qa engineer",
  "machine learning engineer",
];

type WorkableJob = {
  id?: string;
  title?: string;
  url?: string;
  description?: string;
  requirementsSection?: string;
  benefitsSection?: string;
  employmentType?: string;
  workplace?: string;
  created?: string;
  locations?: string[];
  location?: { city?: string; subregion?: string; countryName?: string };
  company?: { title?: string; website?: string; image?: string; description?: string };
};

type WorkableResponse = { jobs?: WorkableJob[]; nextPageToken?: string };

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Workable throttles bursts, so every request is paced and throttled responses
 * are retried with backoff instead of being treated as "no results".
 */
async function search(query: string, location: string, pageToken?: string): Promise<WorkableResponse | null> {
  const params = new URLSearchParams({ query, location });
  if (pageToken) params.set("pageToken", pageToken);
  try {
    let res: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(`${API}?${params.toString()}`, {
        headers: {
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent": UA,
          Referer: "https://jobs.workable.com/",
        },
      });
      if (res.status !== 429 && res.status !== 403 && res.status < 500) break;
      await sleep(1500 * (attempt + 1));
    }
    if (!res || !res.ok) return null;
    await sleep(250);
    return (await res.json()) as WorkableResponse;
  } catch {
    return null;
  }
}

function locationLabel(j: WorkableJob): string | null {
  const parts = [j.location?.city, j.location?.subregion, j.location?.countryName].filter(Boolean);
  if (parts.length) return parts.join(", ");
  const first = (j.locations ?? []).find((l) => l && l.toUpperCase() !== "TELECOMMUTE");
  return first ?? (j.locations?.length ? "Remote" : null);
}

function toNormalized(j: WorkableJob): NormalizedJob | null {
  const title = (j.title ?? "").trim();
  const url = (j.url ?? "").trim();
  const companyName = (j.company?.title ?? "").trim();
  if (!title || !url || !companyName) return null;

  const html = [j.description ?? "", j.requirementsSection ?? "", j.benefitsSection ?? ""]
    .filter(Boolean)
    .join("\n");
  const plain = stripHtml(html);
  const skills = extractSkills(`${title} ${plain}`);
  const salary = parseSalary(plain);
  const location = locationLabel(j);
  const isRemote =
    j.workplace === "remote" || (j.locations ?? []).some((l) => l?.toUpperCase() === "TELECOMMUTE");

  return {
    title,
    company: {
      name: companyName,
      slug: slugify(companyName),
      domain: j.company?.website ? j.company.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : null,
      logoUrl: j.company?.image ?? null,
      website: j.company?.website ?? null,
      industry: null,
      size: null,
      remotePolicy: isRemote ? "remote" : null,
      techStack: skills.slice(0, 12),
      description: j.company?.description ? stripHtml(j.company.description).slice(0, 1200) : null,
    },
    location,
    locationCountry: j.location?.countryName ?? detectCountry(location),
    remoteStatus: isRemote ? "remote" : j.workplace === "hybrid" ? "hybrid" : "onsite",
    employmentType: normalizeEmployment(j.employmentType || plain),
    experienceLevel: detectExperience(title, plain),
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.currency,
    description: sanitizeDescription(html || title),
    responsibilities: [],
    requirements: [],
    requiredSkills: skills,
    preferredSkills: [],
    benefits: [],
    applicationUrl: url,
    provider: "workable",
    sourceId: slugify(j.id ?? url).slice(0, 160),
    postedAt: j.created ?? null,
    expiresAt: null,
    rawPayload: null,
  };
}

export const workableProvider: JobProvider = {
  id: "workable",
  displayName: "Workable",
  async fetch(_config, opts?: ProviderFetchOptions) {
    const queries = (opts?.queries?.length ? opts.queries : DEFAULT_QUERIES).slice(0, 12);
    // India metros first, then remote + global markets.
    const locations = expandSearchLocations(opts?.locations, 10);
    const cap = (opts?.limit ?? 260) * 8;

    const out: NormalizedJob[] = [];
    const seen = new Set<string>();

    for (const location of locations) {
      for (const query of queries) {
        let token: string | undefined;
        for (let page = 0; page < PAGES_PER_SEARCH; page++) {
          const res = await search(query, location, token);
          if (!res?.jobs?.length) break;
          for (const raw of res.jobs) {
            const job = toNormalized(raw);
            if (!job) continue;
            const key = job.applicationUrl;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(job);
            if (out.length >= cap) return out;
          }
          token = res.nextPageToken;
          if (!token) break;
        }
      }
    }
    return out;
  },
};
