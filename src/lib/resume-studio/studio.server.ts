/**
 * Resume Studio server logic: document creation from approved Career Brain
 * data, AI job-tailoring, and deterministic ATS scoring.
 *
 * Truthfulness rule: tailoring may only rephrase, reorder and re-emphasise
 * existing content. Inventing employers, dates, degrees, certifications or
 * skills the user does not have is forbidden and is stripped post-hoc.
 */

import { callLovableAI, extractJson } from "@/lib/ai-gateway.server";
import { getCareerBrainSnapshotFor } from "@/lib/career-brain-logic.server";
import {
  DEFAULT_SECTION_ORDER,
  docFromSnapshot,
  docToPlainText,
  normalizeDoc,
  normalizeSectionOrder,
  type ResumeDoc,
  type SectionKey,
} from "./document";

const MODEL = "google/gemini-3-flash-preview";

export type StudioRow = {
  id: string;
  version_name: string;
  template: string;
  section_order: string[];
  origin: string;
  is_default: boolean;
  optimized_content: unknown;
  target_company: string | null;
  target_job_title: string | null;
  ats_score: number | null;
  readiness_score: number | null;
  keywords_added: string[];
  ai_model: string | null;
  created_at: string;
  updated_at: string;
};

export const STUDIO_SELECT =
  "id, version_name, template, section_order, origin, is_default, optimized_content, target_company, target_job_title, ats_score, readiness_score, keywords_added, ai_model, created_at, updated_at";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildDocFromBrain(supabase: any, userId: string) {
  const snapshot = await getCareerBrainSnapshotFor(supabase, userId);
  return { doc: docFromSnapshot(snapshot), snapshot };
}

// ---------- ATS scoring ---------------------------------------------------

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .filter((w) => w.length > 1),
  );
}

const ACTION_VERBS = [
  "built", "designed", "led", "shipped", "migrated", "automated", "reduced",
  "improved", "scaled", "implemented", "optimized", "delivered", "launched",
  "owned", "architected", "deployed", "integrated", "mentored",
];

export type AtsReport = {
  score: number;
  breakdown: { label: string; score: number; hint: string }[];
  matchedKeywords: string[];
  missingKeywords: string[];
};

/**
 * Deterministic ATS report. No AI — the same document always scores the
 * same, so the number the user sees is explainable.
 */
export function atsReport(
  doc: ResumeDoc,
  order: SectionKey[],
  jobKeywords: string[] = [],
): AtsReport {
  const text = docToPlainText(doc, order);
  const lower = text.toLowerCase();
  const tokens = words(text);

  const contactBits = [
    doc.header.fullName,
    doc.header.email,
    doc.header.phone,
    doc.header.location,
  ].filter(Boolean).length;
  const contact = Math.round((contactBits / 4) * 100);

  const allBullets = [
    ...doc.experience.flatMap((e) => e.bullets),
    ...doc.projects.flatMap((p) => p.bullets),
  ];
  const quantified = allBullets.filter((b) => /\d/.test(b)).length;
  const impact = allBullets.length
    ? Math.min(100, Math.round((quantified / allBullets.length) * 130))
    : 30;

  const verbHits = allBullets.filter((b) =>
    ACTION_VERBS.some((v) => b.toLowerCase().startsWith(v) || b.toLowerCase().includes(` ${v} `)),
  ).length;
  const language = allBullets.length
    ? Math.min(100, Math.round((verbHits / allBullets.length) * 120))
    : 40;

  const coreSections: SectionKey[] = ["summary", "experience", "skills", "education"];
  const present = coreSections.filter((k) => {
    if (k === "summary") return Boolean(doc.summary);
    if (k === "experience") return doc.experience.length > 0 || doc.projects.length > 0;
    if (k === "skills") return doc.skills.some((g) => g.items.length > 0);
    return doc.education.length > 0;
  }).length;
  const structure = Math.round((present / coreSections.length) * 100);

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const length =
    wordCount < 200 ? 45 : wordCount < 350 ? 75 : wordCount <= 900 ? 100 : wordCount <= 1200 ? 85 : 65;

  const kw = [...new Set(jobKeywords.map((k) => k.trim()).filter(Boolean))];
  const matchedKeywords = kw.filter((k) =>
    k.includes(" ") ? lower.includes(k.toLowerCase()) : tokens.has(k.toLowerCase()),
  );
  const missingKeywords = kw.filter((k) => !matchedKeywords.includes(k));
  const keywords = kw.length
    ? Math.round((matchedKeywords.length / kw.length) * 100)
    : Math.min(100, 45 + doc.skills.reduce((n, g) => n + g.items.length, 0) * 3);

  const breakdown = [
    { label: "Contact block", score: contact, hint: "Name, email, phone and location must all be present." },
    { label: "Structure", score: structure, hint: "Summary, experience, skills and education sections." },
    { label: "Quantified impact", score: impact, hint: "Bullets with numbers, %, scale or time saved." },
    { label: "Action language", score: language, hint: "Start bullets with strong action verbs." },
    { label: "Keyword coverage", score: keywords, hint: kw.length ? "Coverage of this job's keywords." : "Breadth of listed skills." },
    { label: "Length", score: length, hint: "Aim for 350–900 words for one to two pages." },
  ];

  const score = Math.round(
    contact * 0.12 + structure * 0.18 + impact * 0.2 + language * 0.15 + keywords * 0.25 + length * 0.1,
  );

  return { score, breakdown, matchedKeywords, missingKeywords };
}

// ---------- Job tailoring -------------------------------------------------

export type JobContext = {
  id: string;
  title: string;
  companyName: string | null;
  description: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  requirements: string[];
  responsibilities: string[];
  location: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadJobContext(supabase: any, jobId: string): Promise<JobContext> {
  const r = await supabase
    .from("jobs")
    .select(
      "id, title, description, required_skills, preferred_skills, requirements, responsibilities, location, companies(name)",
    )
    .eq("id", jobId)
    .maybeSingle();
  if (r.error) throw new Error(`Could not load job: ${r.error.message}`);
  if (!r.data) throw new Error("Job not found or no longer active.");
  const row = r.data as Record<string, any>;
  return {
    id: row.id,
    title: row.title ?? "",
    companyName: row.companies?.name ?? null,
    description: row.description ?? null,
    requiredSkills: row.required_skills ?? [],
    preferredSkills: row.preferred_skills ?? [],
    requirements: row.requirements ?? [],
    responsibilities: row.responsibilities ?? [],
    location: row.location ?? null,
  };
}

export function jobKeywords(job: JobContext): string[] {
  return [...new Set([...job.requiredSkills, ...job.preferredSkills])].slice(0, 40);
}

/** Facts the AI is not allowed to change. */
function factLock(doc: ResumeDoc) {
  return {
    companies: doc.experience.map((e) => e.company).filter(Boolean),
    roles: doc.experience.map((e) => e.role).filter(Boolean),
    dates: doc.experience.map((e) => `${e.startDate}-${e.isCurrent ? "present" : e.endDate}`),
    institutions: doc.education.map((e) => e.institution).filter(Boolean),
    certifications: doc.certifications.map((c) => c.name).filter(Boolean),
    skills: doc.skills.flatMap((g) => g.items),
    projects: doc.projects.map((p) => p.name).filter(Boolean),
  };
}

/**
 * Ask the model to rewrite ONLY the narrative fields, then merge the result
 * back over the verified document so structural facts can never drift.
 */
export async function tailorDocForJob(
  doc: ResumeDoc,
  order: SectionKey[],
  job: JobContext,
): Promise<{ doc: ResumeDoc; keywords: string[]; model: string; notes: string[] }> {
  const locked = factLock(doc);
  const payload = {
    resume: {
      summary: doc.summary,
      experience: doc.experience.map((e, i) => ({ i, role: e.role, company: e.company, bullets: e.bullets })),
      projects: doc.projects.map((p, i) => ({ i, name: p.name, description: p.description, bullets: p.bullets })),
      skills: doc.skills,
    },
    job: {
      title: job.title,
      company: job.companyName,
      requiredSkills: job.requiredSkills,
      preferredSkills: job.preferredSkills,
      requirements: job.requirements.slice(0, 25),
      responsibilities: job.responsibilities.slice(0, 25),
      description: (job.description ?? "").slice(0, 6000),
    },
  };

  const raw = await callLovableAI({
    model: MODEL,
    responseFormat: "json_object",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: [
          "You tailor an existing, verified resume to one specific job.",
          "ABSOLUTE RULES:",
          "1. Never invent employers, job titles, dates, degrees, certifications, metrics or technologies.",
          "2. You may only rephrase, compress, reorder and re-emphasise content that is already present.",
          "3. Never add a skill that is not in the provided skills list.",
          "4. Keep every metric exactly as given; do not fabricate numbers.",
          "5. Return valid JSON only, matching this shape:",
          '{"summary":"","experience":[{"i":0,"bullets":[""]}],"projects":[{"i":0,"bullets":[""]}],"skillOrder":["Category"],"keywordsUsed":[""],"notes":[""]}',
          "Bullets: 1-2 lines each, action verb first, max 6 bullets per entry.",
        ].join("\n"),
      },
      {
        role: "user",
        content: `Verified facts that must not change:\n${JSON.stringify(locked)}\n\nResume + job:\n${JSON.stringify(payload)}`,
      },
    ],
  });

  let parsed: any = {};
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    throw new Error("AI returned an unreadable tailoring response. Please try again.");
  }

  const next: ResumeDoc = normalizeDoc(JSON.parse(JSON.stringify(doc)));
  const allowedSkills = new Set(locked.skills.map((s) => s.toLowerCase()));

  if (typeof parsed.summary === "string" && parsed.summary.trim()) {
    next.summary = parsed.summary.trim();
  }
  for (const item of Array.isArray(parsed.experience) ? parsed.experience : []) {
    const idx = Number(item?.i);
    if (!Number.isInteger(idx) || !next.experience[idx]) continue;
    const bullets = (Array.isArray(item.bullets) ? item.bullets : [])
      .map((b: unknown) => String(b).trim())
      .filter(Boolean)
      .slice(0, 6);
    if (bullets.length) next.experience[idx].bullets = bullets;
  }
  for (const item of Array.isArray(parsed.projects) ? parsed.projects : []) {
    const idx = Number(item?.i);
    if (!Number.isInteger(idx) || !next.projects[idx]) continue;
    const bullets = (Array.isArray(item.bullets) ? item.bullets : [])
      .map((b: unknown) => String(b).trim())
      .filter(Boolean)
      .slice(0, 5);
    if (bullets.length) next.projects[idx].bullets = bullets;
  }
  if (Array.isArray(parsed.skillOrder)) {
    const wanted = parsed.skillOrder.map((c: unknown) => String(c).toLowerCase());
    next.skills = [...next.skills].sort((a, b) => {
      const ai = wanted.indexOf(a.category.toLowerCase());
      const bi = wanted.indexOf(b.category.toLowerCase());
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }
  // Strip any skill the model may have smuggled in.
  next.skills = next.skills.map((g) => ({
    category: g.category,
    items: g.items.filter((s) => allowedSkills.has(s.toLowerCase())),
  }));

  const keywords = (Array.isArray(parsed.keywordsUsed) ? parsed.keywordsUsed : [])
    .map((k: unknown) => String(k).trim())
    .filter(Boolean)
    .slice(0, 25);
  const notes = (Array.isArray(parsed.notes) ? parsed.notes : [])
    .map((n: unknown) => String(n).trim())
    .filter(Boolean)
    .slice(0, 6);

  return { doc: next, keywords, model: MODEL, notes };
}

export function defaultOrder(input?: unknown): SectionKey[] {
  return input && Array.isArray(input) && input.length
    ? normalizeSectionOrder(input)
    : [...DEFAULT_SECTION_ORDER];
}
