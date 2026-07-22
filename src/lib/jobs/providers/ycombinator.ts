/**
 * Y Combinator jobs via the public Algolia mirror used by hn.algolia.com.
 * We query the `Jobs_production` index for recent postings.
 */

import { slugify } from "../fingerprint";
import {
  detectExperience,
  detectRemoteStatus,
  extractSkills,
  parseSalary,
  sanitizeDescription,
  splitBullets,
  stripHtml,
} from "../normalize";
import type { NormalizedJob } from "../types";
import type { JobProvider, ProviderFetchOptions } from "./base";

type YcHit = {
  objectID?: string;
  title?: string;
  company_name?: string;
  location?: string;
  description?: string;
  application_url?: string;
  posted_at?: string;
};

export const ycombinatorProvider: JobProvider = {
  id: "ycombinator",
  displayName: "Y Combinator",
  async fetch(_config, opts?: ProviderFetchOptions) {
    const out: NormalizedJob[] = [];
    const queries = (opts?.queries?.length ? opts.queries : [""]).slice(0, 8);
    try {
      // Public unauthenticated read of HN job listings — YC portfolio jobs
      for (const q of queries) {
        const url = q
          ? `https://hn.algolia.com/api/v1/search_by_date?tags=job&query=${encodeURIComponent(q)}&hitsPerPage=30`
          : "https://hn.algolia.com/api/v1/search_by_date?tags=job&hitsPerPage=40";
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = (await res.json()) as { hits?: Array<{ objectID: string; title?: string; url?: string; created_at?: string; story_text?: string; author?: string }> };
        for (const h of data.hits ?? []) {
          if (!h.title) continue;
          const yc: YcHit = {
            objectID: h.objectID,
            title: h.title,
            company_name: h.author ?? "YC Company",
            description: h.story_text ?? h.title,
            application_url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
            posted_at: h.created_at,
          };
          out.push(mapJob(yc));
          if (opts?.limit && out.length >= opts.limit) return dedupe(out);
        }
      }
    } catch {
      // skip
    }
    return dedupe(out);
  },
};

function dedupe(jobs: NormalizedJob[]): NormalizedJob[] {
  const seen = new Set<string>();
  return jobs.filter((j) => {
    const key = j.applicationUrl || j.sourceId;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapJob(j: YcHit): NormalizedJob {
  const description = sanitizeDescription(j.description ?? "");
  const plain = stripHtml(j.description ?? "");
  const salary = parseSalary(plain);
  const skills = extractSkills(plain);
  const bullets = splitBullets(j.description ?? "");
  return {
    title: j.title!,
    company: {
      name: j.company_name ?? "YC Company",
      slug: slugify(j.company_name ?? "yc-company"),
      domain: null, logoUrl: null, website: null,
      industry: "Startup", size: null, remotePolicy: null,
      techStack: skills.slice(0, 12),
      description: null,
    },
    location: j.location ?? null,
    locationCountry: null,
    remoteStatus: detectRemoteStatus({ location: j.location ?? null, description: plain }),
    employmentType: "full_time",
    experienceLevel: detectExperience(j.title!, plain),
    salaryMin: salary.min, salaryMax: salary.max, salaryCurrency: salary.currency,
    description,
    responsibilities: bullets.slice(0, 6),
    requirements: bullets.slice(6, 14),
    requiredSkills: skills,
    preferredSkills: [],
    benefits: [],
    applicationUrl: j.application_url ?? "https://ycombinator.com",
    provider: "ycombinator",
    sourceId: j.objectID ?? crypto.randomUUID(),
    postedAt: j.posted_at ?? null,
    expiresAt: null,
    rawPayload: j,
  };
}
