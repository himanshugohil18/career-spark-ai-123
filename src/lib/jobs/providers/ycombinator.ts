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
            company_name: parseCompanyFromHnTitle(h.title) ?? "YC Startup",
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

/**
 * HN "Who is hiring" job posts are titled
 *   "Morph (YC S23) Is Hiring Member of Technical Staff".
 * The Algolia mirror exposes no company field, so the real employer is parsed
 * out of the title. The HN submitter handle (`author`) is NEVER a company name,
 * so a failed parse falls back to a neutral label instead of a username.
 */
export function parseCompanyFromHnTitle(title: string | undefined): string | null {
  if (!title) return null;
  const cleaned = title.trim();
  const withBatch = cleaned.match(/^(.+?)\s*\((?:YC\s*)[^)]*\)/i);
  if (withBatch?.[1]) return withBatch[1].trim();
  const hiring = cleaned.match(/^(.+?)\s+(?:is|are)\s+hiring\b/i);
  if (hiring?.[1]) return hiring[1].replace(/\s*\([^)]*\)\s*$/, "").trim();
  return null;
}

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
      name: j.company_name ?? "YC Startup",
      slug: slugify(j.company_name ?? "yc-startup"),
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
