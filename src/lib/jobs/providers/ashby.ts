/**
 * Ashby public jobs — https://api.ashbyhq.com/posting-api/job-board/{org}?includeCompensation=true
 * `config.companies`: array of Ashby org slugs.
 */

import { slugify } from "../fingerprint";
import { companyDisplayName, companyDomain, companyLogoUrl, companyWebsite } from "./company-names";
import {
  detectCountry,
  detectExperience,
  detectRemoteStatus,
  extractSkills,
  normalizeEmployment,
  parseSalary,
  sanitizeDescription,
  splitBullets,
  stripHtml,
} from "../normalize";
import type { NormalizedJob } from "../types";
import type { JobProvider, ProviderConfig } from "./base";
import { ASHBY_COMPANIES, mergeBoards } from "./ats-companies";

type AshbyJob = {
  id: string;
  title: string;
  location?: string;
  employmentType?: string;
  workplaceType?: string;
  jobUrl: string;
  descriptionHtml?: string;
  publishedAt?: string;
  isRemote?: boolean;
  compensationTierSummary?: string;
};

export const ashbyProvider: JobProvider = {
  id: "ashby",
  displayName: "Ashby",
  async fetch(config: ProviderConfig) {
    const companies = mergeBoards(config.companies, ASHBY_COMPANIES);
    return inBatches(companies, 8, async (company) => {
      const out: NormalizedJob[] = [];
      try {
        const res = await fetch(
          `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(company)}?includeCompensation=true`,
        );
        if (!res.ok) return out;
        const data = (await res.json()) as { jobs?: AshbyJob[] };
        for (const j of data.jobs ?? []) out.push(mapJob(company, j));
      } catch {
        // skip
      }
      return out;
    });
  },
};

/** Fetch board slugs with bounded concurrency so large registries stay inside
 * the Worker request budget. */
async function inBatches<T>(items: string[], size: number, fn: (slug: string) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < items.length; i += size) {
    const results = await Promise.allSettled(items.slice(i, i + size).map(fn));
    for (const r of results) if (r.status === "fulfilled") out.push(...r.value);
  }
  return out;
}


function mapJob(company: string, j: AshbyJob): NormalizedJob {
  const description = sanitizeDescription(j.descriptionHtml ?? "");
  const plain = stripHtml(j.descriptionHtml ?? "");
  const salary = parseSalary(j.compensationTierSummary ?? plain);
  const skills = extractSkills(plain);
  const bullets = splitBullets(j.descriptionHtml ?? "");
  return {
    title: j.title,
    company: {
      name: companyDisplayName(company),
      slug: slugify(company),
      domain: companyDomain(company), logoUrl: companyLogoUrl(company),
      website: companyWebsite(company) ?? `https://jobs.ashbyhq.com/${company}`,
      industry: null, size: null, remotePolicy: null,
      techStack: skills.slice(0, 12),
      description: null,
    },
    location: j.location ?? null,
    locationCountry: detectCountry(j.location),
    remoteStatus: j.isRemote
      ? "remote"
      : detectRemoteStatus({ location: j.location, workplaceType: j.workplaceType, description: plain }),
    employmentType: normalizeEmployment(j.employmentType),
    experienceLevel: detectExperience(j.title, plain),
    salaryMin: salary.min, salaryMax: salary.max, salaryCurrency: salary.currency,
    description,
    responsibilities: bullets.slice(0, 8),
    requirements: bullets.slice(8, 18),
    requiredSkills: skills,
    preferredSkills: [],
    benefits: [],
    applicationUrl: j.jobUrl,
    provider: "ashby",
    sourceId: j.id,
    postedAt: j.publishedAt ?? null,
    expiresAt: null,
    rawPayload: j,
  };
}
