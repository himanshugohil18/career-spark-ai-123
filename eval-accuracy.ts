/**
 * Accuracy measurement: independent AI ground-truth labelling of the feed.
 * Not part of the app — used to report matching accuracy.
 */
import { readFileSync, writeFileSync } from "fs";
import { callLovableAI, extractJson } from "@/lib/ai-gateway.server";
import { buildProfileFromSnapshot } from "@/lib/jobs/role-synonyms";
import { computeRelevance, brainTechVocabulary, jobDedupeKey } from "@/lib/jobs/relevance";
import { computeBaselineScores } from "@/lib/jobs/scoring";

const jobs = JSON.parse(readFileSync("/tmp/eval/jobs.json", "utf8")) as any[];
const users = JSON.parse(readFileSync("/tmp/eval/users.json", "utf8")) as any[];

function toBrain(u: any) {
  return {
    userId: u.user_id, ready: true, metadata: { brainVersion: 1 },
    identity: {
      fullName: "Candidate", currentTitle: u.current_title, location: null,
      yearsOfExperience: u.years_of_experience,
      preferences: { preferredRole: u.preferred_role, preferredLocation: u.preferred_location, expectedSalary: null },
      professionalSummary: u.professional_summary,
    },
    skills: (u.skills ?? []).map((s: any) => ({ name: s.name, category: s.category, userVerified: s.userVerified })),
    projects: u.projects ?? [], experiences: u.experiences ?? [], education: u.education ?? [],
    certifications: [], dna: null,
  } as any;
}
function toJob(row: any) {
  return {
    title: row.title,
    company: { name: row.company?.name ?? "", slug: "", domain: null, logoUrl: null, website: null,
      industry: row.company?.industry ?? null, size: null, remotePolicy: null,
      techStack: Array.isArray(row.company?.tech_stack) ? row.company.tech_stack : [], description: null },
    location: row.location, locationCountry: null, remoteStatus: row.remote_status,
    employmentType: row.employment_type, experienceLevel: row.experience_level,
    salaryMin: row.salary_min, salaryMax: row.salary_max, salaryCurrency: row.salary_currency,
    description: row.description ?? "", responsibilities: row.responsibilities ?? [],
    requirements: row.requirements ?? [], requiredSkills: row.required_skills ?? [],
    preferredSkills: row.preferred_skills ?? [], benefits: [], applicationUrl: "",
    provider: "", sourceId: "", postedAt: row.posted_at, expiresAt: null,
  } as any;
}

const JUDGE = `You are an independent senior technical recruiter grading a job-recommendation engine.
For each numbered job, answer: would you send this job to this candidate as a genuinely relevant opportunity they could apply to today?
Answer 1 = relevant (same job function/role family as the candidate's background, technology overlap, seniority reachable).
Answer 0 = not relevant (different job function, or almost no technology overlap, or far above their level).
Return STRICT JSON: {"labels":[{"i":0,"label":1},...]} with one entry per job.`;

async function label(candidate: any, items: any[]): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  for (let off = 0; off < items.length; off += 20) {
    const slice = items.slice(off, off + 20);
    const raw = await callLovableAI({
      model: "openai/gpt-5.4-mini",
      responseFormat: "json_object",
      messages: [
        { role: "system", content: JUDGE },
        { role: "user", content: JSON.stringify({ candidate, jobs: slice.map((j, i) => ({ i, title: j.title, requiredSkills: (j.required_skills ?? []).slice(0, 15), summary: String(j.description ?? "").slice(0, 500) })) }) },
      ],
    });
    try {
      const parsed = JSON.parse(extractJson(raw));
      for (const l of parsed.labels ?? []) if (l.i >= 0 && l.i < slice.length) map.set(off + l.i, Number(l.label) ? 1 : 0);
    } catch { /* skip batch */ }
  }
  return map;
}

const report: any[] = [];

for (const u of users) {
  const brain = toBrain(u);
  const profile = buildProfileFromSnapshot(brain);
  const techs = brainTechVocabulary(brain);

  const scored = jobs.map((row) => {
    const jobLike = {
      title: row.title, description: row.description ?? "",
      requiredSkills: row.required_skills ?? [], preferredSkills: row.preferred_skills ?? [],
      companyTechStack: Array.isArray(row.company?.tech_stack) ? row.company.tech_stack : [],
      responsibilities: row.responsibilities ?? [], requirements: row.requirements ?? [],
    };
    const rel = computeRelevance(jobLike, profile, techs);
    const s = computeBaselineScores(brain, toJob(row));
    return { row, rel, score: s.overall };
  });

  const seen = new Set<string>();
  const feed = scored
    .filter((x) => x.rel.gate)
    .sort((a, b) => b.score - a.score)
    .filter((x) => {
      const k = jobDedupeKey(x.row.title, x.row.company?.name);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  const rejected = scored.filter((x) => !x.rel.gate);
  const sample = <T,>(arr: T[], n: number) => {
    const copy = arr.slice();
    const out: T[] = [];
    for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    return out;
  };

  const candidate = {
    title: u.current_title, preferredRole: u.preferred_role, years: u.years_of_experience,
    skills: (u.skills ?? []).map((s: any) => s.name),
    projects: (u.projects ?? []).map((p: any) => ({ name: p.name, tech: p.technologies })),
  };

  const top20 = feed.slice(0, 20).map((x) => x.row);
  const rejSample = sample(rejected, 40).map((x) => x.row);

  const [labTop, labRej] = await Promise.all([label(candidate, top20), label(candidate, rejSample)]);

  const topLabels = [...labTop.values()];
  const rejLabels = [...labRej.values()];
  const precision = topLabels.length ? topLabels.filter((v) => v === 1).length / topLabels.length : null;
  const falseRejectRate = rejLabels.length ? rejLabels.filter((v) => v === 1).length / rejLabels.length : null;

  report.push({
    user: u.current_title,
    poolSize: jobs.length,
    feedSize: feed.length,
    judgedTop: topLabels.length,
    precisionTop20: precision,
    judgedRejected: rejLabels.length,
    falseRejectRate,
    misses: top20.filter((_, i) => labTop.get(i) === 0).map((r) => r.title),
  });
}

writeFileSync("/tmp/eval/report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
