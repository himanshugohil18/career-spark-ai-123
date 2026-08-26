/* Temporary verification harness — deleted after the audit. */
import { computeBaselineScores, computeMissingSkills } from "@/lib/jobs/scoring";
import type { NormalizedJob } from "@/lib/jobs/types";

const brain: any = {
  ready: true,
  metadata: {},
  identity: {
    fullName: "Fresher Candidate",
    currentTitle: "DevOps Engineer (Fresher)",
    location: "Ahmedabad, Gujarat, India",
    yearsOfExperience: 0,
    preferences: { preferredRole: "DevOps Engineer", preferredLocation: "Bengaluru, India", expectedSalary: null },
    professionalSummary: "MCA student with cloud/devops projects",
  },
  skills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Linux", "Terraform", "Jenkins", "Git", "Python", "GitHub Actions"].map(
    (name) => ({ category: "devops", name, confidence: 0.9, userVerified: false }),
  ),
  experiences: [],
  projects: [
    { name: "K8s CI/CD platform", description: "Deployed a production Kubernetes cluster on AWS EKS with Terraform and GitHub Actions", technologies: ["AWS", "Kubernetes", "Terraform", "Docker", "GitHub Actions"], responsibilities: ["Built CI/CD pipeline"], achievements: [] },
    { name: "Monitoring stack", description: "Prometheus + Grafana observability for microservices", technologies: ["Prometheus", "Grafana", "Docker"], responsibilities: [], achievements: [] },
  ],
  education: [{ degree: "MCA", institution: "Parul University" }],
  certifications: [{ name: "AWS Certified Cloud Practitioner" }],
  languages: [],
  achievements: [],
  brain: null,
  dna: null,
  health: null,
};

function job(p: Partial<NormalizedJob> & { title: string; experienceLevel: string }): NormalizedJob {
  return {
    title: p.title,
    company: { name: p.company?.name ?? "Acme Cloud", slug: "acme", techStack: ["AWS", "Kubernetes", "Terraform"] } as any,
    location: p.location ?? "Bengaluru, India",
    locationCountry: p.locationCountry ?? "India",
    remoteStatus: p.remoteStatus ?? "onsite",
    employmentType: p.employmentType ?? "full_time",
    experienceLevel: p.experienceLevel,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    description: p.description ?? "We are looking for a DevOps engineer to work on AWS, Docker, Kubernetes, Terraform and CI/CD pipelines.",
    responsibilities: ["Maintain CI/CD", "Manage Kubernetes"],
    requirements: p.requirements ?? ["Experience with AWS", "Bachelor degree"],
    requiredSkills: p.requiredSkills ?? ["AWS", "Docker", "Kubernetes", "CI/CD", "Linux", "Terraform"],
    preferredSkills: ["Prometheus", "Grafana"],
    benefits: [],
    applicationUrl: "https://example.com/apply",
    provider: "greenhouse",
    sourceId: p.title,
    postedAt: new Date().toISOString(),
    expiresAt: null,
    rawPayload: {},
  } as NormalizedJob;
}

const cases: NormalizedJob[] = [
  job({ title: "DevOps Intern", experienceLevel: "intern", requirements: ["0-1 years", "Bachelor degree"] }),
  job({ title: "Junior DevOps Engineer", experienceLevel: "junior", requirements: ["1 years experience"] }),
  job({ title: "Associate Cloud Engineer", experienceLevel: "entry", requirements: ["0-2 years experience"] }),
  job({ title: "Entry-Level Site Reliability Engineer", experienceLevel: "entry", requirements: ["fresh graduates welcome"] }),
  job({ title: "DevOps Engineer", experienceLevel: "mid", requirements: ["3-5 years experience"] }),
  job({ title: "Senior DevOps Engineer", experienceLevel: "senior", requirements: ["5+ years of experience"] }),
  job({ title: "Principal Platform Engineer", experienceLevel: "principal", requirements: ["12+ years of experience"] }),
  job({ title: "Cloud Architect", experienceLevel: "lead", requirements: ["10+ years of experience"] }),
  // Location variants (same mid-level role)
  job({ title: "Cloud Engineer", experienceLevel: "entry", location: "Bengaluru, India" }),
  job({ title: "Cloud Engineer", experienceLevel: "entry", location: "Pune, India" }),
  job({ title: "Cloud Engineer", experienceLevel: "entry", location: "Ahmedabad, India" }),
  job({ title: "Cloud Engineer", experienceLevel: "entry", location: "Remote, India", remoteStatus: "remote" }),
  job({ title: "Cloud Engineer", experienceLevel: "entry", location: "Remote (US only)", locationCountry: "United States", remoteStatus: "remote" }),
  job({ title: "Cloud Engineer", experienceLevel: "entry", location: "Berlin, Germany", locationCountry: "Germany" }),
  // Off-track control
  job({ title: "Enterprise Sales Manager", experienceLevel: "mid", requiredSkills: ["Salesforce", "Negotiation"], description: "Own quota, close deals." }),
];

for (const j of cases) {
  const s = computeBaselineScores(brain, j);
  console.log(
    `${String(s.overall).padStart(3)} | ${j.title.padEnd(42)} lvl=${j.experienceLevel.padEnd(9)} loc=${(j.location ?? "").padEnd(20)} tier=${s.seniorityTier} sen=${s.seniority} exp=${s.experience} skill=${s.skill} loc=${s.location} rel=${s.relevance.toFixed(2)} stretch=${s.stretch} reqYrs=${s.requiredYears}`,
  );
}
console.log("missing skills sample:", computeMissingSkills(brain, cases[5]));
console.log("--- reasons ---");
for (const j of cases.slice(0,6)) {
  const s = computeBaselineScores(brain, j);
  console.log(j.title, "|", s.overall, "| gate:", s.relevant, "|", s.relevanceReason, "| familyFit:", s.familyFit);
}
