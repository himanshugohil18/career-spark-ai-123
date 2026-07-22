/**
 * RemoteOK public feed — https://remoteok.com/api
 * Global remote job board; no company configuration required.
 */

import { slugify } from "../fingerprint";
import {
  detectExperience,
  extractSkills,
  parseSalary,
  sanitizeDescription,
  splitBullets,
  stripHtml,
} from "../normalize";
import type { NormalizedJob } from "../types";
import type { JobProvider, ProviderFetchOptions } from "./base";

type RokJob = {
  id?: string | number;
  slug?: string;
  company?: string;
  company_logo?: string;
  position?: string;
  tags?: string[];
  location?: string;
  description?: string;
  url?: string;
  apply_url?: string;
  date?: string;
  salary_min?: number;
  salary_max?: number;
};

export const remoteokProvider: JobProvider = {
  id: "remoteok",
  displayName: "RemoteOK",
  async fetch(_config, opts?: ProviderFetchOptions) {
    const out: NormalizedJob[] = [];
    try {
      const res = await fetch("https://remoteok.com/api", {
        headers: { "User-Agent": "CareerOS/1.0 (+https://careeros.app)" },
      });
      if (!res.ok) return out;
      const data = (await res.json()) as (RokJob & { legal?: string })[];
      const queries = (opts?.queries ?? []).map((q) => q.toLowerCase()).slice(0, 12);
      for (const j of data) {
        if (!j.id || !j.position || !j.company) continue;
        if (queries.length && !matchesQuery(j, queries)) continue;
        out.push(mapJob(j));
        if (opts?.limit && out.length >= opts.limit) break;
      }
    } catch {
      // network error — return empty
    }
    return out;
  },
};

function matchesQuery(j: RokJob, queries: string[]): boolean {
  const hay = `${j.position ?? ""} ${(j.tags ?? []).join(" ")} ${stripHtml(j.description ?? "")}`.toLowerCase();
  return queries.some((q) => hay.includes(q) || q.split(/\s+/).filter((t) => t.length > 3).every((t) => hay.includes(t)));
}

function mapJob(j: RokJob): NormalizedJob {
  const description = sanitizeDescription(j.description ?? "");
  const plain = stripHtml(j.description ?? "");
  const salary = j.salary_min || j.salary_max
    ? { min: j.salary_min ?? null, max: j.salary_max ?? null, currency: "USD" as const }
    : parseSalary(plain);
  const skills = Array.from(new Set([...(j.tags ?? []).map((t) => t.toLowerCase()), ...extractSkills(plain)]));
  const bullets = splitBullets(j.description ?? "");
  return {
    title: j.position!,
    company: {
      name: j.company!,
      slug: slugify(j.company!),
      domain: null,
      logoUrl: j.company_logo ?? null,
      website: null,
      industry: null,
      size: null,
      remotePolicy: "Remote-first",
      techStack: skills.slice(0, 12),
      description: null,
    },
    location: j.location ?? "Remote",
    locationCountry: null,
    remoteStatus: "remote",
    employmentType: "unknown",
    experienceLevel: detectExperience(j.position!, plain),
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.currency,
    description,
    responsibilities: bullets.slice(0, 8),
    requirements: bullets.slice(8, 16),
    requiredSkills: skills,
    preferredSkills: [],
    benefits: [],
    applicationUrl: j.apply_url ?? j.url ?? "https://remoteok.com",
    provider: "remoteok",
    sourceId: String(j.id),
    postedAt: j.date ?? null,
    expiresAt: null,
    rawPayload: j,
  };
}
