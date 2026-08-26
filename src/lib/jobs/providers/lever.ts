/**
 * Lever public postings — https://api.lever.co/v0/postings/{company}?mode=json
 * `config.companies`: array of Lever company slugs.
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
import { LEVER_COMPANIES, mergeBoards } from "./ats-companies";

type LeverJob = {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  createdAt?: number;
  categories?: { commitment?: string; location?: string; team?: string; department?: string };
  descriptionPlain?: string;
  description?: string;
  lists?: Array<{ text?: string; content?: string }>;
  workplaceType?: string;
};

export const leverProvider: JobProvider = {
  id: "lever",
  displayName: "Lever",
  async fetch(config: ProviderConfig) {
    const companies = mergeBoards(config.companies, LEVER_COMPANIES);
    return inBatches(companies, 8, async (company) => {
      const out: NormalizedJob[] = [];
      try {
        const res = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`);
        if (!res.ok) return out;
        const data = (await res.json()) as LeverJob[];
        for (const j of data) out.push(mapJob(company, j));
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


function mapJob(company: string, j: LeverJob): NormalizedJob {
  const html = j.description ?? "";
  const description = sanitizeDescription(html);
  const plain = j.descriptionPlain ?? stripHtml(html);
  const location = j.categories?.location ?? null;
  const salary = parseSalary(plain);
  const skills = extractSkills(plain);
  const bullets = (j.lists ?? []).flatMap((l) => splitBullets(l.content ?? l.text ?? ""));
  return {
    title: j.text,
    company: {
      name: companyDisplayName(company),
      slug: slugify(company),
      domain: companyDomain(company),
      logoUrl: companyLogoUrl(company),
      website: companyWebsite(company) ?? `https://jobs.lever.co/${company}`,
      industry: null,
      size: null,
      remotePolicy: null,
      techStack: skills.slice(0, 12),
      description: null,
    },
    location,
    locationCountry: detectCountry(location),
    remoteStatus: detectRemoteStatus({ location, description: plain, workplaceType: j.workplaceType }),
    employmentType: normalizeEmployment(j.categories?.commitment),
    experienceLevel: detectExperience(j.text, plain),
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.currency,
    description,
    responsibilities: bullets.slice(0, 8),
    requirements: bullets.slice(8, 18),
    requiredSkills: skills,
    preferredSkills: [],
    benefits: [],
    applicationUrl: j.applyUrl ?? j.hostedUrl,
    provider: "lever",
    sourceId: j.id,
    postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
    expiresAt: null,
    rawPayload: j,
  };
}
