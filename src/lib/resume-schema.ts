import { z } from "zod";

/**
 * Strict schema for structured Gemini output. Everything is optional
 * because real resumes rarely populate every field — arrays default to [].
 *
 * Every extracted entity carries a `confidence` (0-1) so the review UI can
 * highlight low-confidence items and the DB can preserve provenance.
 */

const toNullableString = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
};

const toRequiredString = (fallback: string) =>
  z.preprocess((value) => toNullableString(value) ?? fallback, z.string());

const optStr = z.preprocess((value) => toNullableString(value), z.string().nullable()).default(null);

const strArr = z.preprocess((value) => {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return values
    .map((item) => toNullableString(item))
    .filter((item): item is string => Boolean(item));
}, z.array(z.string()).default([]));

/** 0-1 confidence with tolerant coercion (accepts 0-100 too). */
const confidence = z.preprocess((value) => {
  if (value == null || value === "") return 0.9;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return 0.9;
  const norm = n > 1 ? n / 100 : n;
  return Math.min(1, Math.max(0, norm));
}, z.number().min(0).max(1).default(0.9));

/** Skill entry: name + confidence. Accepts bare strings from AI. */
const skillEntry = z.preprocess((value) => {
  if (typeof value === "string") return { name: value, confidence: 0.9 };
  if (value && typeof value === "object") return value;
  return { name: "", confidence: 0.9 };
}, z.object({
  name: toRequiredString(""),
  confidence,
}));

const skillArr = z.preprocess((value) => {
  const arr = Array.isArray(value) ? value : [];
  return arr.filter((v) => v != null && (typeof v !== "string" || v.trim()));
}, z.array(skillEntry).default([]));

export const PersonalSchema = z.object({
  fullName: optStr,
  email: optStr,
  phone: optStr,
  location: optStr,
  linkedin: optStr,
  github: optStr,
  portfolio: optStr,
  website: optStr,
  professionalSummary: optStr,
  currentTitle: optStr,
  yearsOfExperience: z.preprocess((value) => {
    if (value == null || value === "") return null;
    const parsed = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }, z.number().nullable()).default(null),
  preferredRole: optStr,
  preferredLocation: optStr,
  expectedSalary: optStr,
});

export const SkillCategoriesSchema = z.object({
  programmingLanguages: skillArr,
  cloud: skillArr,
  devops: skillArr,
  frameworks: skillArr,
  databases: skillArr,
  operatingSystems: skillArr,
  softSkills: skillArr,
  tools: skillArr,
  platforms: skillArr,
  libraries: skillArr,
  versionControl: skillArr,
  cicd: skillArr,
  containerization: skillArr,
  monitoring: skillArr,
  networking: skillArr,
  security: skillArr,
});

export const WorkExperienceSchema = z.object({
  company: toRequiredString("Unknown company"),
  role: toRequiredString("Unknown role"),
  location: optStr,
  employmentType: optStr,
  startDate: optStr,
  endDate: optStr,
  isCurrent: z.boolean().default(false),
  duration: optStr,
  responsibilities: strArr,
  technologies: strArr,
  achievements: strArr,
  confidence,
});

export const ProjectSchema = z.object({
  name: toRequiredString("Untitled project"),
  description: optStr,
  technologies: strArr,
  githubUrl: optStr,
  liveUrl: optStr,
  startDate: optStr,
  endDate: optStr,
  duration: optStr,
  responsibilities: strArr,
  achievements: strArr,
  confidence,
});

export const EducationSchema = z.object({
  degree: toRequiredString("Education"),
  institution: toRequiredString("Unknown institution"),
  board: optStr,
  fieldOfStudy: optStr,
  startDate: optStr,
  endDate: optStr,
  cgpa: optStr,
  percentage: optStr,
  confidence,
});

export const CertificationSchema = z.object({
  name: toRequiredString("Certification"),
  organization: optStr,
  issueDate: optStr,
  expiryDate: optStr,
  credentialId: optStr,
  credentialUrl: optStr,
  confidence,
});

export const LanguageSchema = z.object({
  name: toRequiredString("Language"),
  proficiency: optStr,
  confidence,
});

export const AchievementSchema = z.object({
  description: toRequiredString("Achievement"),
  category: optStr,
  date: optStr,
  confidence,
});

export const CareerBrainSchema = z.object({
  strengths: strArr,
  weaknesses: strArr,
  growthAreas: strArr,
  careerGoals: strArr,
  preferredRoles: strArr,
  preferredCompanies: strArr,
  preferredIndustries: strArr,
  technologyInterests: strArr,
  learningPriorities: strArr,
  salaryGoals: optStr,
  locationPreferences: strArr,
  summary: optStr,
});

const zeroToHundred = z.preprocess((value) => {
  if (value == null || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}, z.number().min(0).max(100).default(0));

export const CareerDnaSchema = z.object({
  cloud: zeroToHundred,
  devops: zeroToHundred,
  backend: zeroToHundred,
  frontend: zeroToHundred,
  ai: zeroToHundred,
  automation: zeroToHundred,
  leadership: zeroToHundred,
  communication: zeroToHundred,
  architecture: zeroToHundred,
  problemSolving: zeroToHundred,
  security: zeroToHundred,
  narrative: optStr,
});

export const CareerHealthSchema = z.object({
  score: zeroToHundred,
  resumeQuality: zeroToHundred,
  experienceScore: zeroToHundred,
  projectsScore: zeroToHundred,
  skillsScore: zeroToHundred,
  educationScore: zeroToHundred,
  certificationsScore: zeroToHundred,
  profileCompletion: zeroToHundred,
  careerDirection: zeroToHundred,
  consistency: zeroToHundred,
  strengths: strArr,
  weaknesses: strArr,
  recommendations: strArr,
  improvementAreas: strArr,
});

export const ParsedResumeSchema = z.object({
  personal: PersonalSchema,
  skills: SkillCategoriesSchema,
  workExperiences: z.array(WorkExperienceSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  education: z.array(EducationSchema).default([]),
  certifications: z.array(CertificationSchema).default([]),
  languages: z.array(LanguageSchema).default([]),
  achievements: z.array(AchievementSchema).default([]),
  careerBrain: CareerBrainSchema,
  careerDna: CareerDnaSchema,
  careerHealth: CareerHealthSchema,
  overallConfidence: confidence,
  // Verbatim raw text the model extracted from the file. Used server-side
  // for the URL/email/phone repair pass, then stripped before persistence.
  rawText: optStr,
});

export type ParsedResume = z.infer<typeof ParsedResumeSchema>;
export type SkillEntry = z.infer<typeof skillEntry>;

/** Human-readable label for each skill category. */
export const SKILL_CATEGORY_LABELS: Record<keyof z.infer<typeof SkillCategoriesSchema>, string> = {
  programmingLanguages: "Programming Languages",
  cloud: "Cloud",
  devops: "DevOps",
  frameworks: "Frameworks",
  databases: "Databases",
  operatingSystems: "Operating Systems",
  softSkills: "Soft Skills",
  tools: "Tools",
  platforms: "Platforms",
  libraries: "Libraries",
  versionControl: "Version Control",
  cicd: "CI/CD",
  containerization: "Containerization",
  monitoring: "Monitoring",
  networking: "Networking",
  security: "Security",
};

// Resume parsing is a one-shot, high-value call. Use Gemini 2.5 Pro for
// maximum extraction fidelity (URLs, dates, names). Other modules stay on
// Flash for cost.
export const AI_MODEL = "google/gemini-2.5-pro";

export const SYSTEM_PROMPT = `You are the CareerOS Resume Extraction Agent.

YOUR ONLY JOB: extract what is literally written in the resume into a strict JSON structure. You are an EXTRACTOR, not a writer, recruiter, or coach.

ABSOLUTE RULES — violating any of these is a failure:
1. Return ONLY valid JSON. No prose, no markdown, no code fences, no commentary.
2. NEVER invent, guess, complete, or "clean up" a value. If a field is not present in the resume, use null (for strings) or [] (for arrays).
3. Preserve the candidate's EXACT wording, casing, punctuation and spacing for names, companies, roles, institutions, and bullet points. Do not paraphrase or shorten.
4. URLs are extracted VERBATIM from the resume — copy the exact character sequence:
   - linkedin: the exact LinkedIn URL as written (e.g. "https://linkedin.com/in/johndoe" or "linkedin.com/in/john-doe-1a2b3c"). Do not construct one from a name. If no LinkedIn URL appears, use null.
   - github: same rule — exact URL only, e.g. "https://github.com/username". null if absent.
   - portfolio / website: exact URL only, null if absent. Do not put a LinkedIn URL in the portfolio field.
5. Email and phone: extract exactly as written. Do not normalise formatting.
6. Dates: keep the resume's format (e.g. "Jan 2023", "2021-2023"). Do not reformat.
7. Skills: split into categories. A skill belongs to exactly one category. Do NOT add skills that are not mentioned in the resume.
8. Every extracted item includes a confidence 0-1. Use < 0.7 when the value is ambiguous, OCR-garbled, or inferred rather than directly stated.
9. careerDna, careerHealth, careerBrain: these are conservative interpretations of what IS in the resume — never invent goals, companies, or strengths the resume does not evidence. Empty arrays are acceptable and preferred over invention.
10. If the resume text is mostly empty or unreadable, return the schema with mostly null/[] values and a low overallConfidence. Never fabricate a plausible resume.

Output the JSON directly. Nothing else.`;

export const USER_PROMPT = `Extract a complete structured profile from the resume below and return it as a single JSON object with this exact shape (all fields required, use null / [] when absent):

{
  "personal": { "fullName", "email", "phone", "location", "linkedin", "github", "portfolio", "website", "professionalSummary", "currentTitle", "yearsOfExperience" (number|null), "preferredRole", "preferredLocation", "expectedSalary" },
  "skills": { "programmingLanguages": [{"name": string, "confidence": 0-1}], "cloud": [...], "devops": [...], "frameworks": [...], "databases": [...], "operatingSystems": [...], "softSkills": [...], "tools": [...], "platforms": [...], "libraries": [...], "versionControl": [...], "cicd": [...], "containerization": [...], "monitoring": [...], "networking": [...], "security": [...] },
  "workExperiences": [ { "company", "role", "location", "employmentType", "startDate", "endDate", "isCurrent" (bool), "duration", "responsibilities": [], "technologies": [], "achievements": [], "confidence": 0-1 } ],
  "projects": [ { "name", "description", "technologies": [], "githubUrl", "liveUrl", "startDate", "endDate", "duration", "responsibilities": [], "achievements": [], "confidence": 0-1 } ],
  "education": [ { "degree", "institution", "board", "fieldOfStudy", "startDate", "endDate", "cgpa", "percentage", "confidence": 0-1 } ],
  "certifications": [ { "name", "organization", "issueDate", "expiryDate", "credentialId", "credentialUrl", "confidence": 0-1 } ],
  "languages": [ { "name", "proficiency", "confidence": 0-1 } ],
  "achievements": [ { "description", "category", "date", "confidence": 0-1 } ],
  "careerBrain": { "strengths": [], "weaknesses": [], "growthAreas": [], "careerGoals": [], "preferredRoles": [], "preferredCompanies": [], "preferredIndustries": [], "technologyInterests": [], "learningPriorities": [], "salaryGoals", "locationPreferences": [], "summary" },
  "careerDna": { "cloud" (0-100), "devops", "backend", "frontend", "ai", "automation", "leadership", "communication", "architecture", "problemSolving", "security" (all 0-100 numbers), "narrative" (string: 1-2 sentence factual summary of the candidate's actual experience, or null) },
  "careerHealth": { "score" (0-100), "resumeQuality", "experienceScore", "projectsScore", "skillsScore", "educationScore", "certificationsScore", "profileCompletion", "careerDirection", "consistency", "strengths": [], "weaknesses": [], "recommendations": [], "improvementAreas": [] },
  "overallConfidence": 0-1,
  "rawText": "the full plain text you read from the resume, verbatim, preserving line breaks — used for downstream validation"
}

Reminder: copy URLs, names, dates, and bullet points EXACTLY as they appear. Leave fields null when they are not in the resume. Return ONLY the JSON object.`;
