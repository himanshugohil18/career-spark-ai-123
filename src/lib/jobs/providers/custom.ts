/**
 * Custom company page provider. Fetches HTML from configured URLs and extracts
 * job cards. New companies are added by inserting rows into `job_sources.config.pages`
 * — no code changes required.
 *
 * Real HTML scraping of every possible careers page is out of scope; this stub
 * accepts JSON feed URLs (schema.org JobPosting or a documented feed) as a
 * uniform pluggable surface.
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

type SchemaJob = {
  "@type"?: string;
  title?: string;
  description?: string;
  datePosted?: string;
  validThrough?: string;
  employmentType?: string;
  hiringOrganization?: { name?: string; sameAs?: string; logo?: string };
  jobLocation?: { address?: { addressLocality?: string; addressCountry?: string } };
  applicantLocationRequirements?: unknown;
  jobLocationType?: string;
  baseSalary?: { value?: { minValue?: number; maxValue?: number; unitText?: string }; currency?: string };
  identifier?: { value?: string } | string;
  url?: string;
};

export const customProvider: JobProvider = {
  id: "custom",
  displayName: "Custom Company Pages",
  async fetch(config: ProviderConfig) {
    const pages = config.pages ?? [];
    const out: NormalizedJob[] = [];
    for (const page of pages) {
      try {
        const res = await fetch(page.url, { headers: { Accept: "application/json" } });
        if (!res.ok) continue;
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("json")) continue;
        const data = (await res.json()) as SchemaJob | SchemaJob[];
        const jobs = Array.isArray(data) ? data : [data];
        for (const j of jobs) {
          if (!j.title) continue;
          out.push(mapJob(page.company, j));
        }
      } catch {
        // skip
      }
    }
    return out;
  },
};

function mapJob(company: string, j: SchemaJob): NormalizedJob {
  const html = j.description ?? "";
  const description = sanitizeDescription(html);
  const plain = stripHtml(html);
  const location = j.jobLocation?.address?.addressLocality ?? null;
  const min = j.baseSalary?.value?.minValue ?? null;
  const max = j.baseSalary?.value?.maxValue ?? null;
  const salary = min || max ? { min, max, currency: j.baseSalary?.currency ?? null } : parseSalary(plain);
  const skills = extractSkills(plain);
  const bullets = splitBullets(html);
  const id = typeof j.identifier === "string" ? j.identifier : j.identifier?.value ?? crypto.randomUUID();
  return {
    title: j.title!,
    company: {
      name: j.hiringOrganization?.name ?? company,
      slug: slugify(j.hiringOrganization?.name ?? company),
      domain: null,
      logoUrl: j.hiringOrganization?.logo ?? null,
      website: j.hiringOrganization?.sameAs ?? null,
      industry: null,
      size: null,
      remotePolicy: null,
      techStack: skills.slice(0, 12),
      description: null,
    },
    location,
    locationCountry: j.jobLocation?.address?.addressCountry ?? detectCountry(location),
    remoteStatus:
      j.jobLocationType?.toLowerCase().includes("telecommute")
        ? "remote"
        : detectRemoteStatus({ location, description: plain }),
    employmentType: normalizeEmployment(j.employmentType),
    experienceLevel: detectExperience(j.title!, plain),
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.currency,
    description,
    responsibilities: bullets.slice(0, 8),
    requirements: bullets.slice(8, 18),
    requiredSkills: skills,
    preferredSkills: [],
    benefits: [],
    applicationUrl: j.url ?? "",
    provider: "custom",
    sourceId: id,
    postedAt: j.datePosted ?? null,
    expiresAt: j.validThrough ?? null,
    rawPayload: j,
  };
}
