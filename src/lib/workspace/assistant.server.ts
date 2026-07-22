/**
 * Phase 4 Part 2 — AI Application Assistant generators.
 * All generators are strict-JSON single-shot Gemini calls. Nothing here
 * writes to the database — the *.functions.ts layer persists + caches.
 */

import { callLovableAI, extractJson } from "@/lib/ai-gateway.server";
import type { CareerBrainSnapshot } from "@/lib/career-brain.service";
import type { WorkspaceJob } from "@/lib/workspace/analysis.server";

type SourceResume = {
  id?: string | null;
  version?: number | null;
  file_name?: string | null;
  raw_text?: string | null;
  parsed_json?: unknown;
  status?: string | null;
  overall_confidence?: number | null;
  ai_model?: string | null;
};

function safeParseJson<T>(raw: string, kind: string): T {
  try {
    return JSON.parse(extractJson(raw)) as T;
  } catch (err) {
    const preview = raw.slice(0, 300).replace(/\s+/g, " ");
    throw new Error(
      `AI returned malformed JSON for ${kind}: ${err instanceof Error ? err.message : "parse error"}. Preview: ${preview}`,
    );
  }
}



const MODEL = "google/gemini-3-flash-preview";

// ---------- shared brain digest ----------

export function brainDigest(brain: CareerBrainSnapshot) {
  return {
    identity: {
      currentTitle: brain.identity.currentTitle,
      preferredRole: brain.identity.preferences.preferredRole,
      yearsOfExperience: brain.identity.yearsOfExperience,
      summary: brain.identity.professionalSummary,
      location: brain.identity.location,
    },
    skills: brain.skills.map((s) => ({ name: s.name, category: s.category })),
    experiences: (brain.experiences ?? []).slice(0, 10).map((e: any) => ({
      role: e?.role, company: e?.company, years: e?.years_of_experience ?? null,
      technologies: e?.technologies ?? [], achievements: e?.achievements ?? [],
      description: e?.description ?? null,
    })),
    projects: (brain.projects ?? []).slice(0, 10).map((p: any) => ({
      name: p?.name, description: p?.description ?? null,
      technologies: p?.technologies ?? [], highlights: p?.highlights ?? [],
      url: p?.url ?? null,
    })),
    education: (brain.education ?? []).map((e: any) => ({
      degree: e?.degree, field: e?.field, institution: e?.institution,
    })),
    certifications: (brain.certifications ?? []).map((c: any) => ({ name: c?.name, issuer: c?.issuer })),
  };
}

function jobDigest(job: WorkspaceJob) {
  return {
    title: job.title,
    location: job.location,
    remote: job.remote_status,
    employment_type: job.employment_type,
    experience_level: job.experience_level,
    description: (job.description ?? "").slice(0, 12_000),
    required_skills: job.required_skills ?? [],
    preferred_skills: job.preferred_skills ?? [],
    company: job.company
      ? {
          name: job.company.name,
          industry: job.company.industry,
          size: job.company.size,
          tech_stack: job.company.tech_stack ?? [],
          description: job.company.description ?? null,
        }
      : null,
  };
}

function sourceResumeDigest(resume?: SourceResume | null) {
  if (!resume) return null;
  return {
    id: resume.id ?? null,
    version: resume.version ?? null,
    file_name: resume.file_name ?? null,
    status: resume.status ?? null,
    confidence: resume.overall_confidence ?? null,
    raw_text_excerpt: (resume.raw_text ?? "").slice(0, 8_000) || null,
    parsed_resume: resume.parsed_json ?? null,
  };
}

// ---------- 1) Resume Optimizer ----------

export type OptimizedResume = {
  version_name: string;
  professional_summary: string;
  skills: Array<{ category: string; items: string[] }>;
  experience: Array<{
    role: string;
    company: string;
    dates?: string | null;
    bullets: string[];
  }>;
  projects: Array<{ name: string; description: string; technologies: string[]; url?: string | null }>;
  education: Array<{ degree: string; field?: string | null; institution: string }>;
  certifications: Array<{ name: string; issuer?: string | null }>;
  ats_keywords: string[];
  achievements_highlighted: string[];
  keywords_added: string[];
  ats_score: number;
  readiness_score: number;
  diff: {
    added_keywords: string[];
    reordered_skills: string[];
    reordered_projects: string[];
    reordered_experience: string[];
    summary_changes: string;
    highlights_added: string[];
  };
};

export async function generateOptimizedResume(input: {
  job: WorkspaceJob;
  brain: CareerBrainSnapshot;
  sourceResume?: SourceResume | null;
  atsMissingKeywords?: string[];
}): Promise<{ resume: OptimizedResume; model: string; inputHash: string }> {
  const payload = {
    job: jobDigest(input.job),
    brain: brainDigest(input.brain),
    uploaded_resume: sourceResumeDigest(input.sourceResume),
    ats_missing_keywords: input.atsMissingKeywords ?? [],
  };
  const inputHash = await sha256(JSON.stringify(payload));

  const system = `You are CareerOS's Resume Optimizer. Produce a job-specific optimized resume that reorders, rewords and highlights the candidate's REAL experience for this job. Rules:
- NEVER invent skills, technologies, projects, employers or achievements.
- NEVER inflate years or seniority.
- Preserve factual claims from the Career Brain.
- Reorder skills, projects and bullets so those most relevant to the job appear first.
- Rewrite the professional summary to reflect real evidence and the role's language.
- Weave in ATS keywords from the JD ONLY when they match real evidence.
- Every bullet must map to a real experience or project item in the brain.
- Return STRICT JSON only, no prose.`;

  const user = `INPUT:\n${JSON.stringify(payload)}\n
Return JSON with EXACTLY this shape:
{
  "version_name": string,
  "professional_summary": string,
  "skills": [{ "category": string, "items": string[] }],
  "experience": [{ "role": string, "company": string, "dates": string|null, "bullets": string[] }],
  "projects": [{ "name": string, "description": string, "technologies": string[], "url": string|null }],
  "education": [{ "degree": string, "field": string|null, "institution": string }],
  "certifications": [{ "name": string, "issuer": string|null }],
  "ats_keywords": string[],
  "achievements_highlighted": string[],
  "keywords_added": string[],
  "ats_score": 0-100,
  "readiness_score": 0-100,
  "diff": {
    "added_keywords": string[],
    "reordered_skills": string[],
    "reordered_projects": string[],
    "reordered_experience": string[],
    "summary_changes": string,
    "highlights_added": string[]
  }
}`;

  const raw = await callLovableAI({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    responseFormat: "json_object",
    temperature: 0.3,
  });
  const parsed = safeParseJson<OptimizedResume>(raw, "resume optimizer");
  return { resume: parsed, model: MODEL, inputHash };
}

// ---------- 2) Cover Letter ----------

export type CoverLetterStyle =
  | "professional" | "executive" | "concise" | "enthusiastic" | "startup" | "enterprise";

export type GeneratedCoverLetter = {
  greeting: string;
  body: string;
  closing: string;
  highlights: string[];
  tone_notes: string;
};

export async function generateCoverLetter(input: {
  job: WorkspaceJob;
  brain: CareerBrainSnapshot;
  sourceResume?: SourceResume | null;
  style: CoverLetterStyle;
  companyIntel?: Record<string, unknown> | null;
}): Promise<{ letter: GeneratedCoverLetter; model: string; inputHash: string }> {
  const payload = {
    style: input.style,
    job: jobDigest(input.job),
    brain: brainDigest(input.brain),
    uploaded_resume: sourceResumeDigest(input.sourceResume),
    company_intelligence: input.companyIntel ?? null,
  };
  const inputHash = await sha256(JSON.stringify(payload));

  const STYLE_HINT: Record<CoverLetterStyle, string> = {
    professional: "polished, warm, corporate default",
    executive: "senior, strategic, confident, outcomes-first",
    concise: "punchy, 2–3 short paragraphs, no fluff",
    enthusiastic: "high energy, genuine excitement, still credible",
    startup: "builder tone, ownership, velocity, first-principles",
    enterprise: "structured, risk-aware, compliance-friendly, formal",
  };

  const system = `You are CareerOS's Cover Letter writer. Write a HUMAN-sounding, specific cover letter that references the candidate's REAL projects and experience mapped to the JD. Rules:
- No em-dash overload, no clichés, no generic filler.
- Never invent skills, employers, projects, metrics or credentials.
- Weave in 1–2 concrete achievements from the brain.
- Reference the company by name and one specific thing about the role/company when available.
- Style: ${STYLE_HINT[input.style]}.
- Return STRICT JSON only.`;

  const user = `INPUT:\n${JSON.stringify(payload)}\n
Return JSON:
{
  "greeting": string,
  "body": string (multi-paragraph, separated by \\n\\n),
  "closing": string,
  "highlights": string[],
  "tone_notes": string
}`;

  const raw = await callLovableAI({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    responseFormat: "json_object",
    temperature: 0.5,
  });
  const parsed = safeParseJson<GeneratedCoverLetter>(raw, "cover letter");
  return { letter: parsed, model: MODEL, inputHash };
}

// ---------- 3) Screening answers ----------

export type ScreeningKind =
  | "about_you" | "why_company" | "why_hire" | "challenge" | "achievement"
  | "goals" | "why_leaving" | "strengths" | "weaknesses"
  | "custom_short" | "custom_paragraph" | "custom_essay"
  | "portfolio" | "project" | "technical";

const STANDARD_QS: Array<{ kind: ScreeningKind; question: string }> = [
  { kind: "about_you", question: "Tell us about yourself." },
  { kind: "why_company", question: "Why do you want to work here?" },
  { kind: "why_hire", question: "Why should we hire you?" },
  { kind: "challenge", question: "Describe a challenge you overcame." },
  { kind: "achievement", question: "What is your greatest achievement?" },
  { kind: "goals", question: "What are your career goals?" },
  { kind: "why_leaving", question: "Why are you leaving your current role?" },
  { kind: "strengths", question: "What are your strengths?" },
  { kind: "weaknesses", question: "What are your weaknesses?" },
];

export function standardScreeningQuestions() { return STANDARD_QS; }

export type ScreeningAnswer = {
  kind: ScreeningKind;
  question: string;
  answer: string;
  key_points: string[];
};

export async function generateScreeningAnswers(input: {
  job: WorkspaceJob;
  brain: CareerBrainSnapshot;
  sourceResume?: SourceResume | null;
  questions: Array<{ kind: ScreeningKind; question: string }>;
}): Promise<{ answers: ScreeningAnswer[]; model: string; inputHash: string }> {
  const payload = {
    job: jobDigest(input.job),
    brain: brainDigest(input.brain),
    uploaded_resume: sourceResumeDigest(input.sourceResume),
    questions: input.questions,
  };
  const inputHash = await sha256(JSON.stringify(payload));

  const system = `You are CareerOS's Screening Answer assistant. Draft honest, specific first-person answers using ONLY the candidate's real background. Never invent facts. Keep each answer between 90 and 220 words unless the kind is custom_short (then 40–80). Reference concrete projects, roles or technologies from the brain when relevant. Return STRICT JSON.`;

  const user = `INPUT:\n${JSON.stringify(payload)}\n
Return JSON:
{ "answers": [ { "kind": string, "question": string, "answer": string, "key_points": string[] } ] }`;

  const raw = await callLovableAI({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    responseFormat: "json_object",
    temperature: 0.45,
  });
  const parsed = safeParseJson<{ answers: ScreeningAnswer[] }>(raw, "screening answers");
  return { answers: parsed.answers ?? [], model: MODEL, inputHash };
}

// ---------- 4) Interview prep ----------

export type InterviewCategory =
  | "technical" | "behavioral" | "hr" | "project" | "resume"
  | "scenario" | "company" | "system_design" | "cloud_devops" | "coding";

export type InterviewDifficulty = "easy" | "medium" | "hard";

export type GeneratedInterviewQuestion = {
  category: InterviewCategory;
  difficulty: InterviewDifficulty;
  question: string;
  suggested_answer: string;
  key_points: string[];
  common_mistakes: string[];
  confidence_tips: string[];
  follow_ups: string[];
};

export async function generateInterviewPack(input: {
  job: WorkspaceJob;
  brain: CareerBrainSnapshot;
  sourceResume?: SourceResume | null;
  focus?: string | null;
}): Promise<{
  questions: GeneratedInterviewQuestion[];
  model: string;
  inputHash: string;
}> {
  const payload = {
    focus: input.focus ?? null,
    job: jobDigest(input.job),
    brain: brainDigest(input.brain),
    uploaded_resume: sourceResumeDigest(input.sourceResume),
  };
  const inputHash = await sha256(JSON.stringify(payload));

  const system = `You are CareerOS's Interview Prep engine. Produce a realistic, role-specific interview question set. Rules:
- Pick categories based on the role: always include technical, behavioral, hr, project, resume, scenario, company. Include system_design when the role is engineering/architecture, cloud_devops for infra roles, coding for SWE/backend/fullstack.
- Every question must be answerable using the candidate's real background — no fabrication.
- Aim for exactly 8 total questions well-distributed across relevant categories.
- Suggested answers must reference the candidate's actual projects or experience when possible.
- Return STRICT JSON only.`;

  const user = `INPUT:\n${JSON.stringify(payload)}\n
Return JSON:
{
  "questions": [
    {
      "category": "technical"|"behavioral"|"hr"|"project"|"resume"|"scenario"|"company"|"system_design"|"cloud_devops"|"coding",
      "difficulty": "easy"|"medium"|"hard",
      "question": string,
      "suggested_answer": string,
      "key_points": string[],
      "common_mistakes": string[],
      "confidence_tips": string[],
      "follow_ups": string[]
    }
  ]
}`;

  const raw = await callLovableAI({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    responseFormat: "json_object",
    temperature: 0.4,
    maxTokens: 3200,
  });
  const parsed = safeParseJson<{ questions: GeneratedInterviewQuestion[] }>(raw, "interview pack");
  return { questions: parsed.questions ?? [], model: MODEL, inputHash };
}

// ---------- helpers ----------

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
