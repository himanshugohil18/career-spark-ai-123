/**
 * Resume Studio document model.
 *
 * Isomorphic + pure. This is the canonical shape every Resume Studio
 * surface uses: the editor, the 5 templates, the PDF renderer and the DOCX
 * renderer. It is persisted in `resume_versions.optimized_content`.
 *
 * Truthfulness rule: this module NEVER invents content. `docFromSnapshot`
 * only projects data the user already approved into the document shape.
 */

import type { CareerBrainSnapshot } from "@/lib/career-brain.service";

export type ResumeLink = { label: string; url: string };

export type ResumeExperience = {
  role: string;
  company: string;
  location: string;
  employmentType: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  bullets: string[];
  technologies: string[];
};

export type ResumeProject = {
  name: string;
  description: string;
  technologies: string[];
  bullets: string[];
  githubUrl: string;
  liveUrl: string;
};

export type ResumeEducation = {
  degree: string;
  fieldOfStudy: string;
  institution: string;
  startDate: string;
  endDate: string;
  grade: string;
};

export type ResumeSkillGroup = { category: string; items: string[] };

export type ResumeCertification = {
  name: string;
  organization: string;
  issueDate: string;
  credentialId: string;
  credentialUrl: string;
};

export type ResumeLanguage = { name: string; proficiency: string };

export type ResumeDoc = {
  header: {
    fullName: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    links: ResumeLink[];
  };
  summary: string;
  experience: ResumeExperience[];
  projects: ResumeProject[];
  skills: ResumeSkillGroup[];
  education: ResumeEducation[];
  certifications: ResumeCertification[];
  achievements: string[];
  languages: ResumeLanguage[];
};

export const SECTION_KEYS = [
  "summary",
  "experience",
  "projects",
  "skills",
  "education",
  "certifications",
  "achievements",
  "languages",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: "Professional Summary",
  experience: "Experience",
  projects: "Projects",
  skills: "Skills",
  education: "Education",
  certifications: "Certifications",
  achievements: "Achievements",
  languages: "Languages",
};

export const DEFAULT_SECTION_ORDER: SectionKey[] = [...SECTION_KEYS];

export const TEMPLATES = [
  {
    id: "ats_classic",
    name: "ATS Classic",
    blurb: "Single column, no graphics, maximum parser compatibility.",
  },
  {
    id: "modern_professional",
    name: "Modern Professional",
    blurb: "Clear hierarchy with an accent rule and confident headings.",
  },
  {
    id: "technical",
    name: "Technical",
    blurb: "Skill-forward layout for engineering, cloud, DevOps and AI roles.",
  },
  { id: "minimal", name: "Minimal", blurb: "Quiet typography, content first." },
  {
    id: "executive",
    name: "Executive",
    blurb: "Serif headings and a leadership-weighted narrative.",
  },
] as const;

export type TemplateId = (typeof TEMPLATES)[number]["id"];

export function isTemplateId(value: unknown): value is TemplateId {
  return TEMPLATES.some((t) => t.id === value);
}

// ---------- normalization -------------------------------------------------

function str(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function strList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(str).filter(Boolean);
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function emptyDoc(): ResumeDoc {
  return {
    header: { fullName: "", headline: "", email: "", phone: "", location: "", links: [] },
    summary: "",
    experience: [],
    projects: [],
    skills: [],
    education: [],
    certifications: [],
    achievements: [],
    languages: [],
  };
}

/** Tolerant coercion of persisted JSON (or partial edits) into a ResumeDoc. */
export function normalizeDoc(input: unknown): ResumeDoc {
  const raw = obj(input);
  const header = obj(raw.header);
  return {
    header: {
      fullName: str(header.fullName),
      headline: str(header.headline),
      email: str(header.email),
      phone: str(header.phone),
      location: str(header.location),
      links: (Array.isArray(header.links) ? header.links : [])
        .map((l) => {
          const link = obj(l);
          return { label: str(link.label), url: str(link.url) };
        })
        .filter((l) => l.url),
    },
    summary: str(raw.summary),
    experience: (Array.isArray(raw.experience) ? raw.experience : []).map((e) => {
      const x = obj(e);
      return {
        role: str(x.role),
        company: str(x.company),
        location: str(x.location),
        employmentType: str(x.employmentType),
        startDate: str(x.startDate),
        endDate: str(x.endDate),
        isCurrent: Boolean(x.isCurrent),
        bullets: strList(x.bullets),
        technologies: strList(x.technologies),
      };
    }),
    projects: (Array.isArray(raw.projects) ? raw.projects : []).map((p) => {
      const x = obj(p);
      return {
        name: str(x.name),
        description: str(x.description),
        technologies: strList(x.technologies),
        bullets: strList(x.bullets),
        githubUrl: str(x.githubUrl),
        liveUrl: str(x.liveUrl),
      };
    }),
    skills: (Array.isArray(raw.skills) ? raw.skills : []).map((s) => {
      const x = obj(s);
      return { category: str(x.category), items: strList(x.items) };
    }),
    education: (Array.isArray(raw.education) ? raw.education : []).map((e) => {
      const x = obj(e);
      return {
        degree: str(x.degree),
        fieldOfStudy: str(x.fieldOfStudy),
        institution: str(x.institution),
        startDate: str(x.startDate),
        endDate: str(x.endDate),
        grade: str(x.grade),
      };
    }),
    certifications: (Array.isArray(raw.certifications) ? raw.certifications : []).map((c) => {
      const x = obj(c);
      return {
        name: str(x.name),
        organization: str(x.organization),
        issueDate: str(x.issueDate),
        credentialId: str(x.credentialId),
        credentialUrl: str(x.credentialUrl),
      };
    }),
    achievements: strList(raw.achievements),
    languages: (Array.isArray(raw.languages) ? raw.languages : []).map((l) => {
      const x = obj(l);
      return { name: str(x.name), proficiency: str(x.proficiency) };
    }),
  };
}

export function normalizeSectionOrder(input: unknown): SectionKey[] {
  const list = strList(input).filter((k): k is SectionKey =>
    (SECTION_KEYS as readonly string[]).includes(k),
  );
  const seen = new Set(list);
  return [...list, ...DEFAULT_SECTION_ORDER.filter((k) => !seen.has(k))];
}

export function sectionIsEmpty(doc: ResumeDoc, key: SectionKey): boolean {
  switch (key) {
    case "summary":
      return !doc.summary;
    case "experience":
      return doc.experience.length === 0;
    case "projects":
      return doc.projects.length === 0;
    case "skills":
      return doc.skills.every((g) => g.items.length === 0);
    case "education":
      return doc.education.length === 0;
    case "certifications":
      return doc.certifications.length === 0;
    case "achievements":
      return doc.achievements.length === 0;
    case "languages":
      return doc.languages.length === 0;
  }
}

// ---------- projection from approved CareerOS data ------------------------

const SKILL_CATEGORY_TITLES: Record<string, string> = {
  programmingLanguages: "Programming Languages",
  programming_languages: "Programming Languages",
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

function titleCase(value: string): string {
  const mapped = SKILL_CATEGORY_TITLES[value];
  if (mapped) return mapped;
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Build a starting document from the user's approved Career Brain data.
 * Only projects existing values — no AI, no invention, no placeholders.
 */
export function docFromSnapshot(snapshot: CareerBrainSnapshot): ResumeDoc {
  const doc = emptyDoc();
  const id = snapshot.identity;
  doc.header.fullName = str(id.fullName);
  doc.header.headline = str(id.currentTitle) || str(id.preferences.preferredRole);
  doc.header.email = str(id.email);
  doc.header.phone = str(id.phone);
  doc.header.location = str(id.location);
  const links: ResumeLink[] = [];
  if (id.links.linkedin) links.push({ label: "LinkedIn", url: str(id.links.linkedin) });
  if (id.links.github) links.push({ label: "GitHub", url: str(id.links.github) });
  if (id.links.portfolio) links.push({ label: "Portfolio", url: str(id.links.portfolio) });
  if (id.links.website) links.push({ label: "Website", url: str(id.links.website) });
  doc.header.links = links;
  doc.summary = str(id.professionalSummary);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (snapshot.experiences ?? []) as any[]) {
    doc.experience.push({
      role: str(row?.role ?? row?.title),
      company: str(row?.company),
      location: str(row?.location),
      employmentType: str(row?.employment_type),
      startDate: str(row?.start_date),
      endDate: str(row?.end_date),
      isCurrent: Boolean(row?.is_current),
      bullets: [...strList(row?.responsibilities), ...strList(row?.achievements)],
      technologies: strList(row?.technologies),
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (snapshot.projects ?? []) as any[]) {
    doc.projects.push({
      name: str(row?.name),
      description: str(row?.description),
      technologies: strList(row?.technologies),
      bullets: [...strList(row?.responsibilities), ...strList(row?.achievements)],
      githubUrl: str(row?.github_url),
      liveUrl: str(row?.live_url ?? row?.demo_url),
    });
  }

  const grouped = new Map<string, string[]>();
  for (const skill of snapshot.skills ?? []) {
    const cat = titleCase(str(skill.category) || "Skills");
    const list = grouped.get(cat) ?? [];
    const name = str(skill.name);
    if (name && !list.includes(name)) list.push(name);
    grouped.set(cat, list);
  }
  doc.skills = [...grouped.entries()].map(([category, items]) => ({ category, items }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (snapshot.education ?? []) as any[]) {
    doc.education.push({
      degree: str(row?.degree),
      fieldOfStudy: str(row?.field_of_study),
      institution: str(row?.institution),
      startDate: str(row?.start_date),
      endDate: str(row?.end_date),
      grade: str(row?.cgpa) || str(row?.percentage) || str(row?.grade),
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (snapshot.certifications ?? []) as any[]) {
    doc.certifications.push({
      name: str(row?.name),
      organization: str(row?.organization ?? row?.issuer),
      issueDate: str(row?.issue_date),
      credentialId: str(row?.credential_id),
      credentialUrl: str(row?.credential_url),
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc.achievements = ((snapshot.achievements ?? []) as any[])
    .map((row) => str(row?.description ?? row?.title))
    .filter(Boolean);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc.languages = ((snapshot.languages ?? []) as any[])
    .map((row) => ({ name: str(row?.name), proficiency: str(row?.proficiency) }))
    .filter((l) => l.name);

  return doc;
}

/** Plain-text projection — used by DOCX/TXT export and AI grounding. */
export function docToPlainText(doc: ResumeDoc, order: SectionKey[]): string {
  const out: string[] = [];
  const h = doc.header;
  if (h.fullName) out.push(h.fullName);
  if (h.headline) out.push(h.headline);
  const contact = [h.email, h.phone, h.location, ...h.links.map((l) => l.url)].filter(Boolean);
  if (contact.length) out.push(contact.join(" | "));
  out.push("");

  for (const key of order) {
    if (sectionIsEmpty(doc, key)) continue;
    out.push(SECTION_LABELS[key].toUpperCase());
    if (key === "summary") out.push(doc.summary);
    if (key === "experience") {
      for (const e of doc.experience) {
        out.push(
          `${e.role}${e.company ? ` — ${e.company}` : ""}${e.location ? ` (${e.location})` : ""}`,
        );
        const dates = [e.startDate, e.isCurrent ? "Present" : e.endDate].filter(Boolean).join(" – ");
        if (dates) out.push(dates);
        for (const b of e.bullets) out.push(`- ${b}`);
        if (e.technologies.length) out.push(`Tech: ${e.technologies.join(", ")}`);
        out.push("");
      }
    }
    if (key === "projects") {
      for (const p of doc.projects) {
        out.push(p.name);
        if (p.description) out.push(p.description);
        for (const b of p.bullets) out.push(`- ${b}`);
        if (p.technologies.length) out.push(`Tech: ${p.technologies.join(", ")}`);
        const urls = [p.githubUrl, p.liveUrl].filter(Boolean);
        if (urls.length) out.push(urls.join(" | "));
        out.push("");
      }
    }
    if (key === "skills") {
      for (const g of doc.skills) {
        if (!g.items.length) continue;
        out.push(`${g.category}: ${g.items.join(", ")}`);
      }
      out.push("");
    }
    if (key === "education") {
      for (const e of doc.education) {
        out.push(
          [e.degree, e.fieldOfStudy].filter(Boolean).join(", ") +
            (e.institution ? ` — ${e.institution}` : ""),
        );
        const meta = [
          [e.startDate, e.endDate].filter(Boolean).join(" – "),
          e.grade,
        ].filter(Boolean);
        if (meta.length) out.push(meta.join(" | "));
        out.push("");
      }
    }
    if (key === "certifications") {
      for (const c of doc.certifications) {
        out.push(
          [c.name, c.organization, c.issueDate].filter(Boolean).join(" — ") +
            (c.credentialUrl ? ` (${c.credentialUrl})` : ""),
        );
      }
      out.push("");
    }
    if (key === "achievements") {
      for (const a of doc.achievements) out.push(`- ${a}`);
      out.push("");
    }
    if (key === "languages") {
      out.push(
        doc.languages
          .map((l) => (l.proficiency ? `${l.name} (${l.proficiency})` : l.name))
          .join(", "),
      );
      out.push("");
    }
    if (key === "summary") out.push("");
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
