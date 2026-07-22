import type { CareerBrainSnapshot } from "@/lib/career-brain.service";

type ResumeVersionRow = {
  id: string;
  name: string | null;
  target_role: string | null;
  target_company: string | null;
  ats_score: number | null;
  keywords: string[] | null;
  is_active: boolean | null;
  version: number | null;
  content: unknown;
  file_url: string | null;
};

export type ResumePick = {
  resume: ResumeVersionRow | null;
  score: number;
  confidence: "high" | "medium" | "low";
  reasoning: string;
};

/** Score how well a resume version fits a target job. Pure, deterministic. */
export function pickBestResume(input: {
  versions: ResumeVersionRow[];
  jobTitle: string;
  jobKeywords: string[];
  brain: CareerBrainSnapshot;
  companyName: string;
}): ResumePick {
  if (input.versions.length === 0) {
    return { resume: null, score: 0, confidence: "low", reasoning: "No resume versions yet." };
  }
  const jobTitleTokens = tokens(input.jobTitle);
  const jobKw = new Set(input.jobKeywords.map((k) => k.toLowerCase()));

  const scored = input.versions.map((v) => {
    let score = 0;
    const reasons: string[] = [];

    // Explicit targeting
    if (v.target_role) {
      const overlap = overlapRatio(tokens(v.target_role), jobTitleTokens);
      score += overlap * 35;
      if (overlap > 0.4) reasons.push(`role match ${(overlap * 100).toFixed(0)}%`);
    }
    if (v.target_company && v.target_company.toLowerCase() === input.companyName.toLowerCase()) {
      score += 20;
      reasons.push("targeted at this company");
    }

    // Keyword coverage
    const kws = (v.keywords ?? []).map((k) => k.toLowerCase());
    const kwHits = kws.filter((k) => jobKw.has(k)).length;
    if (jobKw.size) {
      const cov = kwHits / jobKw.size;
      score += cov * 30;
      if (kwHits > 0) reasons.push(`${kwHits} keyword hits`);
    }

    // ATS baseline
    if (typeof v.ats_score === "number") {
      score += (v.ats_score / 100) * 20;
      reasons.push(`ATS ${v.ats_score}`);
    }

    // Active resume gets a nudge (source of truth)
    if (v.is_active) {
      score += 5;
      reasons.push("active version");
    }

    return { v, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const runnerUp = scored[1];
  const gap = runnerUp ? best.score - runnerUp.score : best.score;
  const confidence: ResumePick["confidence"] =
    best.score >= 55 && gap >= 8 ? "high" : best.score >= 30 ? "medium" : "low";

  return {
    resume: best.v,
    score: Math.round(best.score),
    confidence,
    reasoning: best.reasons.length
      ? `Chose "${best.v.name ?? `v${best.v.version ?? ""}`}" — ${best.reasons.join(", ")}.`
      : `Chose "${best.v.name ?? `v${best.v.version ?? ""}`}" as the highest available fit.`,
  };
}

function tokens(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9+]+/).filter((t) => t.length > 1);
}
function overlapRatio(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const bs = new Set(b);
  const hits = a.filter((t) => bs.has(t)).length;
  return hits / Math.max(a.length, b.length);
}
