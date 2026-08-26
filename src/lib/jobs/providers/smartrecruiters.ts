/**
 * SmartRecruiters public postings API (tier 1, official ATS).
 *   https://api.smartrecruiters.com/v1/companies/{company}/postings
 *
 * India-first: every company is crawled with `country=in` FIRST (paged), then
 * a smaller global slice is taken. Large enterprise employers on
 * SmartRecruiters (Bosch, Nagarro, Continental, Sandisk, Sutherland …) publish
 * thousands of India roles including graduate / trainee / associate openings,
 * which is exactly the entry-level India supply CareerOS was missing.
 */

import { slugify } from "../fingerprint";
import {
  detectExperience,
  extractSkills,
  normalizeEmployment,
  sanitizeDescription,
} from "../normalize";
import type { NormalizedJob } from "../types";
import type { JobProvider, ProviderConfig } from "./base";
import { SMARTRECRUITERS_COMPANIES, mergeBoards } from "./ats-companies";

type SrPosting = {
  id: string;
  name: string;
  refNumber?: string;
  releasedDate?: string;
  company?: { identifier?: string; name?: string };
  location?: {
    city?: string;
    region?: string;
    country?: string;
    fullLocation?: string;
    remote?: boolean;
    hybrid?: boolean;
  };
  industry?: { label?: string };
  department?: { label?: string };
  function?: { label?: string };
  typeOfEmployment?: { label?: string };
  experienceLevel?: { id?: string; label?: string };
};

const API = "https://api.smartrecruiters.com/v1/companies";
const PAGE = 100;

/** SmartRecruiters experience ids → CareerOS experience levels. */
const LEVEL_MAP: Record<string, string> = {
  internship: "intern",
  student: "intern",
  entry_level: "entry",
  graduate: "entry",
  associate: "junior",
  mid_senior_level: "mid",
  professional: "mid",
  manager: "senior",
  director: "executive",
  executive: "executive",
};

async function getPostings(company: string, params: string): Promise<SrPosting[]> {
  try {
    const res = await fetch(`${API}/${encodeURIComponent(company)}/postings?${params}`, {
      headers: { Accept: "application/json", "User-Agent": "CareerOS/1.0 (+https://careerosai.site)" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { content?: SrPosting[] };
    return Array.isArray(data.content) ? data.content : [];
  } catch {
    return [];
  }
}

/** India pages first, then a global slice, per company. */
async function fetchCompany(company: string, indiaPages: number, globalPages: number): Promise<SrPosting[]> {
  const out: SrPosting[] = [];
  for (let page = 0; page < indiaPages; page++) {
    const rows = await getPostings(company, `limit=${PAGE}&offset=${page * PAGE}&country=in`);
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  for (let page = 0; page < globalPages; page++) {
    const rows = await getPostings(company, `limit=${PAGE}&offset=${page * PAGE}`);
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export const smartrecruitersProvider: JobProvider = {
  id: "smartrecruiters",
  displayName: "SmartRecruiters",
  async fetch(config: ProviderConfig) {
    const companies = mergeBoards(config.companies, SMARTRECRUITERS_COMPANIES);
    const out: NormalizedJob[] = [];
    const seen = new Set<string>();
    // Bounded concurrency keeps the crawl inside the Worker request budget.
    for (let i = 0; i < companies.length; i += 4) {
      const results = await Promise.allSettled(
        companies.slice(i, i + 4).map((c) => fetchCompany(c, 4, 1)),
      );
      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        for (const posting of r.value) {
          const job = mapPosting(posting);
          if (!job) continue;
          const key = `${job.provider}:${job.sourceId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(job);
        }
      }
    }
    return out;
  },
};

function mapPosting(p: SrPosting): NormalizedJob | null {
  const companyId = p.company?.identifier;
  const title = (p.name ?? "").trim();
  if (!p.id || !companyId || !title) return null;

  const loc = p.location ?? {};
  const city = (loc.city ?? "").trim();
  const region = (loc.region ?? "").trim();
  const countryCode = (loc.country ?? "").trim().toUpperCase();
  const locationLabel =
    [city ? titleCase(city) : "", region ? titleCase(region) : "", countryCode].filter(Boolean).join(", ") ||
    loc.fullLocation ||
    null;

  const remoteStatus = loc.remote ? "remote" : loc.hybrid ? "hybrid" : locationLabel ? "onsite" : "unknown";
  const context = [
    p.function?.label,
    p.department?.label,
    p.industry?.label,
    p.typeOfEmployment?.label,
    p.experienceLevel?.label,
  ]
    .filter(Boolean)
    .join(" · ");
  const summary = `${title}${context ? ` — ${context}` : ""}${locationLabel ? ` (${locationLabel})` : ""}. Apply on the company's official SmartRecruiters careers page for the full description.`;
  const skills = extractSkills(`${title} ${context}`);
  // The SmartRecruiters level field is coarse ("associate" is used for senior
  // consultants too), so an explicit seniority word in the title always wins.
  const titleSignal = /\b(senior|sr\.?|lead|principal|staff|architect|manager|head|director|vp|chief|intern|internship|trainee|fresher|graduate|entry[- ]level|junior|jr\.?)\b/i.test(
    title,
  );
  const mapped = titleSignal
    ? undefined
    : LEVEL_MAP[String(p.experienceLevel?.id ?? "").toLowerCase()];

  return {
    title,
    company: {
      name: p.company?.name ?? companyId,
      slug: slugify(p.company?.name ?? companyId),
      domain: null,
      logoUrl: null,
      website: `https://jobs.smartrecruiters.com/${companyId}`,
      industry: p.industry?.label ?? null,
      size: null,
      remotePolicy: loc.remote ? "remote" : null,
      techStack: skills.slice(0, 12),
      description: null,
    },
    location: locationLabel,
    locationCountry: countryCode || null,
    remoteStatus,
    employmentType: normalizeEmployment(p.typeOfEmployment?.label ?? null),
    experienceLevel: (mapped as NormalizedJob["experienceLevel"]) ?? detectExperience(title, null),
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    description: sanitizeDescription(summary),
    responsibilities: [],
    requirements: [],
    requiredSkills: skills,
    preferredSkills: [],
    benefits: [],
    applicationUrl: `https://jobs.smartrecruiters.com/${companyId}/${p.id}`,
    provider: "smartrecruiters",
    sourceId: String(p.id),
    postedAt: p.releasedDate ?? null,
    expiresAt: null,
    rawPayload: p,
  };
}

function titleCase(s: string): string {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}
