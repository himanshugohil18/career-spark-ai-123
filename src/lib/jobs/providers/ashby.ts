/**
 * Ashby public jobs — https://api.ashbyhq.com/posting-api/job-board/{org}?includeCompensation=true
 * `config.companies`: array of Ashby org slugs.
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
    const out: NormalizedJob[] = [];
    for (const company of companies) {
      try {
        const res = await fetch(
          `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(company)}?includeCompensation=true`,
        );
        if (!res.ok) continue;
        const data = (await res.json()) as { jobs?: AshbyJob[] };
        for (const j of data.jobs ?? []) out.push(mapJob(company, j));
      } catch {
        // skip
      }
    }
    return out;
  },
};

function mapJob(company: string, j: AshbyJob): NormalizedJob {
  const description = sanitizeDescription(j.descriptionHtml ?? "");
  const plain = stripHtml(j.descriptionHtml ?? "");
  const salary = parseSalary(j.compensationTierSummary ?? plain);
  const skills = extractSkills(plain);
  const bullets = splitBullets(j.descriptionHtml ?? "");
  return {
    title: j.title,
    company: {
      name: company.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      slug: slugify(company),
      domain: null, logoUrl: null,
      website: `https://jobs.ashbyhq.com/${company}`,
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
