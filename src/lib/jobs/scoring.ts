/**
 * Deterministic sub-scores. Pure functions — no I/O, no AI.
 *
 * Weight profile is Career-Brain-first: preferred role + skills + tech +
 * projects dominate. Location and generic experience are secondary. Jobs
 * outside the candidate's career track are hard-capped so a DevOps brain
 * can never see a Sales role in the high-relevance band.
 *
 * The AI matching engine consumes these as a baseline and may refine each
 * sub-score within ±15% based on qualitative context.
 */

import type { CareerBrainSnapshot } from "@/lib/career-brain.service";
import {
  buildCandidateProfile,
  jobFamilyFitProfile,
  semanticTechOverlap,
} from "./role-synonyms";
import { computeRelevance, brainTechVocabulary } from "./relevance";
import type { NormalizedJob } from "./types";


function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}
function norm(s: string): string {
  return s.toLowerCase().trim();
}

// ---------- Career Brain projection (memoized per snapshot) ---------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function projectBrain(brain: CareerBrainSnapshot) {
  const skills = brain.skills.map((s) => s.name);
  const verified = new Set(
    brain.skills.filter((s) => s.userVerified).map((s) => norm(s.name)),
  );
  const projectTechs: string[] = [];
  const projectBlobs: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of (brain.projects ?? []) as any[]) {
    const t = (p?.technologies ?? []) as string[];
    if (Array.isArray(t)) projectTechs.push(...t);
    projectBlobs.push(
      [
        p?.name ?? "",
        p?.description ?? "",
        Array.isArray(p?.responsibilities) ? p.responsibilities.join(" ") : "",
        Array.isArray(p?.achievements) ? p.achievements.join(" ") : "",
      ].join(" ").toLowerCase(),
    );
  }
  const profile = buildCandidateProfile({
    preferredRole: brain.identity.preferences.preferredRole,
    currentTitle: brain.identity.currentTitle,
    skills,
    projectTechs,
  });
  return { skills, verified, projectTechs, projectBlobs, profile, families: profile.families };
}


// ---------- Sub-scores ----------------------------------------------------

export function skillOverlapScore(brain: CareerBrainSnapshot, job: NormalizedJob): number {
  const { verified } = projectBrain(brain);
  const brainSkills = new Set(brain.skills.map((s) => norm(s.name)));
  const req = job.requiredSkills.map(norm);
  const pref = job.preferredSkills.map(norm);
  if (req.length === 0 && pref.length === 0) {
    // No structured skills on the job — fall back to a semantic tech overlap
    // between brain skills and any job company tech stack + description
    // tokens; this avoids the previous flat 60 that lifted unrelated jobs.
    return Math.round(
      Math.min(85, semanticTechOverlap(Array.from(brainSkills), job.company.techStack) * 100) || 50,
    );
  }
  let hits = 0;
  const total = req.length * 1.6 + pref.length * 0.7;
  for (const s of req) {
    if (brainSkills.has(s)) hits += verified.has(s) ? 2.0 : 1.6;
  }
  for (const s of pref) {
    if (brainSkills.has(s)) hits += verified.has(s) ? 0.9 : 0.7;
  }
  // Add semantic bump: even if the exact string isn't in brainSkills,
  // cluster overlap (Docker <-> Kubernetes <-> EKS) counts.
  const semantic = semanticTechOverlap(
    Array.from(brainSkills),
    [...req, ...pref],
  );
  const semanticBonus = semantic * 20;
  return clamp((hits / Math.max(total, 1)) * 90 + semanticBonus);
}

export function experienceScore(brain: CareerBrainSnapshot, job: NormalizedJob): number {
  const years = brain.identity.yearsOfExperience ?? 0;
  const { projectBlobs, projectTechs } = projectBrain(brain);
  // Practical-experience credit: projects that mention production / deployed
  // work with the job's required tech partially offset a low years count.
  const jobReq = job.requiredSkills.map(norm);
  const practical = projectBlobs.some(
    (b) => /(production|deploy|scale|migration|shipped|launch)/.test(b) &&
      jobReq.some((r) => b.includes(r)),
  );
  const practicalBonus = practical ? 1.5 : 0;
  const map: Record<string, [number, number]> = {
    intern: [0, 1],
    entry: [0, 2],
    junior: [1, 3],
    mid: [3, 6],
    senior: [5, 10],
    staff: [7, 14],
    principal: [10, 20],
    lead: [6, 12],
    executive: [10, 30],
    unknown: [0, 30],
  };
  const [min, max] = map[job.experienceLevel] ?? map.unknown;
  const effectiveYears = years + practicalBonus;
  if (effectiveYears >= min && effectiveYears <= max) return 100;
  if (effectiveYears < min) {
    // Semantic tech overlap between projects and job req softens the gap.
    const techBridge = semanticTechOverlap(projectTechs, [...jobReq, ...job.preferredSkills.map(norm)]);
    return clamp(100 - (min - effectiveYears) * 12 + techBridge * 25);
  }
  return clamp(100 - (effectiveYears - max) * 6);
}

export function educationScore(brain: CareerBrainSnapshot, job: NormalizedJob): number {
  const hasDegree = brain.education.length > 0;
  const requiresDegree = /\b(bachelor|master|phd|degree)\b/i.test(
    `${job.requirements.join(" ")} ${job.description}`,
  );
  if (!requiresDegree) return 90;
  return hasDegree ? 95 : 55;
}

export function technologyScore(brain: CareerBrainSnapshot, job: NormalizedJob): number {
  const { projectTechs } = projectBrain(brain);
  const brainTechs = [
    ...brain.skills.map((s) => s.name),
    ...projectTechs,
  ];
  const jobTechs = [
    ...(job.company.techStack ?? []),
    ...job.requiredSkills,
    ...job.preferredSkills,
  ];
  if (jobTechs.length === 0) return 55;
  const semantic = semanticTechOverlap(brainTechs, jobTechs);
  // Direct string overlap adds a small bonus on top.
  const brainSet = new Set(brainTechs.map(norm));
  const directHits = jobTechs.filter((t) => brainSet.has(norm(t))).length;
  const direct = directHits / Math.max(jobTechs.length, 3);
  return clamp(semantic * 80 + direct * 30 + 5);
}

export function careerGoalScore(brain: CareerBrainSnapshot, job: NormalizedJob): number {
  const { profile } = projectBrain(brain);
  const { fit } = jobFamilyFitProfile(jobToLike(job), profile);
  return Math.round(clamp(fit * 100));
}

function jobToLike(job: NormalizedJob) {
  return {
    title: job.title,
    description: job.description,
    requiredSkills: job.requiredSkills,
    preferredSkills: job.preferredSkills,
    companyTechStack: job.company?.techStack ?? [],
    responsibilities: job.responsibilities,
    requirements: job.requirements,
  };
}


export function projectsScore(brain: CareerBrainSnapshot, job: NormalizedJob): number {
  const { projectTechs, projectBlobs } = projectBrain(brain);
  if (projectTechs.length === 0 && projectBlobs.length === 0) return 50;
  const jobTechs = [...job.requiredSkills, ...job.preferredSkills];
  const semantic = semanticTechOverlap(projectTechs, jobTechs);
  // Boost when project blobs mention the job's role family tokens.
  const titleLower = job.title.toLowerCase();
  const blobMatch = projectBlobs.some(
    (b) => titleLower.split(" ").some((w) => w.length > 4 && b.includes(w)),
  );
  return clamp(semantic * 90 + (blobMatch ? 25 : 0));
}

export function locationScore(brain: CareerBrainSnapshot, job: NormalizedJob): number {
  const prefLoc = brain.identity.preferences.preferredLocation?.toLowerCase() ?? "";
  if (job.remoteStatus === "remote") return 100;
  if (!prefLoc) return 70;
  const loc = (job.location ?? "").toLowerCase();
  if (loc.includes(prefLoc) || prefLoc.includes(loc)) return 95;
  if (job.remoteStatus === "hybrid") return 65;
  return 40;
}

export function salaryScore(brain: CareerBrainSnapshot, job: NormalizedJob): number {
  const raw = brain.identity.preferences.expectedSalary;
  if (!raw || !job.salaryMax) return 65;
  const expected = Number(String(raw).replace(/[^\d.]/g, ""));
  if (!expected || Number.isNaN(expected)) return 65;
  const target = expected < 1000 ? expected * 1000 : expected;
  if (job.salaryMax >= target) return 100;
  const gap = (target - job.salaryMax) / target;
  return clamp(100 - gap * 120);
}

// ---------- Composite ----------------------------------------------------

export type BaselineScores = ReturnType<typeof computeBaselineScores>;

export function computeBaselineScores(brain: CareerBrainSnapshot, job: NormalizedJob) {
  const skill = skillOverlapScore(brain, job);
  const experience = experienceScore(brain, job);
  const education = educationScore(brain, job);
  const technology = technologyScore(brain, job);
  const careerGoal = careerGoalScore(brain, job);
  const projects = projectsScore(brain, job);
  const location = locationScore(brain, job);
  const salary = salaryScore(brain, job);

  // Career-Brain-first weights. Total = 1.00.
  //   careerGoal 0.28, skill 0.22, technology 0.20, projects 0.10,
  //   experience 0.08, salary 0.05, location 0.04, education 0.03
  const rawOverall =
    careerGoal * 0.28 +
    skill * 0.22 +
    technology * 0.20 +
    projects * 0.10 +
    experience * 0.08 +
    salary * 0.05 +
    location * 0.04 +
    education * 0.03;

  // Hard career-path guardrail. Off-track and excluded-domain jobs can NEVER
  // climb into the recommended band — no matter what keywords they share.
  const { profile } = projectBrain(brain);
  const { fit, excluded } = jobFamilyFitProfile(jobToLike(job), profile);
  let overall = rawOverall;
  if (excluded) overall = Math.min(overall, 15);          // hard excluded domain
  else if (profile.families.length > 0) {
    if (fit === 0) overall = Math.min(overall, 22);        // completely off-track
    else if (fit <= 0.4) overall = Math.min(overall, 48);  // same track, different role
    else if (fit <= 0.7) overall = Math.min(overall, 78);  // related family
  }

  return {
    overall: Math.round(clamp(overall)),
    skill: Math.round(skill),
    experience: Math.round(experience),
    education: Math.round(education),
    technology: Math.round(technology),
    careerGoal: Math.round(careerGoal),
    projects: Math.round(projects),
    location: Math.round(location),
    salary: Math.round(salary),
    familyFit: fit,
    excluded,
  };
}


export function computeMissingSkills(
  brain: CareerBrainSnapshot,
  job: NormalizedJob,
): { skill: string; priority: "high" | "medium" | "low" }[] {
  const have = new Set(brain.skills.map((s) => norm(s.name)));
  // Also treat any skill semantically covered by the brain (via TECH_GRAPH)
  // as satisfied, so we don't tell a user with Kubernetes that they're
  // missing "K8s".
  const covered = (needle: string) => {
    if (have.has(norm(needle))) return true;
    const overlap = semanticTechOverlap([needle], Array.from(have));
    return overlap >= 0.5;
  };
  const missing: { skill: string; priority: "high" | "medium" | "low" }[] = [];
  for (const s of job.requiredSkills) if (!covered(s)) missing.push({ skill: s, priority: "high" });
  for (const s of job.preferredSkills) if (!covered(s)) missing.push({ skill: s, priority: "medium" });
  return missing.slice(0, 8);
}
