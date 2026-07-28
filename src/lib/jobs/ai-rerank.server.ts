/**
 * AI re-ranking layer for job matching.
 *
 * The deterministic engine (scoring + relevance) decides WHICH jobs are on
 * the candidate's career track. This layer asks the model to judge the
 * shortlist semantically — "is this actually the same job the candidate can
 * do today?" — in ONE batched call per 25 jobs, so a full refresh costs two
 * requests instead of forty.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { z } from "zod";
import { callLovableAI, extractJson } from "@/lib/ai-gateway.server";
import type { CareerBrainSnapshot } from "@/lib/career-brain.service";

const MODEL = "google/gemini-3.6-flash";
const BATCH_SIZE = 15;
const TIMEOUT_MS = 20_000;

export type AiVerdict = {
  score: number;
  verdict: "strong" | "possible" | "stretch" | "irrelevant";
  reason: string;
};

const ItemSchema = z.object({
  i: z.number().int(),
  score: z.number().min(0).max(100),
  verdict: z.enum(["strong", "possible", "stretch", "irrelevant"]),
  reason: z.string().max(300).default(""),
});
const BatchSchema = z.object({ results: z.array(ItemSchema).default([]) });

const SYSTEM = `You are the CareerOS Job Relevance Judge.
You receive ONE candidate profile and a numbered list of job postings.
For every job, decide how well the candidate's ACTUAL demonstrated skills and projects match the role TODAY.

Rules:
- Judge the ROLE FIRST. A different job function (sales, support, marketing, data science, ML research, mobile, QA...) than the candidate's track is ALWAYS "irrelevant" with score <= 20, no matter how many shared keywords appear.
- Treat equivalent technologies as matching (Docker/Kubernetes/EKS, Terraform/IaC/CloudFormation, ArgoCD/GitOps, React/Next.js, Node/Express).
- Penalise roles far above the candidate's experience (Principal, Staff+, Director, Engineering Manager) when the candidate is entry/junior: verdict "stretch", score <= 55.
- "strong" (75-100): same role family, most required tech already demonstrated.
  "possible" (55-74): same family, some gaps. "stretch" (35-54): adjacent role or seniority gap.
  "irrelevant" (0-34): wrong function or almost no shared technology.
- reason: max 18 words, concrete, addressed to the candidate.
Return STRICT JSON: {"results":[{"i":0,"score":82,"verdict":"strong","reason":"..."}]} with one entry per job index.`;

function candidateDigest(brain: CareerBrainSnapshot) {
  return {
    currentTitle: brain.identity.currentTitle,
    preferredRole: brain.identity.preferences?.preferredRole ?? null,
    yearsOfExperience: brain.identity.yearsOfExperience,
    summary: (brain.identity.professionalSummary ?? "").slice(0, 600),
    skills: brain.skills.map((s) => s.name).slice(0, 60),
    projects: ((brain.projects ?? []) as any[]).slice(0, 6).map((p) => ({
      name: p?.name,
      tech: (p?.technologies ?? []).slice(0, 12),
    })),
    education: (brain.education ?? []).slice(0, 3).map((e: any) => e?.degree),
  };
}

function jobDigest(job: any, i: number) {
  return {
    i,
    title: job.title,
    company: job.company ?? null,
    level: job.experienceLevel ?? null,
    remote: job.remoteStatus ?? null,
    requiredSkills: (job.requiredSkills ?? []).slice(0, 18),
    preferredSkills: (job.preferredSkills ?? []).slice(0, 10),
    summary: String(job.description ?? "").slice(0, 700),
  };
}

/**
 * Judge a shortlist. Returns a map from array index to verdict; indices the
 * model omitted (or a failed call) are simply absent — callers fall back to
 * their deterministic score.
 */
export async function aiJudgeJobs(
  brain: CareerBrainSnapshot,
  jobs: Array<{
    title: string;
    company?: string | null;
    description?: string | null;
    requiredSkills?: string[];
    preferredSkills?: string[];
    experienceLevel?: string | null;
    remoteStatus?: string | null;
  }>,
): Promise<Map<number, AiVerdict>> {
  const out = new Map<number, AiVerdict>();
  if (!jobs.length) return out;

  const candidate = candidateDigest(brain);
  const batches: Array<{ offset: number; slice: typeof jobs }> = [];
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    batches.push({ offset: i, slice: jobs.slice(i, i + BATCH_SIZE) });
  }

  await Promise.all(
    batches.map(async ({ offset, slice }) => {
      const payload = {
        candidate,
        jobs: slice.map((j, idx) => jobDigest(j, idx)),
      };
      for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await withTimeout(
          callLovableAI({
            model: MODEL,
            responseFormat: "json_object",
            temperature: 0.1,
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: JSON.stringify(payload) },
            ],
          }),
          TIMEOUT_MS,
        );
        const parsed = BatchSchema.safeParse(JSON.parse(extractJson(raw)));
        if (!parsed.success) continue;
        for (const r of parsed.data.results) {
          if (r.i < 0 || r.i >= slice.length) continue;
          out.set(offset + r.i, { score: r.score, verdict: r.verdict, reason: r.reason });
        }
        break;
      } catch {
        // Retry once, then let deterministic scores stand.
      }
      }
    }),
  );

  return out;
}

/** Blend a deterministic score with the AI verdict. */
export function blendScore(deterministic: number, ai: AiVerdict | undefined): number {
  if (!ai) return deterministic;
  let blended = Math.round(deterministic * 0.5 + ai.score * 0.5);
  if (ai.verdict === "irrelevant") blended = Math.min(blended, 25);
  else if (ai.verdict === "stretch") blended = Math.min(blended, 58);
  return Math.max(0, Math.min(100, blended));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("AI judge timed out")), ms)),
  ]);
}
