/**
 * Shared types for the Job Discovery, Normalization, Matching and Feed system.
 * Every provider normalizes to `NormalizedJob`. Every downstream module consumes
 * `NormalizedJob` and the Career Brain snapshot — never a raw provider payload.
 */

export type RemoteStatus = "remote" | "hybrid" | "onsite" | "unknown";
export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "internship"
  | "temporary"
  | "freelance"
  | "unknown";
export type ExperienceLevel =
  | "intern"
  | "entry"
  | "junior"
  | "mid"
  | "senior"
  | "staff"
  | "principal"
  | "lead"
  | "executive"
  | "unknown";

export type SavedJobStatus =
  | "saved"
  | "favorite"
  | "archived"
  | "ignored"
  | "applied_later";

export type NormalizedCompany = {
  name: string;
  slug: string;
  domain: string | null;
  logoUrl: string | null;
  website: string | null;
  industry: string | null;
  size: string | null;
  remotePolicy: string | null;
  techStack: string[];
  description: string | null;
};

export type NormalizedJob = {
  title: string;
  company: NormalizedCompany;
  location: string | null;
  locationCountry: string | null;
  remoteStatus: RemoteStatus;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  description: string;
  responsibilities: string[];
  requirements: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  benefits: string[];
  applicationUrl: string;
  provider: string;
  sourceId: string;
  postedAt: string | null;
  expiresAt: string | null;
  rawPayload?: unknown;
};

export type MissingSkill = {
  skill: string;
  priority: "high" | "medium" | "low";
};

export type MatchScore = {
  overall: number;
  skill: number;
  experience: number;
  education: number;
  technology: number;
  careerGoal: number;
  location: number;
  salary: number;
  strengths: string[];
  weaknesses: string[];
  missingSkills: MissingSkill[];
  explanation: string;
  aiModel: string | null;
};

export type JobFilters = {
  q?: string;
  role?: string;
  location?: string;
  remoteStatus?: RemoteStatus[];
  employmentType?: EmploymentType[];
  experienceLevel?: ExperienceLevel[];
  provider?: string[];
  companyId?: string;
  technology?: string[];
  industry?: string;
  minMatch?: number;
  postedWithinDays?: number;
  salaryMin?: number;
  sort?: "match" | "newest" | "salary" | "remote" | "updated";
  page?: number;
  pageSize?: number;
};
