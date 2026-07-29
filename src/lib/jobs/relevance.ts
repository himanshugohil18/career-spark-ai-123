/**
 * Job Relevance Engine — the strict, title-anchored gate that decides whether
 * a job may ever be shown to a candidate, and how relevant it is.
 *
 * Why this exists: `classifyJob` looks at the whole posting, so weak tokens
 * ("platform", "cloud", "infrastructure") appearing in a Sales or Finance
 * posting could classify it into an engineering family and let it rank high.
 * The relevance engine fixes that by resolving the role from the TITLE ONLY,
 * with a hard non-technical veto, and by requiring real technology evidence.
 *
 * Pure functions — no I/O, no AI. Used by scoring, the feed and the matcher.
 */

import {
  ROLE_FAMILIES,
  familyCompatibility,
  classifyJob,
  semanticTechOverlap,
  type CandidateProfile,
  type JobLike,
  type RoleFamily,
} from "./role-synonyms";

/* ------------------------------------------------------------------ */
/* Title parsing                                                       */
/* ------------------------------------------------------------------ */

/** Roles that are never a fit for a technology candidate. Hard veto. */
const NON_TECHNICAL_TITLE =
  /\b(sales|seller|account executive|account manager|account director|business development|partnerships?|revenue|quota|marketing|growth marketer|demand generation|seo specialist|content writer|copywriter|social media|community manager|brand|public relations|recruiter|recruiting|talent acquisition|human resources|people operations|people partner|accountant|accounting|bookkeeping|payroll|controller|auditor|actuary|tax|underwriter|financial analyst|finance manager|investment|legal|counsel|paralegal|compliance officer|customer success|customer support|customer service|support specialist|help ?desk|service desk|teacher|tutor|nurse|physician|clinical|therapist|pharmacist|driver|warehouse|logistics|supply chain|procurement|real estate|insurance|barista|chef|cook|retail|cashier|janitor|security guard|administrative assistant|executive assistant|office manager|receptionist|event manager|fundraising|donor|volunteer)\b/i;

/** Explicitly technical role nouns. */
const TECH_ROLE_NOUN =
  /\b(engineer|engineering|developer|programmer|architect|sre|devops|devsecops|administrator|sysadmin|technologist|scientist|technician)\b/i;

/** Management titles that are not individual-contributor engineering roles. */
const NON_IC_LEADERSHIP =
  /\b(vp|vice president|chief|cto|cio|ceo|coo|cfo|head|director|general manager|engineering manager|program manager|product manager|site lead|team lead)\b/i;

/** Product/business titles can mention AI but are not AI/ML engineering jobs. */
const PRODUCT_BUSINESS_TITLE =
  /\b(product manager|product management|program manager|project manager|business analyst|strategy|operations manager|growth manager|product owner)\b/i;

const SENIORITY_PATTERNS: Array<[RegExp, JobSeniority]> = [
  [/\b(intern|internship|co-?op|trainee|apprentice)\b/i, "intern"],
  [/\b(graduate|entry[- ]level|fresher|new grad)\b/i, "entry"],
  [/\b(junior|jr\.?|associate|i{1,2}\b)\b/i, "junior"],
  [/\b(principal|distinguished|fellow)\b/i, "principal"],
  [/\b(staff)\b/i, "staff"],
  [/\b(lead|manager|head of|director|vp|chief)\b/i, "lead"],
  [/\b(senior|sr\.?|iii|iv)\b/i, "senior"],
];

export type JobSeniority =
  | "intern" | "entry" | "junior" | "mid" | "senior" | "staff" | "principal" | "lead";

export type TitleRole = {
  /** Family resolved from the title alone; null when unrecognizable. */
  family: RoleFamily | null;
  /** Strength of the title match, 0..1. */
  strength: number;
  nonTechnical: boolean;
  leadership: boolean;
  seniority: JobSeniority | null;
};

function cleanTitle(raw: string): string {
  return ` ${raw
    .toLowerCase()
    .replace(/\((?:yc\s*[a-z]\d{2}|remote|hybrid|onsite|us|uk|emea|india)\)/gi, " ")
    .replace(/[|/,–—-]+/g, " ")
    .replace(/[^a-z0-9+.# ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

function hasPhrase(hay: string, phrase: string): boolean {
  const p = phrase.toLowerCase().trim();
  if (!p) return false;
  return hay.includes(` ${p} `) || hay.startsWith(`${p} `) || hay.endsWith(` ${p}`);
}

/** Resolve the job's role family from the TITLE only. */
export function resolveTitleRole(rawTitle: string): TitleRole {
  const title = cleanTitle(rawTitle ?? "");
  const nonTechnical = NON_TECHNICAL_TITLE.test(title) && !TECH_ROLE_NOUN.test(title);
  const leadership = NON_IC_LEADERSHIP.test(title);

  let seniority: JobSeniority | null = null;
  for (const [re, level] of SENIORITY_PATTERNS) {
    if (re.test(title)) { seniority = level; break; }
  }

  const techNoun = TECH_ROLE_NOUN.test(title);
  let best: { family: RoleFamily | null; score: number } = { family: null, score: 0 };
  for (const fam of ROLE_FAMILIES) {
    let score = 0;
    for (const syn of fam.synonyms) if (hasPhrase(title, syn)) score = Math.max(score, 100);
    for (const tok of fam.tokens) {
      if (tok.length < 4) continue;
      // A bare technology token ("react", "python") only implies a role family
      // when the title also carries a technical role noun — otherwise
      // "Incident Response Analyst - REACT" reads as a frontend job.
      if (!techNoun && !tok.includes(" ")) continue;
      if (hasPhrase(title, tok)) score = Math.max(score, tok.includes(" ") ? 85 : 55);
    }
    if (score > best.score) best = { family: fam, score };
  }


  // A bare tech noun ("Engineer", "Developer") with no family phrase stays
  // UNRESOLVED — it must be corroborated by the posting body and by real
  // technology overlap before it can ever reach a feed.
  if (!best.family && TECH_ROLE_NOUN.test(title)) best = { family: null, score: 20 };

  return {
    family: best.family,
    strength: Math.min(1, best.score / 100),
    nonTechnical,
    leadership,
    seniority,
  };
}

/* ------------------------------------------------------------------ */
/* Relevance                                                           */
/* ------------------------------------------------------------------ */

const SENIORITY_RANK: Record<JobSeniority, number> = {
  intern: 0, entry: 1, junior: 2, mid: 3, senior: 4, staff: 5, principal: 6, lead: 5,
};

const CANDIDATE_RANK: Record<string, number> = {
  intern: 0, entry: 1, junior: 2, mid: 3, senior: 4, staff: 5,
};

export type RelevanceResult = {
  /** 0..1 — how well the job matches the candidate's career track. */
  relevance: number;
  /** Passes every hard gate: safe to show in the feed. */
  gate: boolean;
  /** Hard-vetoed (wrong career track / non-technical role). */
  vetoed: boolean;
  titleFit: number;
  techFit: number;
  seniorityFit: number;
  jobFamily: RoleFamily | null;
  titleFamily: RoleFamily | null;
  reason: string;
};

function trackFit(candidate: CandidateProfile, family: RoleFamily | null): number {
  if (!family) return 0.35;
  if (candidate.excludedFamilyIds.has(family.id)) return 0;
  // Families are ordered by strength of evidence in the resume. A job in the
  // candidate's PRIMARY family scores 1.0; secondary families decay, so a
  // web developer whose resume also shows some Docker never sees SRE roles
  // ranked above frontend/backend ones.
  const rankWeight = [1, 0.8, 0.62, 0.4];
  let best = 0;
  candidate.families.forEach((fam, i) => {
    const w = rankWeight[i] ?? 0.5;
    if (fam.id === family.id) best = Math.max(best, w);
    else best = Math.max(best, familyCompatibility(fam, family) * w);
  });
  if (best === 0 && candidate.primary && candidate.primary.track === family.track) best = 0.3;
  return best;
}

/** Families whose candidates are judged on technology evidence. */
const TECHNICAL_FAMILY_IDS = new Set([
  "devops", "frontend", "backend", "fullstack", "mobile",
  "data", "ml", "datascience", "security", "qa",
]);

/** Titles that are unambiguously engineering IC roles. */
const ENGINEERING_TITLE =
  /\b(software engineer|software developer|backend|front[- ]?end|full[- ]?stack|devops|sre|site reliability|platform engineer|infrastructure engineer|machine learning engineer|data engineer|security engineer|mobile engineer|ios engineer|android engineer|qa engineer|sdet)\b/i;

/**
 * Domain-keyword evidence for NON-technical candidates: what share of the
 * candidate's resume keywords the posting actually mentions. Replaces the
 * tech-cluster overlap, which is meaningless for an accountant or a PM.
 */
function domainKeywordFit(job: JobLike, keywords: string[]): number {
  const hay = [
    job.title ?? "",
    job.description ?? "",
    ...(job.requiredSkills ?? []),
    ...(job.preferredSkills ?? []),
    ...(job.responsibilities ?? []),
    ...(job.requirements ?? []),
  ].join(" ").toLowerCase().slice(0, 8000);
  const terms = Array.from(new Set(keywords.map((k) => k.toLowerCase().trim()).filter((k) => k.length >= 3)));
  if (!terms.length || !hay) return 0;
  let hit = 0;
  for (const t of terms) if (hay.includes(t)) hit++;
  return Math.min(1, hit / Math.min(terms.length, 10));
}

export function computeRelevance(
  job: JobLike,
  profile: CandidateProfile,
  brainTechs: string[],
): RelevanceResult {
  const titleRole = resolveTitleRole(job.title ?? "");
  const bodyFamily = classifyJob(job);
  const isTechnicalCandidate =
    !profile.primary || TECHNICAL_FAMILY_IDS.has(profile.primary.id);

  const jobTechs = [
    ...(job.requiredSkills ?? []),
    ...(job.preferredSkills ?? []),
    ...(job.companyTechStack ?? []),
  ].filter(Boolean);
  const techFit = isTechnicalCandidate
    ? jobTechs.length
      ? semanticTechOverlap(brainTechs, jobTechs)
      : semanticTechOverlap(brainTechs, extractTechTokens(job))
    : domainKeywordFit(job, brainTechs);

  const base: Omit<RelevanceResult, "relevance" | "gate" | "vetoed" | "reason"> = {
    titleFit: 0,
    techFit,
    seniorityFit: 1,
    jobFamily: bodyFamily,
    titleFamily: titleRole.family,
  };

  // 1. Hard vetoes — direction depends on the candidate's own career track.
  if (isTechnicalCandidate && titleRole.nonTechnical) {
    return { ...base, relevance: 0, gate: false, vetoed: true, reason: "Non-technical role" };
  }
  if (!profile.families.length) {
    // No career brain yet — everything technical is equally plausible.
    return { ...base, titleFit: 0.5, relevance: 0.5, gate: true, vetoed: false, reason: "No career profile yet" };
  }
  if (!isTechnicalCandidate && ENGINEERING_TITLE.test(job.title ?? "")) {
    return { ...base, relevance: 0, gate: false, vetoed: true, reason: "Engineering role, not a match for this profile" };
  }
  if (titleRole.family && profile.excludedFamilyIds.has(titleRole.family.id)) {
    return { ...base, relevance: 0, gate: false, vetoed: true, reason: `Different career track: ${titleRole.family.label}` };
  }
  if (
    isTechnicalCandidate &&
    profile.primary?.track !== "product" &&
    PRODUCT_BUSINESS_TITLE.test(job.title ?? "")
  ) {
    return { ...base, relevance: 0, gate: false, vetoed: true, reason: "Product/business role, not an engineering match" };
  }
  if (!titleRole.family && bodyFamily && profile.excludedFamilyIds.has(bodyFamily.id)) {
    return { ...base, relevance: 0, gate: false, vetoed: true, reason: `Different career track: ${bodyFamily.label}` };
  }
  // A non-technical candidate must land on a title we actually recognised as
  // being in their allowed families — otherwise the feed fills with noise.
  if (!isTechnicalCandidate && !titleRole.family && !(bodyFamily && profile.familyIds.has(bodyFamily.id))) {
    return { ...base, relevance: 0, gate: false, vetoed: false, reason: "Unrecognised role for this profile" };
  }

  // 2. Title fit (dominant signal).
  const titleTrack = trackFit(profile, titleRole.family);
  const bodyTrack = trackFit(profile, bodyFamily);
  // A strong title wins outright; a weak/generic title is corroborated by body.
  const titleFit =
    titleRole.strength >= 0.8
      ? titleTrack
      : titleRole.family
        ? titleTrack * 0.75 + bodyTrack * 0.25
        : bodyTrack * 0.6;

  // 3. Seniority fit.
  const jobRank = titleRole.seniority ? SENIORITY_RANK[titleRole.seniority] : 3;
  const candRank = profile.seniority ? CANDIDATE_RANK[profile.seniority] ?? 2 : 2;
  const gap = jobRank - candRank;
  const seniorityFit = gap <= 0 ? 1 : gap === 1 ? 0.85 : gap === 2 ? 0.55 : 0.25;

  // 4. Blend.
  const relevance = Math.max(
    0,
    Math.min(1, titleFit * 0.55 + techFit * 0.32 + seniorityFit * 0.13),
  );

  // 5. Gate — a job must be on-track AND show real evidence.
  // For technical candidates that evidence is technology overlap; for
  // business / analytics / operations candidates it is domain-keyword overlap.
  const requiredTech = isTechnicalCandidate
    ? titleRole.strength >= 0.85 ? 0.14 : titleRole.strength >= 0.5 ? 0.24 : 0.36
    : titleRole.strength >= 0.85 ? 0.1 : 0.18;
  const coverage = isTechnicalCandidate ? requiredSkillCoverage(job, brainTechs) : 1;
  // Leadership titles are normal for PM / manager tracks — only penalise
  // them when the candidate is an individual contributor engineer.
  const leadershipBlocked =
    isTechnicalCandidate && titleRole.leadership && candRank <= 3;
  const gate =
    titleFit >= 0.6 &&
    relevance >= 0.44 &&
    techFit >= requiredTech &&
    coverage >= 0.1 &&
    !leadershipBlocked;

  const reason = !gate
    ? titleFit < 0.55
      ? `Off-track role${titleRole.family ? `: ${titleRole.family.label}` : ""}`
      : leadershipBlocked
        ? "Leadership role beyond current experience"
        : isTechnicalCandidate ? "Weak technology overlap" : "Weak domain overlap"
    : `${titleRole.family?.label ?? bodyFamily?.label ?? "Technical"} role · ${Math.round(techFit * 100)}% ${isTechnicalCandidate ? "tech" : "domain"} overlap`;

  return { ...base, titleFit, seniorityFit, relevance, gate, vetoed: false, reason };
}


/**
 * Fraction of the job's explicitly required skills the candidate can already
 * evidence (semantically). Jobs listing many requirements the candidate has
 * never touched are not real matches, whatever the title says.
 */
function requiredSkillCoverage(job: JobLike, brainTechs: string[]): number {
  const req = (job.requiredSkills ?? []).filter(Boolean);
  if (req.length < 4) return 1;
  const brainText = brainTechs.join(" ").toLowerCase();
  const reqText = req.join(" ").toLowerCase();
  if (/\bmern\b|mern stack/.test(brainText) && /mongodb|mongo|express|react|node/.test(reqText)) return 1;
  let hit = 0;
  for (const skill of req) if (semanticTechOverlap([skill], brainTechs) >= 0.5) hit++;
  return hit / req.length;
}

const TECH_TOKEN_RE =
  /\b(aws|azure|gcp|kubernetes|k8s|docker|terraform|ansible|jenkins|argo ?cd|gitops|helm|linux|python|bash|go|golang|java|node|nodejs|express|nestjs|react|next\.?js|vue|angular|svelte|html|css|tailwind|typescript|javascript|mongodb|mongo|postgres|mysql|redis|kafka|prometheus|grafana|ci\/cd|cicd|devops|sre|serverless|lambda|ec2|s3|eks|ecs|rds|iam|vpc|cloudformation|pulumi|datadog|splunk|nginx|django|flask|fastapi|spring|rails|pytorch|tensorflow|llm|langchain|rag|nlp|hugging ?face|scikit|sklearn|pandas|numpy)\b/g;

function extractTechTokens(job: JobLike): string[] {
  const hay = [
    job.description ?? "",
    ...(job.responsibilities ?? []),
    ...(job.requirements ?? []),
  ].join(" ").toLowerCase().slice(0, 6000);
  return Array.from(new Set(hay.match(TECH_TOKEN_RE) ?? []));
}

/** Convenience: candidate tech vocabulary from a Career Brain snapshot. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function brainTechVocabulary(brain: any): string[] {
  const skills = (brain?.skills ?? []).map((s: { name: string }) => s.name);
  const projectTechs = ((brain?.projects ?? []) as Array<{ technologies?: string[] }>)
    .flatMap((p) => p?.technologies ?? []);
  const expTechs = ((brain?.experiences ?? []) as Array<{ technologies?: string[] }>)
    .flatMap((e) => e?.technologies ?? []);
  return Array.from(new Set([...skills, ...projectTechs, ...expTechs].filter(Boolean)));
}

/** Stable de-duplication key for a job row (same role at same company). */
export function jobDedupeKey(title: string, company: string | null | undefined): string {
  return `${(company ?? "").toLowerCase().trim()}::${cleanTitle(title).trim()}`;
}
