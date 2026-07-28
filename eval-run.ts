/* Offline accuracy harness for the CareerOS matching engine. */
import { readFileSync, existsSync, writeFileSync } from "fs";
import { computeBaselineScores } from "@/lib/jobs/scoring";
import { buildProfileFromSnapshot, jobFamilyFitProfile } from "@/lib/jobs/role-synonyms";

const jobs = JSON.parse(readFileSync("/tmp/eval/jobs.json", "utf8")) as any[];
const users = JSON.parse(readFileSync("/tmp/eval/users.json", "utf8")) as any[];
const labels: Record<string, Record<string, number>> = existsSync("/tmp/eval/labels.json")
  ? JSON.parse(readFileSync("/tmp/eval/labels.json", "utf8"))
  : {};

function toBrain(u: any) {
  return {
    userId: u.user_id,
    ready: true,
    metadata: { brainVersion: 1 },
    identity: {
      fullName: "Candidate",
      currentTitle: u.current_title,
      location: null,
      yearsOfExperience: u.years_of_experience,
      preferences: {
        preferredRole: u.preferred_role,
        preferredLocation: u.preferred_location,
        expectedSalary: null,
      },
      professionalSummary: u.professional_summary,
    },
    skills: (u.skills ?? []).map((s: any) => ({ name: s.name, category: s.category, userVerified: s.userVerified })),
    projects: u.projects ?? [],
    experiences: u.experiences ?? [],
    education: u.education ?? [],
    certifications: [],
    dna: null,
  } as any;
}

function toJob(row: any) {
  return {
    title: row.title,
    company: {
      name: row.company?.name ?? "",
      slug: "",
      domain: null,
      logoUrl: null,
      website: null,
      industry: row.company?.industry ?? null,
      size: null,
      remotePolicy: null,
      techStack: Array.isArray(row.company?.tech_stack) ? row.company.tech_stack : [],
      description: null,
    },
    location: row.location,
    locationCountry: null,
    remoteStatus: row.remote_status,
    employmentType: row.employment_type,
    experienceLevel: row.experience_level,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    salaryCurrency: row.salary_currency,
    description: row.description ?? "",
    responsibilities: row.responsibilities ?? [],
    requirements: row.requirements ?? [],
    requiredSkills: row.required_skills ?? [],
    preferredSkills: row.preferred_skills ?? [],
    benefits: [],
    applicationUrl: "",
    provider: "",
    sourceId: "",
    postedAt: row.posted_at,
    expiresAt: null,
  } as any;
}

const out: any = { users: [] };

for (const u of users) {
  const brain = toBrain(u);
  const profile = buildProfileFromSnapshot(brain);
  const scored = jobs.map((row) => {
    const job = toJob(row);
    const s = computeBaselineScores(brain, job);
    const fit = jobFamilyFitProfile(
      {
        title: row.title,
        description: row.description ?? "",
        requiredSkills: row.required_skills ?? [],
        preferredSkills: row.preferred_skills ?? [],
        companyTechStack: Array.isArray(row.company?.tech_stack) ? row.company.tech_stack : [],
        responsibilities: row.responsibilities ?? [],
        requirements: row.requirements ?? [],
      },
      profile,
    );
    return { id: row.id, title: row.title, score: s.overall, fit: fit.fit, excluded: fit.excluded };
  });
  // Feed simulation: same filter as listJobs default (no query).
  const feed = scored
    .filter((x) => !x.excluded && x.fit >= 0.4 && x.score >= 40)
    .sort((a, b) => b.score - a.score);

  const lab = labels[u.user_id] ?? {};
  const labelled = (arr: typeof feed) => arr.filter((x) => lab[x.id] !== undefined);
  const prec = (arr: typeof feed) => {
    const l = labelled(arr);
    if (!l.length) return null;
    return l.filter((x) => lab[x.id] === 1).length / l.length;
  };
  const relevantTotal = Object.values(lab).filter((v) => v === 1).length;
  const recall = relevantTotal
    ? feed.filter((x) => lab[x.id] === 1).length / relevantTotal
    : null;

  out.users.push({
    user: u.current_title,
    userId: u.user_id,
    families: profile.families.map((f: any) => f.id),
    feedSize: feed.length,
    top20: feed.slice(0, 20).map((x) => `${x.score}  ${x.title}`),
    precisionTop10: prec(feed.slice(0, 10)),
    precisionTop20: prec(feed.slice(0, 20)),
    precisionFeed: prec(feed),
    recall,
    labelledCount: Object.keys(lab).length,
  });
  writeFileSync(`/tmp/eval/feed-${u.user_id}.json`, JSON.stringify(scored, null, 0));
}

console.log(JSON.stringify(out, null, 2));
