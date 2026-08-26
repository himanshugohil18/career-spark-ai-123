/**
 * Derived career identity: domain + seniority, inferred deterministically
 * from the Career Brain (titles, years, skills, projects). Pure functions —
 * safe on both client and server, no I/O, no AI.
 *
 * Matching uses `seniorityAlignment()` so an intern brain never scores high
 * on a Principal role (and vice-versa), and the UI uses
 * `deriveCareerProfile()` to show the user exactly what the system thinks
 * they are — the "truth / source transparency" requirement.
 */

import type { CareerBrainSnapshot } from "@/lib/career-brain.service";
import { buildProfileFromSnapshot } from "./jobs/role-synonyms";

export type Seniority =
  | "intern"
  | "entry"
  | "junior"
  | "mid"
  | "senior"
  | "staff"
  | "lead"
  | "principal"
  | "executive";

/** Ordered ladder used for distance math. */
const LADDER: Seniority[] = [
  "intern",
  "entry",
  "junior",
  "mid",
  "senior",
  "staff",
  "lead",
  "principal",
  "executive",
];

export const SENIORITY_LABELS: Record<Seniority, string> = {
  intern: "Intern",
  entry: "Entry level",
  junior: "Junior",
  mid: "Mid level",
  senior: "Senior",
  staff: "Staff",
  lead: "Lead",
  principal: "Principal",
  executive: "Executive",
};

const TITLE_RULES: Array<[RegExp, Seniority]> = [
  [/\b(intern|internship|trainee|apprentice)\b/i, "intern"],
  [/\b(fresher|graduate|entry[- ]level)\b/i, "entry"],
  [/\b(junior|jr\.?|associate)\b/i, "junior"],
  [/\b(chief|cto|ceo|cio|vp|vice president|head of|director)\b/i, "executive"],
  [/\b(principal|distinguished|architect)\b/i, "principal"],
  [/\b(lead|team lead|tech lead|manager|engineering manager)\b/i, "lead"],
  [/\b(staff|sr\.? staff)\b/i, "staff"],
  [/\b(senior|sr\.?)\b/i, "senior"],
];

/** Seniority implied by a job or resume title, if any. */
export function seniorityFromTitle(title: string | null | undefined): Seniority | null {
  const t = (title ?? "").trim();
  if (!t) return null;
  for (const [re, level] of TITLE_RULES) if (re.test(t)) return level;
  return null;
}

/** Seniority implied purely by years of experience. */
export function seniorityFromYears(years: number | null | undefined): Seniority | null {
  if (years == null || Number.isNaN(years)) return null;
  if (years < 0.5) return "intern";
  if (years < 1.5) return "entry";
  if (years < 3) return "junior";
  if (years < 6) return "mid";
  if (years < 10) return "senior";
  if (years < 14) return "staff";
  return "principal";
}

/** Job-posting experience_level enum -> ladder rung. */
export function seniorityFromJobLevel(level: string | null | undefined): Seniority | null {
  const l = (level ?? "").toLowerCase();
  if (!l || l === "unknown") return null;
  if (LADDER.includes(l as Seniority)) return l as Seniority;
  if (l === "temporary" || l === "freelance") return null;
  return null;
}

/**
 * Practical-experience credit: production-grade projects partially offset a
 * thin years count so a strong final-year student is not scored as an intern
 * on a junior role.
 */
function practicalYearsCredit(brain: CareerBrainSnapshot): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projects = (brain.projects ?? []) as any[];
  let credit = 0;
  for (const p of projects) {
    const blob = [
      p?.name ?? "",
      p?.description ?? "",
      Array.isArray(p?.responsibilities) ? p.responsibilities.join(" ") : "",
      Array.isArray(p?.achievements) ? p.achievements.join(" ") : "",
    ]
      .join(" ")
      .toLowerCase();
    if (/(production|deployed|deploy|live users|scale|migration|shipped|launch|ci\/cd)/.test(blob)) {
      credit += 0.4;
    } else if (blob.length > 60) {
      credit += 0.15;
    }
  }
  const internships = (brain.experiences ?? []).length;
  return Math.min(2, credit + Math.min(1, internships * 0.25));
}

export type DerivedCareerProfile = {
  /** Primary role family label, e.g. "DevOps / Cloud Engineering". */
  domainLabel: string | null;
  domainId: string | null;
  /** Adjacent domains the user may also be shown. */
  adjacentDomains: string[];
  seniority: Seniority | null;
  seniorityLabel: string | null;
  /** Years on the resume. */
  years: number | null;
  /** Years + practical project credit, used by scoring. */
  effectiveYears: number;
  /** Top skills that drive the domain classification. */
  coreSkills: string[];
  /** 0..1 — how confidently the domain/seniority were inferred. */
  confidence: number;
  /** Human-readable list of the signals used (transparency). */
  signals: string[];
};

export function deriveCareerProfile(
  brain: CareerBrainSnapshot | null | undefined,
): DerivedCareerProfile {
  const empty: DerivedCareerProfile = {
    domainLabel: null,
    domainId: null,
    adjacentDomains: [],
    seniority: null,
    seniorityLabel: null,
    years: null,
    effectiveYears: 0,
    coreSkills: [],
    confidence: 0,
    signals: [],
  };
  if (!brain?.ready) return empty;

  const profile = buildProfileFromSnapshot(brain);
  const years = brain.identity.yearsOfExperience ?? null;
  const credit = practicalYearsCredit(brain);
  const effectiveYears = Math.max(0, (years ?? 0) + credit);

  const titleLevel =
    seniorityFromTitle(brain.identity.currentTitle) ??
    seniorityFromTitle(brain.identity.preferences.preferredRole);
  const yearsLevel = seniorityFromYears(years ?? effectiveYears);

  // The title wins when it is explicit; years only override when the title
  // is silent, or when years clearly outrank a vague title.
  let seniority: Seniority | null = titleLevel ?? yearsLevel;
  if (titleLevel && yearsLevel) {
    const ti = LADDER.indexOf(titleLevel);
    const yi = LADDER.indexOf(yearsLevel);
    // Trust the title, but don't let "Senior" on a 6-month resume stand.
    seniority = Math.abs(ti - yi) > 2 ? LADDER[Math.round((ti + yi) / 2)]! : titleLevel;
  }

  const coreSkills = brain.skills
    .slice()
    .sort((a, b) => Number(b.userVerified) - Number(a.userVerified) || (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, 8)
    .map((s) => s.name)
    .filter(Boolean);

  const signals: string[] = [];
  if (brain.identity.currentTitle) signals.push(`Title: ${brain.identity.currentTitle}`);
  if (years != null) signals.push(`${years} yr${years === 1 ? "" : "s"} on resume`);
  if (credit > 0) signals.push(`+${credit.toFixed(1)} yr project credit`);
  if (coreSkills.length) signals.push(`${brain.skills.length} skills parsed`);
  if (brain.projects.length) signals.push(`${brain.projects.length} projects`);

  let confidence = 0;
  if (profile.primaryLabel) confidence += 0.4;
  if (seniority) confidence += 0.25;
  if (coreSkills.length >= 4) confidence += 0.2;
  if (brain.experiences.length > 0 || brain.projects.length > 0) confidence += 0.15;

  return {
    domainLabel: profile.primaryLabel ?? null,
    domainId: profile.primary?.id ?? null,
    adjacentDomains: profile.familyLabels.filter((l) => l !== profile.primaryLabel).slice(0, 3),
    seniority,
    seniorityLabel: seniority ? SENIORITY_LABELS[seniority] : null,
    years,
    effectiveYears,
    coreSkills,
    confidence: Math.min(1, confidence),
    signals,
  };
}

/**
 * How well the candidate's rung matches a job's rung, in [0..1].
 * Same rung = 1. One step apart = 0.82. Reaching down is penalised less
 * harshly than reaching far up.
 */
export function seniorityAlignment(
  candidate: Seniority | null,
  jobLevel: string | null | undefined,
): number {
  const job = seniorityFromJobLevel(jobLevel);
  if (!candidate || !job) return 0.75; // unknown on either side — neutral
  const ci = LADDER.indexOf(candidate);
  const ji = LADDER.indexOf(job);
  if (ci < 0 || ji < 0) return 0.75;
  const delta = ji - ci;
  if (delta === 0) return 1;
  if (delta > 0) return Math.max(0.1, 1 - delta * 0.22); // stretch upward
  return Math.max(0.35, 1 - Math.abs(delta) * 0.12); // over-qualified
}

/** Convenience: derive the candidate rung straight from a brain snapshot. */
export function candidateSeniority(
  brain: CareerBrainSnapshot | null | undefined,
): Seniority | null {
  return deriveCareerProfile(brain).seniority;
}

// ---------------------------------------------------------------------------
// Seniority compatibility (hard recommendation constraint)
// ---------------------------------------------------------------------------

/** Years-of-experience band a job rung implies: [min, max]. */
export const LEVEL_YEARS: Record<Seniority, [number, number]> = {
  intern: [0, 1],
  entry: [0, 2],
  junior: [0.5, 3],
  mid: [3, 6],
  senior: [5, 9],
  staff: [7, 13],
  lead: [6, 12],
  principal: [10, 20],
  executive: [10, 30],
};

/**
 * Minimum years a posting demands. Prefers an explicit number in the text
 * ("5+ years", "3-5 years of experience"); falls back to the level band.
 */
export function requiredYears(
  jobLevel: string | null | undefined,
  text?: string | null,
): number | null {
  const blob = (text ?? "").toLowerCase();
  const m =
    blob.match(/(\d{1,2})\s*(?:\+|plus)?\s*(?:-|–|to)?\s*(\d{1,2})?\s*(?:\+)?\s*years?\b/) ?? null;
  if (m) {
    const a = Number(m[1]);
    if (Number.isFinite(a) && a >= 0 && a <= 25) return a;
  }
  const lvl = seniorityFromJobLevel(jobLevel);
  return lvl ? LEVEL_YEARS[lvl][0] : null;
}

export type SeniorityTier = "under" | "match" | "stretch" | "over" | "far-over";

export type SeniorityFit = {
  /** 0..100 — how appropriate this rung is for the candidate. */
  score: number;
  tier: SeniorityTier;
  /** Ladder distance: job rung index minus candidate rung index. */
  delta: number;
  /** Hard ceiling applied to the overall match score, or null. */
  cap: number | null;
  label: string;
  candidate: Seniority | null;
  job: Seniority | null;
  requiredYears: number | null;
  candidateYears: number;
};

/**
 * The seniority compatibility filter. This is intentionally strict: a 0-year
 * candidate applying to a "5-8 years" senior posting must never be able to
 * reach the recommended band, no matter how good the skill overlap is.
 */
export function seniorityFit(args: {
  candidate: Seniority | null;
  candidateYears: number;
  jobLevel: string | null | undefined;
  jobText?: string | null;
}): SeniorityFit {
  const job = seniorityFromJobLevel(args.jobLevel);
  const cYears = Math.max(0, args.candidateYears ?? 0);
  const reqYears = requiredYears(args.jobLevel, args.jobText);
  const base: Omit<SeniorityFit, "score" | "tier" | "delta" | "cap" | "label"> = {
    candidate: args.candidate,
    job,
    requiredYears: reqYears,
    candidateYears: cYears,
  };

  if (!args.candidate || !job) {
    // Unknown rung on either side: fall back to the years gap when we have it.
    if (reqYears != null && reqYears - cYears >= 3) {
      const gap = reqYears - cYears;
      return {
        ...base,
        score: Math.max(8, 100 - gap * 18),
        tier: gap >= 5 ? "far-over" : "over",
        delta: 2,
        cap: gap >= 5 ? 32 : 48,
        label: `Needs ~${reqYears}+ yrs, you have ${cYears.toFixed(0)}`,
      };
    }
    return { ...base, score: 70, tier: "match", delta: 0, cap: null, label: "Level not specified" };
  }

  const ci = LADDER.indexOf(args.candidate);
  const ji = LADDER.indexOf(job);
  const delta = ji - ci;
  const yearGap = reqYears != null ? Math.max(0, reqYears - cYears) : Math.max(0, delta * 2);

  // Reaching DOWN (over-qualified) — mildly penalised, never capped.
  if (delta <= 0) {
    const score = delta === 0 ? 100 : Math.max(45, 100 - Math.abs(delta) * 12);
    return {
      ...base,
      score,
      tier: delta === 0 ? "match" : "under",
      delta,
      cap: null,
      label: delta === 0 ? "Matches your level" : "Below your level",
    };
  }

  // Reaching UP.
  if (delta === 1 && yearGap <= 2.5) {
    return {
      ...base,
      score: 74,
      tier: "stretch",
      delta,
      cap: 82,
      label: "Stretch — one level above you",
    };
  }
  if (delta === 1) {
    return {
      ...base,
      score: 58,
      tier: "stretch",
      delta,
      cap: 72,
      label: `Stretch — asks for ~${reqYears ?? "more"} yrs`,
    };
  }
  if (delta === 2) {
    return {
      ...base,
      score: Math.max(12, 40 - yearGap * 4),
      tier: "over",
      delta,
      cap: 46,
      label: `Two levels above you${reqYears != null ? ` (~${reqYears}+ yrs)` : ""}`,
    };
  }
  return {
    ...base,
    score: Math.max(4, 22 - yearGap * 3),
    tier: "far-over",
    delta,
    cap: 30,
    label: `Far above your level${reqYears != null ? ` (~${reqYears}+ yrs)` : ""}`,
  };
}

/** Experience-level filter buckets exposed in the Jobs UI. */
export const EXPERIENCE_FILTER_LEVELS: Array<{ id: Seniority; label: string }> = LADDER.map((l) => ({
  id: l,
  label: SENIORITY_LABELS[l],
}));

/** Rungs considered "primary" recommendations for a candidate rung. */
export function primaryLevelsFor(candidate: Seniority | null): Seniority[] {
  if (!candidate) return [];
  const ci = LADDER.indexOf(candidate);
  return LADDER.filter((_, i) => i <= ci);
}
