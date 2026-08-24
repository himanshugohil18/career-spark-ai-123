/**
 * Greenhouse public boards API — https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true
 * `config.boards`: array of Greenhouse board slugs (e.g. "airbnb", "stripe").
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
import { GREENHOUSE_BOARDS, mergeBoards } from "./ats-companies";

type GhJob = {
  id: number;
  title: string;
  updated_at?: string;
  absolute_url: string;
  location?: { name: string };
  content: string;
  metadata?: Array<{ name: string; value: unknown }>;
  offices?: Array<{ name: string; location?: string }>;
  departments?: Array<{ name: string }>;
};

export const greenhouseProvider: JobProvider = {
  id: "greenhouse",
  displayName: "Greenhouse",
  async fetch(config: ProviderConfig) {
    // Registry defaults + any ops-configured extras (see ats-companies.ts).
    const boards = mergeBoards(config.boards, GREENHOUSE_BOARDS);
    return inBatches(boards, 8, async (board) => {
      const out: NormalizedJob[] = [];
      try {
        const res = await fetch(
          `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`,
        );
        if (!res.ok) return out;
        const data = (await res.json()) as { jobs?: GhJob[] };
        for (const j of data.jobs ?? []) {
          out.push(mapJob(board, j));
        }
      } catch {
        // continue with next board
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

function mapJob(board: string, j: GhJob): NormalizedJob {
  const html = decodeHtml(j.content ?? "");
  const description = sanitizeDescription(html);
  const plain = stripHtml(html);
  const location = j.location?.name ?? j.offices?.[0]?.location ?? null;
  const salary = parseSalary(plain);
  const remote = detectRemoteStatus({ location, description: plain });
  const bullets = splitBullets(html);
  const skills = extractSkills(plain);
  return {
    title: j.title,
    company: {
      name: board.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      slug: slugify(board),
      domain: null,
      logoUrl: null,
      website: `https://boards.greenhouse.io/${board}`,
      industry: null,
      size: null,
      remotePolicy: null,
      techStack: skills.slice(0, 12),
      description: null,
    },
    location,
    locationCountry: detectCountry(location),
    remoteStatus: remote,
    employmentType: normalizeEmployment(
      (j.metadata ?? []).find((m) => /employment|type/i.test(m.name))?.value as string | undefined,
    ),
    experienceLevel: detectExperience(j.title, plain),
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.currency,
    description,
    responsibilities: bullets.slice(0, 8),
    requirements: bullets.slice(8, 16),
    requiredSkills: skills,
    preferredSkills: [],
    benefits: [],
    applicationUrl: j.absolute_url,
    provider: "greenhouse",
    sourceId: String(j.id),
    postedAt: j.updated_at ?? null,
    expiresAt: null,
    rawPayload: j,
  };
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
