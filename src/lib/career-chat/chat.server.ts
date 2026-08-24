/**
 * Grounded AI career assistant.
 *
 * Every answer is grounded in the signed-in user's own data: Career Brain,
 * live matched jobs, saved-job pipeline and resume versions. The model is
 * told to say it does not know rather than to guess, and the grounding
 * payload used for each answer is persisted alongside the message.
 */

import { callLovableAI } from "@/lib/ai-gateway.server";
import { getCareerBrainSnapshotFor } from "@/lib/career-brain-logic.server";

const MODEL = "google/gemini-3-flash-preview";

export type ChatGrounding = {
  brainReady: boolean;
  profile: Record<string, unknown>;
  topMatches: Array<Record<string, unknown>>;
  pipeline: Array<Record<string, unknown>>;
  resumes: Array<Record<string, unknown>>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildGrounding(supabase: any, userId: string): Promise<ChatGrounding> {
  const brain = await getCareerBrainSnapshotFor(supabase, userId);

  const [matches, saved, resumes] = await Promise.all([
    supabase
      .from("job_matches")
      .select(
        "overall_score, skill_score, experience_score, missing_skills, jobs(title, location, remote_status, required_skills, companies(name))",
      )
      .eq("user_id", userId)
      .order("overall_score", { ascending: false })
      .limit(8),
    supabase
      .from("saved_jobs")
      .select("status, applied_at, follow_up_at, updated_at, jobs(title, companies(name))")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("resume_versions")
      .select("version_name, template, ats_score, target_job_title, target_company, is_default, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  return {
    brainReady: brain.ready,
    profile: {
      name: brain.identity.fullName,
      title: brain.identity.currentTitle,
      yearsOfExperience: brain.identity.yearsOfExperience,
      location: brain.identity.location,
      preferredRole: brain.identity.preferences.preferredRole,
      preferredLocation: brain.identity.preferences.preferredLocation,
      expectedSalary: brain.identity.preferences.expectedSalary,
      summary: brain.identity.professionalSummary,
      skills: brain.skills.slice(0, 40).map((s) => s.name),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      experience: (brain.experiences as any[]).slice(0, 6).map((e) => ({
        role: e?.role ?? e?.title,
        company: e?.company,
        start: e?.start_date,
        end: e?.is_current ? "present" : e?.end_date,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      projects: (brain.projects as any[]).slice(0, 6).map((p) => ({
        name: p?.name,
        technologies: p?.technologies ?? [],
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      education: (brain.education as any[]).map((e) => ({
        degree: e?.degree,
        field: e?.field_of_study,
        institution: e?.institution,
        end: e?.end_date,
      })),
      completeness: brain.metadata.completenessScore,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    topMatches: (matches.data ?? []).map((m: any) => ({
      title: m?.jobs?.title,
      company: m?.jobs?.companies?.name,
      location: m?.jobs?.location,
      remote: m?.jobs?.remote_status,
      score: m?.overall_score,
      missingSkills: (m?.missing_skills ?? []).slice(0, 6),
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pipeline: (saved.data ?? []).map((s: any) => ({
      title: s?.jobs?.title,
      company: s?.jobs?.companies?.name,
      status: s?.status,
      appliedAt: s?.applied_at,
      followUpAt: s?.follow_up_at,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resumes: (resumes.data ?? []).map((r: any) => ({
      name: r?.version_name,
      template: r?.template,
      atsScore: r?.ats_score,
      targetRole: r?.target_job_title,
      targetCompany: r?.target_company,
      isDefault: r?.is_default,
    })),
  };
}

const SYSTEM = [
  "You are the CareerOS career assistant for one signed-in user.",
  "You are given that user's real CareerOS data as GROUNDING. Answer only from it plus general, well-established career knowledge.",
  "RULES:",
  "1. Never invent jobs, companies, match scores, salaries, dates or skills that are not in the grounding.",
  "2. If the grounding lacks the answer, say exactly what is missing and which CareerOS action would fix it (upload/approve resume, run job discovery, complete profile fields).",
  "3. Be specific and concrete: name the actual roles, companies and scores from the grounding when relevant.",
  "4. Keep answers tight — under 220 words unless the user asks for a deep breakdown. Use short markdown sections or bullets.",
  "5. Never claim to have taken an action in the app; you can only advise.",
  "6. No salary guarantees, no legal claims, no fabricated market statistics.",
].join("\n");

export const CHAT_STARTERS = [
  "Which of my matched jobs should I apply to first, and why?",
  "What skills am I missing most across my top matches?",
  "Review my strongest resume for ATS problems.",
  "What should I do this week to move my pipeline forward?",
] as const;

export async function answerCareerQuestion(opts: {
  grounding: ChatGrounding;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  question: string;
}): Promise<{ answer: string; model: string }> {
  const answer = await callLovableAI({
    model: MODEL,
    temperature: 0.4,
    maxTokens: 1200,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "system", content: `GROUNDING:\n${JSON.stringify(opts.grounding)}` },
      ...opts.history.slice(-12),
      { role: "user", content: opts.question },
    ],
  });
  return { answer: answer.trim(), model: MODEL };
}
