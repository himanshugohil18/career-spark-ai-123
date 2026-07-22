/**
 * Query-first marketplace adapters. These providers do not ingest broad feeds;
 * they execute the CandidateProfile's generated search queries directly, then
 * the discovery orchestrator applies strict domain filtering before upsert.
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

type MarketplaceSpec = {
  id: string;
  displayName: string;
  buildUrls(query: string, locations: string[]): string[];
  parse(html: string, query: string, url: string): NormalizedJob[];
};

const USER_AGENT = "Mozilla/5.0 (compatible; CareerOS/1.0; +https://careerosproject.lovable.app)";

function createMarketplaceProvider(spec: MarketplaceSpec): JobProvider {
  return {
    id: spec.id,
    displayName: spec.displayName,
    async fetch(_config, opts?: ProviderFetchOptions) {
      const queries = (opts?.queries?.length ? opts.queries : ["DevOps Engineer"]).slice(0, 10);
      const locations = opts?.locations?.length ? opts.locations.slice(0, 2) : ["India", "Remote"];
      const out: NormalizedJob[] = [];
      const seen = new Set<string>();
      for (const query of queries) {
        for (const url of spec.buildUrls(query, locations)) {
          try {
            const res = await fetch(url, {
              headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
            });
            if (!res.ok) continue;
            const html = await res.text();
            for (const job of spec.parse(html, query, url)) {
              const key = job.applicationUrl || `${job.provider}:${job.sourceId}`;
              if (!key || seen.has(key)) continue;
              seen.add(key);
              out.push(job);
              if (opts?.limit && out.length >= opts.limit) return out;
            }
          } catch {
            // Individual marketplace pages are best-effort; continue with the next query/provider.
          }
        }
      }
      return out;
    },
  };
}

export const linkedInJobsProvider = createMarketplaceProvider({
  id: "linkedin",
  displayName: "LinkedIn Jobs",
  buildUrls: (query, locations) => locations.map((l) =>
    `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(l)}&start=0`,
  ),
  parse: parseLinkedIn,
});

export const naukriProvider = createMarketplaceProvider({
  id: "naukri",
  displayName: "Naukri",
  buildUrls: (query, locations) => locations.map((l) =>
    `https://www.naukri.com/${slugify(query)}-jobs?k=${encodeURIComponent(query)}&l=${encodeURIComponent(l)}`,
  ),
  parse: (html, query) => parseJsonBackedMarketplace(html, query, "naukri", "Naukri"),
});

export const instahyreProvider = createMarketplaceProvider({
  id: "instahyre",
  displayName: "Instahyre",
  buildUrls: (query, locations) => locations.map((l) =>
    `https://www.instahyre.com/search-jobs/?skills=${encodeURIComponent(query)}&locations=${encodeURIComponent(l)}`,
  ),
  parse: (html, query) => parseJsonBackedMarketplace(html, query, "instahyre", "Instahyre"),
});

export const hiristProvider = createMarketplaceProvider({
  id: "hirist",
  displayName: "Hirist",
  buildUrls: (query) => [`https://www.hirist.tech/search/${slugify(query)}-jobs`],
  parse: (html, query) => parseJsonBackedMarketplace(html, query, "hirist", "Hirist"),
});

export const cutshortProvider = createMarketplaceProvider({
  id: "cutshort",
  displayName: "Cutshort",
  buildUrls: (query) => [`https://cutshort.io/jobs/${slugify(query)}-jobs`],
  parse: (html, query) => parseJsonBackedMarketplace(html, query, "cutshort", "Cutshort"),
});

export const indeedProvider = createMarketplaceProvider({
  id: "indeed",
  displayName: "Indeed",
  buildUrls: (query, locations) => locations.map((l) =>
    `https://rss.indeed.com/rss?q=${encodeURIComponent(query)}&l=${encodeURIComponent(l)}`,
  ),
  parse: parseIndeedRss,
});

export const wellfoundProvider = createMarketplaceProvider({
  id: "wellfound",
  displayName: "Wellfound",
  buildUrls: (query) => [`https://wellfound.com/jobs?keywords=${encodeURIComponent(query)}`],
  parse: (html, query) => parseJsonBackedMarketplace(html, query, "wellfound", "Wellfound"),
});

function parseLinkedIn(html: string, query: string): NormalizedJob[] {
  const cards = html.match(/<li[\s\S]*?<\/li>/gi) ?? [];
  return cards.map((card, index) => {
    const title = clean(extract(card, /base-search-card__title[^>]*>([\s\S]*?)<\/h3>/i));
    const company = clean(extract(card, /base-search-card__subtitle[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i) || extract(card, /base-search-card__subtitle[^>]*>([\s\S]*?)<\/h4>/i));
    const location = clean(extract(card, /job-search-card__location[^>]*>([\s\S]*?)<\/span>/i));
    const href = decodeEntities(extract(card, /base-card__full-link[^>]*href="([^"]+)"/i) || extract(card, /<a[^>]*href="([^"]+)"/i));
    const posted = extract(card, /datetime="([^"]+)"/i) || null;
    if (!title || !company || !href) return null;
    return mapMarketplaceJob({
      provider: "linkedin",
      title,
      company,
      location,
      url: href,
      postedAt: posted,
      description: `${title} at ${company}. Discovered from LinkedIn Jobs query: ${query}.`,
      sourceId: href.match(/view\/[^-]+-(\d+)/)?.[1] ?? href,
      raw: { query, index },
    });
  }).filter((j): j is NormalizedJob => !!j);
}

function parseIndeedRss(xml: string, query: string): NormalizedJob[] {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  return items.map((item, index) => {
    const titleRaw = clean(extract(item, /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || extract(item, /<title>([\s\S]*?)<\/title>/i));
    const link = clean(extract(item, /<link>([\s\S]*?)<\/link>/i));
    const description = extract(item, /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || titleRaw;
    if (!titleRaw || !link) return null;
    const [title, companyMaybe] = titleRaw.split(" - ");
    return mapMarketplaceJob({
      provider: "indeed",
      title: title || titleRaw,
      company: companyMaybe || "Indeed Company",
      location: clean(stripHtml(description).match(/Location:\s*([^|]+)/i)?.[1] ?? ""),
      url: link,
      description,
      postedAt: null,
      sourceId: link,
      raw: { query, index },
    });
  }).filter((j): j is NormalizedJob => !!j);
}

function parseJsonBackedMarketplace(html: string, query: string, provider: string, fallbackCompany: string): NormalizedJob[] {
  const jobs: NormalizedJob[] = [];
  for (const json of extractJsonPayloads(html)) collectJobsFromJson(json, jobs, { provider, query, fallbackCompany });
  if (jobs.length) return dedupe(jobs);
  return parseAnchors(html, query, provider, fallbackCompany);
}

function extractJsonPayloads(html: string): unknown[] {
  const payloads: unknown[] = [];
  const scriptMatches = html.matchAll(/<script[^>]*(?:id="__NEXT_DATA__"|type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scriptMatches) {
    try { payloads.push(JSON.parse(decodeEntities(match[1]).trim())); } catch { /* ignore invalid script */ }
  }
  return payloads;
}

function collectJobsFromJson(value: unknown, out: NormalizedJob[], ctx: { provider: string; query: string; fallbackCompany: string }) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectJobsFromJson(item, out, ctx);
    return;
  }
  const obj = value as Record<string, unknown>;
  const title = stringFrom(obj.title ?? obj.jobTitle ?? obj.designation ?? obj.position ?? obj.name);
  const company = stringFrom(obj.companyName ?? obj.company_name ?? obj.hiringOrganization ?? (obj.company as Record<string, unknown> | undefined)?.name) ?? ctx.fallbackCompany;
  const url = absolutize(stringFrom(obj.url ?? obj.jobUrl ?? obj.applyUrl ?? obj.redirectUrl ?? obj.jdUrl), ctx.provider);
  if (title && /engineer|devops|sre|platform|cloud|infrastructure|kubernetes|terraform|linux/i.test(title) && url) {
    const description = stringFrom(obj.description ?? obj.jobDescription ?? obj.summary) ?? `${title} at ${company}. Discovered from ${ctx.fallbackCompany} query: ${ctx.query}.`;
    out.push(mapMarketplaceJob({
      provider: ctx.provider,
      title,
      company,
      location: stringFrom(obj.location ?? obj.locations ?? obj.city),
      url,
      description,
      postedAt: stringFrom(obj.datePosted ?? obj.postedAt ?? obj.createdAt),
      sourceId: stringFrom(obj.id ?? obj.jobId ?? obj.objectID) ?? url,
      raw: { query: ctx.query, provider: ctx.provider },
    }));
  }
  for (const child of Object.values(obj)) collectJobsFromJson(child, out, ctx);
}

function parseAnchors(html: string, query: string, provider: string, fallbackCompany: string): NormalizedJob[] {
  const out: NormalizedJob[] = [];
  const anchors = html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi);
  for (const [full, href, labelHtml] of anchors) {
    const title = clean(labelHtml);
    if (!title || title.length < 8 || !/engineer|devops|sre|platform|cloud|infrastructure|kubernetes|terraform|linux/i.test(title)) continue;
    const url = absolutize(decodeEntities(href), provider);
    if (!url || /javascript:|#/.test(url)) continue;
    const aria = clean(extract(full, /aria-label="([^"]+)"/i));
    out.push(mapMarketplaceJob({
      provider,
      title,
      company: fallbackCompany,
      location: null,
      url,
      description: `${aria || title}. Discovered from ${fallbackCompany} query: ${query}.`,
      postedAt: null,
      sourceId: url,
      raw: { query, provider },
    }));
  }
  return dedupe(out).slice(0, 25);
}

function mapMarketplaceJob(input: {
  provider: string;
  title: string;
  company: string;
  location?: string | null;
  url: string;
  description: string;
  postedAt: string | null;
  sourceId: string;
  raw: unknown;
}): NormalizedJob {
  const plain = stripHtml(input.description);
  const skills = extractSkills(`${input.title} ${plain}`);
  const salary = parseSalary(plain);
  return {
    title: input.title,
    company: {
      name: input.company,
      slug: slugify(input.company),
      domain: null,
      logoUrl: null,
      website: null,
      industry: null,
      size: null,
      remotePolicy: null,
      techStack: skills.slice(0, 12),
      description: null,
    },
    location: input.location || null,
    locationCountry: detectCountry(input.location),
    remoteStatus: detectRemoteStatus({ location: input.location, description: plain }),
    employmentType: normalizeEmployment(plain),
    experienceLevel: detectExperience(input.title, plain),
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.currency,
    description: sanitizeDescription(input.description),
    responsibilities: [],
    requirements: [],
    requiredSkills: skills,
    preferredSkills: [],
    benefits: [],
    applicationUrl: input.url,
    provider: input.provider,
    sourceId: slugify(input.sourceId).slice(0, 160),
    postedAt: input.postedAt,
    expiresAt: null,
    rawPayload: input.raw,
  };
}

function extract(s: string, rx: RegExp): string {
  return rx.exec(s)?.[1] ?? "";
}

function clean(html: string | null | undefined): string {
  return decodeEntities(stripHtml(html ?? "")).replace(/\s+/g, " ").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stringFrom(value: unknown): string | null {
  if (typeof value === "string") return clean(value);
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "name" in value) return stringFrom((value as { name?: unknown }).name);
  if (Array.isArray(value)) return value.map(stringFrom).filter(Boolean).join(", ") || null;
  return null;
}

function absolutize(url: string | null | undefined, provider: string): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const host: Record<string, string> = {
    naukri: "https://www.naukri.com",
    instahyre: "https://www.instahyre.com",
    hirist: "https://www.hirist.tech",
    cutshort: "https://cutshort.io",
    wellfound: "https://wellfound.com",
  };
  return `${host[provider] ?? ""}${url.startsWith("/") ? url : `/${url}`}`;
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