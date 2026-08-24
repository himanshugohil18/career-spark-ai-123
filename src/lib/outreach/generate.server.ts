/**
 * Outreach generation — recruiter DMs, cold emails, referral requests,
 * follow-ups and thank-you notes, grounded in the user's Career Brain and
 * (optionally) a specific job.
 *
 * Truthfulness rule: the model may only use facts supplied here. It must
 * never invent employers, metrics, mutual connections or shared history.
 */

import { callLovableAI, extractJson } from "@/lib/ai-gateway.server";
import { getCareerBrainSnapshotFor } from "@/lib/career-brain-logic.server";

const MODEL = "google/gemini-3-flash-preview";

export const OUTREACH_KINDS = [
  "recruiter_dm",
  "cold_email",
  "referral_request",
  "follow_up",
  "thank_you",
] as const;
export type OutreachKind = (typeof OUTREACH_KINDS)[number];

export const OUTREACH_TONES = [
  "professional",
  "warm",
  "direct",
  "enthusiastic",
  "formal",
] as const;
export type OutreachTone = (typeof OUTREACH_TONES)[number];

export const KIND_META: Record<OutreachKind, { label: string; hint: string; channel: string; maxWords: number }> = {
  recruiter_dm: {
    label: "Recruiter DM",
    hint: "Short LinkedIn message to a recruiter about a specific role.",
    channel: "LinkedIn",
    maxWords: 110,
  },
  cold_email: {
    label: "Cold email",
    hint: "Intro email to a hiring manager or team lead.",
    channel: "Email",
    maxWords: 180,
  },
  referral_request: {
    label: "Referral request",
    hint: "Ask someone at the company for an internal referral.",
    channel: "LinkedIn / Email",
    maxWords: 140,
  },
  follow_up: {
    label: "Application follow-up",
    hint: "Polite nudge after applying or interviewing.",
    channel: "Email",
    maxWords: 130,
  },
  thank_you: {
    label: "Interview thank-you",
    hint: "Post-interview note reinforcing fit.",
    channel: "Email",
    maxWords: 140,
  },
};

export type OutreachJob = {
  id: string;
  title: string;
  companyName: string | null;
  location: string | null;
  requiredSkills: string[];
  description: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadOutreachJob(supabase: any, jobId: string): Promise<OutreachJob> {
  const r = await supabase
    .from("jobs")
    .select("id, title, location, required_skills, description, companies(name)")
    .eq("id", jobId)
    .maybeSingle();
  if (r.error) throw new Error(`Could not load job: ${r.error.message}`);
  if (!r.data) throw new Error("Job not found.");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = r.data as any;
  return {
    id: row.id,
    title: row.title ?? "",
    companyName: row.companies?.name ?? null,
    location: row.location ?? null,
    requiredSkills: row.required_skills ?? [],
    description: row.description ?? null,
  };
}

export type GeneratedOutreach = { subject: string | null; body: string; model: string };

export async function generateOutreach(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  userId: string;
  kind: OutreachKind;
  tone: OutreachTone;
  recipient?: string | null;
  job?: OutreachJob | null;
  extraContext?: string | null;
}): Promise<GeneratedOutreach> {
  const brain = await getCareerBrainSnapshotFor(opts.supabase, opts.userId);
  const meta = KIND_META[opts.kind];

  const candidate = {
    name: brain.identity.fullName,
    title: brain.identity.currentTitle,
    yearsOfExperience: brain.identity.yearsOfExperience,
    location: brain.identity.location,
    summary: brain.identity.professionalSummary,
    topSkills: brain.skills.slice(0, 24).map((s) => s.name),
    links: brain.identity.links,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    experience: (brain.experiences as any[]).slice(0, 4).map((e) => ({
      role: e?.role ?? e?.title,
      company: e?.company,
      start: e?.start_date,
      end: e?.is_current ? "present" : e?.end_date,
      highlights: (e?.achievements ?? []).slice(0, 3),
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    projects: (brain.projects as any[]).slice(0, 4).map((p) => ({
      name: p?.name,
      description: p?.description,
      technologies: p?.technologies ?? [],
    })),
  };

  const needsSubject = opts.kind !== "recruiter_dm";

  const raw = await callLovableAI({
    model: MODEL,
    responseFormat: "json_object",
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content: [
          `You write ${meta.label.toLowerCase()} messages for job seekers. Channel: ${meta.channel}.`,
          "RULES:",
          "1. Use ONLY the supplied candidate facts. Never invent employers, metrics, mutual connections, referrals or prior conversations.",
          "2. No flattery filler, no 'I hope this email finds you well', no em-dash-heavy corporate prose.",
          `3. Hard limit ${meta.maxWords} words in the body.`,
          "4. Reference 1-2 concrete, supplied proof points relevant to the role.",
          "5. End with one clear, low-friction ask.",
          `6. Tone: ${opts.tone}.`,
          needsSubject
            ? 'Return JSON: {"subject":"...","body":"..."}'
            : 'Return JSON: {"subject":null,"body":"..."}',
          "Body must be plain text with \\n line breaks, no markdown.",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify({
          candidate,
          recipient: opts.recipient || null,
          job: opts.job
            ? {
                title: opts.job.title,
                company: opts.job.companyName,
                location: opts.job.location,
                requiredSkills: opts.job.requiredSkills.slice(0, 20),
                description: (opts.job.description ?? "").slice(0, 3000),
              }
            : null,
          extraContext: opts.extraContext || null,
        }),
      },
    ],
  });

  let parsed: { subject?: unknown; body?: unknown } = {};
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    parsed = { body: raw };
  }
  const body = String(parsed.body ?? "").trim();
  if (!body) throw new Error("AI returned an empty message. Please try again.");
  const subject =
    needsSubject && typeof parsed.subject === "string" && parsed.subject.trim()
      ? parsed.subject.trim().slice(0, 200)
      : null;
  return { subject, body, model: MODEL };
}
