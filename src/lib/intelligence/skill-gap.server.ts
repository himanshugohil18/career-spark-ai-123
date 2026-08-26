/**
 * Skill Gap Analyzer — deterministic comparison of the user's Career Brain
 * against a job's requirements. AI analysis (gap_analysis table) is layered
 * on top when it exists, but the base comparison never needs AI.
 */

import type { CareerBrainSnapshot } from "../career-brain.service";

export type SkillGapResult = {
  overallMatch: number;
  breakdown: {
    skills: number;
    experience: number;
    projects: number;
    location: number;
    careerGoal: number;
  };
  strongMatches: string[];
  gaps: string[];
  limited: boolean; // true when the job carries little requirement data
};

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9+#.\s]/g, " ").replace(/\s+/g, " ").trim();

function skillTokens(skills: string[]): Set<string> {
  const set = new Set<string>();
  for (const s of skills) {
    const n = norm(s);
    if (n) set.add(n);
    // also index individual words for loose matching (e.g. "github actions" → "actions")
    for (const w of n.split(" ")) if (w.length > 2) set.add(w);
  }
  return set;
}

function overlaps(required: string, owned: Set<string>): boolean {
  const n = norm(required);
  if (!n) return false;
  if (owned.has(n)) return true;
  const words = n.split(" ").filter((w) => w.length > 2);
  return words.length > 0 && words.every((w) => owned.has(w));
}

export type JobForGap = {
  title: string;
  location?: string | null;
  remote_status?: string | null;
  experience_level?: string | null;
  required_skills?: string[] | null;
  preferred_skills?: string[] | null;
  keywords?: string[] | null;
  description?: string | null;
};

const LEVEL_RANK: Record<string, number> = {
  intern: 0, entry: 1, junior: 2, mid: 3, senior: 4, staff: 5, principal: 6, lead: 6, executive: 7,
};

export function computeSkillGap(job: JobForGap, brain: CareerBrainSnapshot): SkillGapResult {
  const owned = skillTokens(brain.skills.map((s) => s.name));
  // Projects also count as evidence
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of brain.projects ?? []) {
    for (const t of (p?.technologies ?? []) as string[]) owned.add(norm(t));
  }

  const required = (job.required_skills ?? []).filter(Boolean);
  const preferred = (job.preferred_skills ?? []).filter(Boolean);
  const all = [...required, ...preferred];

  const strongMatches = all.filter((s) => overlaps(s, owned));
  const gaps = all.filter((s) => !overlaps(s, owned));

  const skillsScore =
    all.length === 0 ? 0 : Math.round(((required.filter((s) => overlaps(s, owned)).length * 1.5 + preferred.filter((s) => overlaps(s, owned)).length * 0.5) / (required.length * 1.5 + preferred.length * 0.5)) * 100);

  // Experience: user years vs implied level
  const years = brain.identity.yearsOfExperience ?? 0;
  const levelRank = LEVEL_RANK[job.experience_level ?? "unknown"] ?? null;
  const impliedYears = levelRank == null ? null : levelRank * 2;
  const experienceScore =
    impliedYears == null ? 60 : years >= impliedYears ? 100 : Math.round((years / impliedYears) * 100);

  // Projects: does any project tech overlap job tech?
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projTech = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of brain.projects ?? []) for (const t of (p?.technologies ?? []) as string[]) projTech.add(norm(t));
  const jobTechHits = all.filter((s) => projTech.has(norm(s))).length;
  const projectsScore = all.length === 0 ? (brain.projects.length > 0 ? 60 : 0) : Math.round((jobTechHits / all.length) * 100);

  // Location
  const prefLoc = norm(brain.identity.preferences.preferredLocation ?? "");
  const jobLoc = norm(job.location ?? "");
  const isRemote = job.remote_status === "remote" || jobLoc.includes("remote");
  const locationScore =
    isRemote ? 100 : !prefLoc || !jobLoc ? 70 : jobLoc.includes(prefLoc) || prefLoc.includes(jobLoc) ? 100 : 40;

  // Career goal: title token overlap with preferred role
  const prefRole = norm(brain.identity.preferences.preferredRole ?? "");
  const titleTokens = new Set(norm(job.title).split(" ").filter((w) => w.length > 2));
  const roleTokens = prefRole.split(" ").filter((w) => w.length > 2);
  const goalScore =
    roleTokens.length === 0
      ? 60
      : Math.round((roleTokens.filter((t) => titleTokens.has(t)).length / roleTokens.length) * 100);

  const breakdown = {
    skills: Math.max(0, Math.min(100, skillsScore)),
    experience: Math.max(0, Math.min(100, experienceScore)),
    projects: Math.max(0, Math.min(100, projectsScore)),
    location: Math.max(0, Math.min(100, locationScore)),
    careerGoal: Math.max(0, Math.min(100, goalScore)),
  };
  const overallMatch = Math.round(
    breakdown.skills * 0.4 + breakdown.experience * 0.2 + breakdown.projects * 0.15 + breakdown.location * 0.1 + breakdown.careerGoal * 0.15,
  );

  return {
    overallMatch,
    breakdown,
    strongMatches,
    gaps,
    limited: all.length === 0 && !job.description,
  };
}
