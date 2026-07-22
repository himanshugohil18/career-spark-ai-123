/**
 * DEV-only fallback: seeds a handful of realistic jobs directly into the DB
 * when live providers return zero rows. Never invoked in production.
 * The seeded rows carry provider="devseed" so they can be identified and
 * cleaned out later if needed.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { SupabaseClient } from "@supabase/supabase-js";
import { computeFingerprint, slugify } from "./fingerprint";

const SEEDS = [
  // ---- Cloud / DevOps / SRE / Platform / Infrastructure (broad company mix) ----
  { title: "Senior DevOps Engineer", company: "HashiCorp", location: "Remote (US)", remote: "remote", experience: "senior", salaryMin: 180000, salaryMax: 240000, skills: ["terraform","aws","kubernetes","vault","ci/cd"], description: "Ship the tools every DevOps team relies on." },
  { title: "Staff DevOps Engineer", company: "Cloudflare", location: "Austin, TX", remote: "hybrid", experience: "staff", salaryMin: 210000, salaryMax: 285000, skills: ["kubernetes","terraform","aws","gcp","go","ci/cd"], description: "Own our multi-region deployment pipeline." },
  { title: "Site Reliability Engineer", company: "Discord", location: "Remote (US)", remote: "remote", experience: "senior", salaryMin: 190000, salaryMax: 250000, skills: ["go","kubernetes","prometheus","cassandra","linux"], description: "Keep voice, video, and chat online for millions." },
  { title: "Platform Engineer", company: "Instacart", location: "Toronto, Canada", remote: "hybrid", experience: "mid", salaryMin: 140000, salaryMax: 190000, skills: ["python","kubernetes","aws","terraform","helm"], description: "Grow the internal platform behind every order." },
  { title: "Cloud Engineer", company: "Datadog", location: "New York, NY", remote: "hybrid", experience: "mid", salaryMin: 160000, salaryMax: 210000, skills: ["aws","gcp","terraform","kubernetes","observability"], description: "Scale the observability platform." },
  { title: "Kubernetes Platform Engineer", company: "Rancher Labs", location: "Remote (Worldwide)", remote: "remote", experience: "senior", salaryMin: 175000, salaryMax: 235000, skills: ["kubernetes","helm","istio","go","linux"], description: "Build Kubernetes distributions used by enterprises." },
  { title: "Infrastructure Engineer", company: "Reddit", location: "Remote (US)", remote: "remote", experience: "senior", salaryMin: 195000, salaryMax: 265000, skills: ["aws","terraform","kubernetes","python","linux"], description: "Own core infrastructure powering the front page." },
  { title: "DevOps Engineer", company: "Grafana Labs", location: "Remote (EU)", remote: "remote", experience: "mid", salaryMin: 130000, salaryMax: 175000, skills: ["kubernetes","prometheus","grafana","terraform","aws"], description: "Ship Grafana Cloud infrastructure." },
  { title: "Senior SRE", company: "Snowflake", location: "Remote (US)", remote: "remote", experience: "senior", salaryMin: 210000, salaryMax: 275000, skills: ["aws","gcp","kubernetes","terraform","observability"], description: "Keep the data cloud reliable at petabyte scale." },
  { title: "DevSecOps Engineer", company: "GitLab", location: "Remote (Worldwide)", remote: "remote", experience: "senior", salaryMin: 175000, salaryMax: 230000, skills: ["security","kubernetes","terraform","ci/cd","aws"], description: "Bake security into every pipeline." },
  { title: "CI/CD Engineer", company: "CircleCI", location: "Remote (US)", remote: "remote", experience: "mid", salaryMin: 140000, salaryMax: 185000, skills: ["ci/cd","docker","kubernetes","go","aws"], description: "Own the build pipeline used by thousands." },
  { title: "Cloud Operations Engineer", company: "MongoDB", location: "Dublin, Ireland", remote: "hybrid", experience: "senior", salaryMin: 130000, salaryMax: 175000, skills: ["aws","gcp","kubernetes","terraform","linux"], description: "Run Atlas across every major cloud." },
  { title: "AWS Solutions Engineer", company: "Vercel", location: "Remote (US)", remote: "remote", experience: "senior", salaryMin: 180000, salaryMax: 240000, skills: ["aws","terraform","cloudfront","lambda","cdn"], description: "Design the AWS edge behind millions of deployments." },
  { title: "Linux Systems Engineer", company: "Red Hat", location: "Remote (US)", remote: "remote", experience: "mid", salaryMin: 140000, salaryMax: 180000, skills: ["linux","ansible","bash","systemd","networking"], description: "Deep-Linux work on OpenShift infrastructure." },
  { title: "GitOps Engineer", company: "Argo (Intuit)", location: "Mountain View, CA", remote: "hybrid", experience: "senior", salaryMin: 185000, salaryMax: 245000, skills: ["kubernetes","argocd","gitops","helm","go"], description: "Advance the Argo CD ecosystem." },
  { title: "Cloud Security Engineer", company: "Snowflake", location: "Remote (US)", remote: "remote", experience: "senior", salaryMin: 200000, salaryMax: 260000, skills: ["aws","gcp","security","iam","terraform"], description: "Defend the data cloud." },
  { title: "Staff Platform Engineer", company: "Stripe", location: "Remote (Worldwide)", remote: "remote", experience: "staff", salaryMin: 240000, salaryMax: 320000, skills: ["kubernetes","aws","terraform","go","ruby"], description: "Own foundational compute at payment scale." },
  { title: "Production Engineer", company: "Cloudflare", location: "London, UK", remote: "hybrid", experience: "senior", salaryMin: 130000, salaryMax: 175000, skills: ["linux","go","kubernetes","observability","networking"], description: "Keep the edge network flawless." },
  { title: "Automation Engineer", company: "Confluent", location: "Remote (US)", remote: "remote", experience: "mid", salaryMin: 150000, salaryMax: 195000, skills: ["python","ansible","terraform","aws","kafka"], description: "Automate everything around Kafka Cloud." },
  { title: "Engineering Manager, Infrastructure", company: "DoorDash", location: "San Francisco, CA", remote: "hybrid", experience: "lead", salaryMin: 240000, salaryMax: 320000, skills: ["leadership","kubernetes","go","observability"], description: "Lead the platform team behind logistics at scale." },

  // ---- Backend / Full-stack / Frontend (broad mix) ----
  { title: "Senior Full-Stack Engineer", company: "Vercel", location: "Remote (US)", remote: "remote", experience: "senior", salaryMin: 180000, salaryMax: 240000, skills: ["typescript","react","nextjs","node","postgres","aws"], description: "Build the platform powering the modern web." },
  { title: "Backend Engineer, Payments", company: "Stripe", location: "Remote (Worldwide)", remote: "remote", experience: "mid", salaryMin: 160000, salaryMax: 220000, skills: ["ruby","rails","postgres","kafka","typescript"], description: "Ledger, settlements, and financial primitives." },
  { title: "Frontend Engineer", company: "Linear", location: "Remote (EU)", remote: "remote", experience: "mid", salaryMin: 130000, salaryMax: 180000, skills: ["typescript","react","graphql","design systems"], description: "Craft the fastest issue tracker on the internet." },
  { title: "Full-Stack Engineer", company: "Retool", location: "Remote (Worldwide)", remote: "remote", experience: "mid", salaryMin: 155000, salaryMax: 210000, skills: ["typescript","react","node","postgres"], description: "Build the platform for internal tools." },
  { title: "Senior Backend Engineer", company: "Brex", location: "Remote (US)", remote: "remote", experience: "senior", salaryMin: 175000, salaryMax: 230000, skills: ["kotlin","postgres","kafka","aws"], description: "Financial services for high-growth companies." },
  { title: "Junior Full-Stack Developer", company: "Plaid", location: "Remote (US)", remote: "remote", experience: "junior", salaryMin: 110000, salaryMax: 140000, skills: ["typescript","react","node","postgres"], description: "Ship features across the fintech stack." },
  { title: "Growth Engineer", company: "PostHog", location: "Remote (Worldwide)", remote: "remote", experience: "mid", salaryMin: 130000, salaryMax: 175000, skills: ["typescript","react","posthog","sql","experimentation"], description: "Own experiments across the acquisition funnel." },

  // ---- ML / AI / Data ----
  { title: "AI Engineer", company: "OpenAI", location: "San Francisco, CA", remote: "onsite", experience: "senior", salaryMin: 230000, salaryMax: 350000, skills: ["python","pytorch","llm","rag","vector databases"], description: "Ship applied research into production models." },
  { title: "ML Platform Engineer", company: "Anthropic", location: "San Francisco, CA", remote: "hybrid", experience: "senior", salaryMin: 240000, salaryMax: 330000, skills: ["python","kubernetes","gpu","triton","observability"], description: "Design the systems that train and serve Claude." },
  { title: "Data Engineer", company: "Airbnb", location: "Remote (US)", remote: "remote", experience: "mid", salaryMin: 165000, salaryMax: 215000, skills: ["airflow","spark","dbt","sql","python"], description: "Build the data platform behind global travel." },
  { title: "Data Scientist", company: "Notion", location: "Remote (Worldwide)", remote: "remote", experience: "mid", salaryMin: 150000, salaryMax: 210000, skills: ["python","sql","causal inference","experimentation"], description: "Drive product decisions with rigorous analytics." },
  { title: "Machine Learning Researcher", company: "Replicate", location: "Remote (Worldwide)", remote: "remote", experience: "senior", salaryMin: 200000, salaryMax: 280000, skills: ["python","pytorch","diffusion","cuda"], description: "Make it easy to run any ML model in the cloud." },

  // ---- Mobile / Design / Product ----
  { title: "iOS Engineer", company: "Spotify", location: "Stockholm, Sweden", remote: "hybrid", experience: "senior", salaryMin: 120000, salaryMax: 165000, skills: ["swift","swiftui","xcode","combine"], description: "Ship the client used by 600M+ listeners." },
  { title: "Product Designer", company: "Ramp", location: "New York, NY", remote: "hybrid", experience: "senior", salaryMin: 170000, salaryMax: 220000, skills: ["figma","design systems","research","prototyping"], description: "Design finance tooling that finance teams love." },
  { title: "Product Manager, AI", company: "Palantir", location: "New York, NY", remote: "onsite", experience: "senior", salaryMin: 210000, salaryMax: 280000, skills: ["ai","product management","enterprise"], description: "Own the roadmap for AI-powered ontology tooling." },
];

export async function seedDevJobs(supabase: SupabaseClient): Promise<{ inserted: number }> {
  let inserted = 0;
  for (const s of SEEDS) {
    const slug = slugify(s.company);
    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    let companyId: string | null = (existing?.id as string) ?? null;
    if (!companyId) {
      const { data: inserted } = await supabase
        .from("companies")
        .insert({
          name: s.company,
          slug,
          tech_stack: s.skills,
          description: null,
        })
        .select("id")
        .maybeSingle();
      companyId = (inserted?.id as string) ?? null;
    }

    const fp = computeFingerprint({
      company: s.company,
      title: s.title,
      location: s.location,
      description: s.description,
    });

    const { data: exists } = await supabase.from("jobs").select("id").eq("fingerprint", fp).maybeSingle();
    if (exists?.id) continue;

    const nowIso = new Date().toISOString();
    const payload = {
      title: s.title,
      company_id: companyId,
      location: s.location,
      location_country: null,
      remote_status: s.remote,
      employment_type: "full_time",
      experience_level: s.experience,
      salary_min: s.salaryMin,
      salary_max: s.salaryMax,
      salary_currency: "USD",
      description: `<p>${s.description}</p>`,
      responsibilities: [],
      requirements: [],
      required_skills: s.skills,
      preferred_skills: [],
      benefits: [],
      application_url: `https://example.com/${slug}/${slugify(s.title)}`,
      provider: "devseed",
      source_id: `${slug}-${slugify(s.title)}`,
      posted_at: nowIso,
      expires_at: null,
      fingerprint: fp,
      raw_payload: null,
      first_seen_at: nowIso,
      last_seen_at: nowIso,
      is_active: true,
    };
    const { error } = await supabase.from("jobs").insert(payload);
    if (!error) inserted++;
  }
  return { inserted };
}
