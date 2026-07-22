/**
 * Application Workspace AI analyses. One combined Gemini call produces
 * job intelligence, resume analysis, ATS analysis, skill-gap and
 * application-readiness scoring. Keeping it in a single call stays within
 * Worker memory limits and keeps outputs internally consistent.
 */

import { callLovableAI, extractJson } from "@/lib/ai-gateway.server";
import type { CareerBrainSnapshot } from "@/lib/career-brain.service";

const MODEL = "google/gemini-3-flash-preview";

export type WorkspaceJob = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  remote_status: string | null;
  employment_type: string | null;
  experience_level: string | null;
  required_skills: string[] | null;
  preferred_skills: string[] | null;
  keywords: string[] | null;
  company?: {
    id?: string | null;
    name?: string | null;
    industry?: string | null;
    size?: string | null;
    remote_policy?: string | null;
    tech_stack?: string[] | null;
    description?: string | null;
    website?: string | null;
    headquarters?: string | null;
  } | null;
};

export type CombinedAnalysis = {
  jobIntelligence: {
    required_skills: string[];
    preferred_skills: string[];
    required_technologies: string[];
    responsibilities: string[];
    qualifications: string[];
    experience_requirements: string[];
    soft_skills: string[];
    education: string[];
    certifications: string[];
    keywords: string[];
    hiring_signals: string[];
  };
  resumeAnalysis: {
    skills_match: number;
    experience_match: number;
    projects_match: number;
    technology_match: number;
    education_match: number;
    certification_match: number;
    strengths: string[];
    weaknesses: string[];
    missing_requirements: string[];
    missing_technologies: string[];
    transferable_skills: string[];
  };
  atsAnalysis: {
    overall_score: number;
    keyword_coverage: number;
    keyword_density: number;
    formatting_score: number;
    matched_keywords: string[];
    missing_keywords: string[];
    required_skills_coverage: number;
    preferred_skills_coverage: number;
    technology_coverage: number;
    section_completeness: Record<string, boolean>;
    suggestions: Array<{ title: string; detail: string }>;
  };
  gapAnalysis: {
    mastered: Array<{ skill: string; note?: string }>;
    partial: Array<{ skill: string; note?: string }>;
    missing: Array<{ skill: string; impact: "high" | "medium" | "low"; note?: string }>;
    high_priority: Array<{ skill: string; note?: string }>;
    recommended_next: Array<{ skill: string; reason?: string }>;
  };
  readiness: {
    overall_score: number;
    resume_quality: number;
    ats_compatibility: number;
    skill_match: number;
    technology_match: number;
    project_match: number;
    experience_match: number;
    brain_alignment: number;
    company_alignment: number;
    competitiveness: "low" | "moderate" | "strong" | "exceptional";
    strengths: string[];
    weaknesses: string[];
    top_improvements: string[];
    recommendations: Array<{ title: string; detail: string }>;
  };
};

function brainDigest(brain: CareerBrainSnapshot) {
  return {
    identity: {
      currentTitle: brain.identity.currentTitle,
      preferredRole: brain.identity.preferences.preferredRole,
      yearsOfExperience: brain.identity.yearsOfExperience,
      summary: brain.identity.professionalSummary,
    },
    skills: brain.skills.map((s) => ({ name: s.name, category: s.category })),
    experiences: (brain.experiences ?? []).slice(0, 8).map((e) => ({
      role: e?.role, company: e?.company, years: e?.years_of_experience ?? null,
      technologies: e?.technologies ?? [], description: e?.description ?? null,
    })),
    projects: (brain.projects ?? []).slice(0, 10).map((p) => ({
      name: p?.name, description: p?.description ?? null,
      technologies: p?.technologies ?? [],
    })),
    education: (brain.education ?? []).map((e) => ({ degree: e?.degree, field: e?.field, institution: e?.institution })),
    certifications: (brain.certifications ?? []).map((c) => ({ name: c?.name, issuer: c?.issuer })),
  };
}

export async function runCombinedAnalysis(
  job: WorkspaceJob,
  brain: CareerBrainSnapshot,
): Promise<{ analysis: CombinedAnalysis; model: string; inputHash: string }> {
  const payload = {
    job: {
      title: job.title,
      location: job.location,
      remote: job.remote_status,
      employment_type: job.employment_type,
      experience_level: job.experience_level,
      description: (job.description ?? "").slice(0, 12_000),
      required_skills: job.required_skills ?? [],
      preferred_skills: job.preferred_skills ?? [],
      keywords: (job.keywords ?? []) as string[],
      company: job.company
        ? { name: job.company.name, industry: job.company.industry, size: job.company.size, tech_stack: job.company.tech_stack ?? [] }
        : null,
    },
    brain: brainDigest(brain),
  };
  const inputHash = await sha256(JSON.stringify(payload));

  const system = `You are CareerOS's Application Intelligence engine. You compare a candidate's Career Brain against ONE job. Return STRICT JSON only, matching the required schema. All scores are integers 0-100. Never invent skills the candidate doesn't have. Never hallucinate keywords not in the JD. When information is missing, use conservative estimates and leave arrays empty rather than guessing. Numbers must reflect real evidence in the inputs. Be quantitative, decisive, and never verbose.`;

  const user = `INPUT:
${JSON.stringify(payload)}

Return JSON with EXACTLY this shape:
{
  "jobIntelligence": {
    "required_skills": string[],
    "preferred_skills": string[],
    "required_technologies": string[],
    "responsibilities": string[],
    "qualifications": string[],
    "experience_requirements": string[],
    "soft_skills": string[],
    "education": string[],
    "certifications": string[],
    "keywords": string[],
    "hiring_signals": string[]
  },
  "resumeAnalysis": {
    "skills_match": 0-100,
    "experience_match": 0-100,
    "projects_match": 0-100,
    "technology_match": 0-100,
    "education_match": 0-100,
    "certification_match": 0-100,
    "strengths": string[],
    "weaknesses": string[],
    "missing_requirements": string[],
    "missing_technologies": string[],
    "transferable_skills": string[]
  },
  "atsAnalysis": {
    "overall_score": 0-100,
    "keyword_coverage": 0-100,
    "keyword_density": number,
    "formatting_score": 0-100,
    "matched_keywords": string[],
    "missing_keywords": string[],
    "required_skills_coverage": 0-100,
    "preferred_skills_coverage": 0-100,
    "technology_coverage": 0-100,
    "section_completeness": { "summary": bool, "experience": bool, "skills": bool, "education": bool, "projects": bool, "certifications": bool },
    "suggestions": [{ "title": string, "detail": string }]
  },
  "gapAnalysis": {
    "mastered": [{ "skill": string, "note": string }],
    "partial": [{ "skill": string, "note": string }],
    "missing": [{ "skill": string, "impact": "high"|"medium"|"low", "note": string }],
    "high_priority": [{ "skill": string, "note": string }],
    "recommended_next": [{ "skill": string, "reason": string }]
  },
  "readiness": {
    "overall_score": 0-100,
    "resume_quality": 0-100,
    "ats_compatibility": 0-100,
    "skill_match": 0-100,
    "technology_match": 0-100,
    "project_match": 0-100,
    "experience_match": 0-100,
    "brain_alignment": 0-100,
    "company_alignment": 0-100,
    "competitiveness": "low"|"moderate"|"strong"|"exceptional",
    "strengths": string[],
    "weaknesses": string[],
    "top_improvements": string[],
    "recommendations": [{ "title": string, "detail": string }]
  }
}`;

  const raw = await callLovableAI({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    responseFormat: "json_object",
    temperature: 0.2,
  });
  const parsed = JSON.parse(extractJson(raw)) as CombinedAnalysis;
  return { analysis: parsed, model: MODEL, inputHash };
}

export type CompanyIntelligence = {
  overview: string | null;
  industry: string | null;
  size: string | null;
  engineering_culture: string | null;
  products: string[];
  tech_stack: string[];
  remote_policy: string | null;
  hiring_style: string | null;
  values: string[];
  funding_stage: string | null;
  headquarters: string | null;
  website: string | null;
};

export async function runCompanyIntel(input: {
  name: string;
  industry?: string | null;
  size?: string | null;
  remote_policy?: string | null;
  tech_stack?: string[] | null;
  description?: string | null;
  website?: string | null;
  headquarters?: string | null;
}): Promise<{ intel: CompanyIntelligence; model: string }> {
  const system = `You are a company research analyst. Given the structured company signals below, produce a factual JSON report. When a field is uncertain or unknown, return null (strings) or [] (arrays). NEVER fabricate. Values like funding stage or engineering culture must be omitted (null / []) unless clearly implied by inputs or well-known about the company.`;
  const user = `Company signals:
${JSON.stringify(input)}

Return JSON with this shape:
{
  "overview": string|null,
  "industry": string|null,
  "size": string|null,
  "engineering_culture": string|null,
  "products": string[],
  "tech_stack": string[],
  "remote_policy": string|null,
  "hiring_style": string|null,
  "values": string[],
  "funding_stage": string|null,
  "headquarters": string|null,
  "website": string|null
}`;
  const raw = await callLovableAI({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    responseFormat: "json_object",
    temperature: 0.2,
  });
  const parsed = JSON.parse(extractJson(raw)) as CompanyIntelligence;
  return { intel: parsed, model: MODEL };
}

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
