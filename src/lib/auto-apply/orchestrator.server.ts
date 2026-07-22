/**
 * Auto-Apply Orchestrator — server-only. Called from `auto-apply.functions.ts`.
 *
 * Responsibilities:
 *   1. Load Career Brain + workspace + resume versions + cover letters.
 *   2. Run AI prep (company intel, answers, resume choice).
 *   3. Persist a session + events + answers + fields.
 *   4. Hand off to the browser driver (external Node worker or noop).
 *
 * All Supabase writes go through the `supabase` client passed in — which is
 * either the authenticated user's client (start / approve / cancel flows) or
 * the service-role admin client (webhook flow). Keep this file server-only.
 */

import { getCareerBrainSnapshotFor } from "@/lib/career-brain.service";
import { researchCompany } from "./company-intel.server";
import { generateApplicationAnswers } from "./answers.server";
import { pickBestResume } from "./resume-select.server";
import { getDriver, stepProgress, type AutoApplyStep } from "./driver";

type SB = {
  from: (t: string) => {
    select: (...a: unknown[]) => {
      eq: (col: string, val: unknown) => {
        maybeSingle?: () => Promise<{ data: Record<string, unknown> | null }>;
        order?: (col: string, opts?: { ascending: boolean }) => {
          limit?: (n: number) => Promise<{ data: Record<string, unknown>[] | null }>;
        } & Promise<{ data: Record<string, unknown>[] | null }>;
      } & Promise<{ data: Record<string, unknown>[] | null }>;
    };
    insert: (rows: unknown) => Promise<{ data: unknown; error: unknown }> & {
      select: (col?: string) => { single: () => Promise<{ data: { id: string } | null; error: unknown }> };
    };
    update: (patch: Record<string, unknown>) => {
      eq: (col: string, val: unknown) => Promise<{ error: unknown }>;
    };
  };
};

const WORKER_WEBHOOK_PATH = "/api/public/hooks/auto-apply-events";

export type StartArgs = {
  supabase: unknown;
  userId: string;
  workspaceId: string;
  siteOrigin: string; // used to build absolute webhook URL for the worker
};

export type StartResult = { sessionId: string; workerConfigured: boolean };

export async function startAutoApplySession(args: StartArgs): Promise<StartResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = args.supabase as any;

  // ---- Load workspace + job + company ----
  const wsRes = await supabase
    .from("application_workspaces")
    .select("*, jobs(*), companies(*)")
    .eq("id", args.workspaceId)
    .maybeSingle();
  const ws = wsRes.data as Record<string, unknown> | null;
  if (!ws) throw new Error("Workspace not found.");
  const job = ws.jobs as Record<string, unknown> | null;
  const company = ws.companies as Record<string, unknown> | null;
  if (!job) throw new Error("Workspace has no linked job.");

  // ---- Load Career Brain (source of truth) ----
  const brain = await getCareerBrainSnapshotFor(supabase, args.userId);
  if (!brain.ready) throw new Error("Approve a resume before running the AI agent.");

  // ---- Load resume versions and cover letters ----
  const [versionsRes, lettersRes] = await Promise.all([
    supabase
      .from("resume_versions")
      .select("*")
      .eq("user_id", args.userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("cover_letters")
      .select("*")
      .eq("workspace_id", args.workspaceId)
      .order("created_at", { ascending: false }),
  ]);
  const versions = (versionsRes.data ?? []) as Record<string, unknown>[];
  const letters = (lettersRes.data ?? []) as Record<string, unknown>[];

  // ---- Create session (persist immediately so UI can subscribe) ----
  const sessionInsert = await supabase
    .from("ai_application_sessions")
    .insert({
      user_id: args.userId,
      workspace_id: args.workspaceId,
      job_id: job.id,
      company_id: company?.id ?? null,
      status: "running",
      current_step: "researching_company",
      progress: stepProgress("researching_company"),
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (sessionInsert.error || !sessionInsert.data) {
    throw new Error("Could not create AI session.");
  }
  const sessionId = sessionInsert.data.id as string;

  await emit(supabase, sessionId, args.userId, "researching_company", "info", "Session started.");

  // ---- Company intelligence ----
  const intel = await researchCompany({
    companyName: (company?.name as string) ?? (job.company_name as string) ?? "the company",
    jobTitle: (job.title as string) ?? "the role",
    jobDescription: (job.description as string) ?? null,
    companyWebsite: (company?.website as string) ?? null,
  });
  await emit(supabase, sessionId, args.userId, "researching_company", "info", "Company brief compiled.", {
    intel,
  });

  // ---- Resume selection ----
  await setStep(supabase, sessionId, "selecting_resume");
  const pick = pickBestResume({
    versions: versions.map((v) => ({
      id: v.id as string,
      name: (v.name as string | null) ?? null,
      target_role: (v.target_role as string | null) ?? null,
      target_company: (v.target_company as string | null) ?? null,
      ats_score: (v.ats_score as number | null) ?? null,
      keywords: (v.keywords as string[] | null) ?? null,
      is_active: (v.is_active as boolean | null) ?? null,
      version: (v.version as number | null) ?? null,
      content: v.content,
      file_url: (v.file_url as string | null) ?? null,
    })),
    jobTitle: (job.title as string) ?? "",
    jobKeywords: normalizeKeywords(job),
    brain,
    companyName: (company?.name as string) ?? "",
  });
  if (pick.resume) {
    await supabase
      .from("ai_application_sessions")
      .update({ resume_version_id: pick.resume.id })
      .eq("id", sessionId);
  }
  await emit(
    supabase,
    sessionId,
    args.userId,
    "selecting_resume",
    pick.confidence === "low" ? "warning" : "info",
    pick.reasoning || "Resume selected.",
    { score: pick.score, confidence: pick.confidence },
  );

  // ---- Cover letter selection (pick most recent for this workspace) ----
  await setStep(supabase, sessionId, "generating_cover_letter");
  const letter = letters[0] ?? null;
  if (letter) {
    await supabase
      .from("ai_application_sessions")
      .update({ cover_letter_id: letter.id })
      .eq("id", sessionId);
    await emit(supabase, sessionId, args.userId, "generating_cover_letter", "info", "Using existing cover letter.");
  } else {
    await emit(
      supabase,
      sessionId,
      args.userId,
      "generating_cover_letter",
      "warning",
      "No cover letter on file — the agent will submit without one.",
    );
  }

  // ---- Answers ----
  await setStep(supabase, sessionId, "preparing_answers");
  const qa = await generateApplicationAnswers({
    brain,
    jobTitle: (job.title as string) ?? "the role",
    companyName: (company?.name as string) ?? "the company",
    jobDescription: (job.description as string) ?? null,
    companyIntel: intel,
  });
  if (qa.length) {
    await supabase.from("ai_session_answers").insert(
      qa.map((a) => ({
        session_id: sessionId,
        user_id: args.userId,
        question: a.question,
        answer: a.answer,
        confidence: a.confidence,
        source: "gemini",
        ai_model: "google/gemini-3-flash-preview",
      })),
    );
    await emit(
      supabase,
      sessionId,
      args.userId,
      "preparing_answers",
      "info",
      `${qa.length} draft answers ready.`,
    );
  }

  // ---- Seed identity form fields (values from Career Brain) ----
  const identityFields = [
    { label: "Full name", value: brain.identity.fullName, kind: "text" },
    { label: "Email", value: brain.identity.email, kind: "email" },
    { label: "Phone", value: brain.identity.phone, kind: "tel" },
    { label: "Location", value: brain.identity.location, kind: "text" },
    { label: "LinkedIn", value: brain.identity.links.linkedin, kind: "url" },
    { label: "GitHub", value: brain.identity.links.github, kind: "url" },
    { label: "Portfolio", value: brain.identity.links.portfolio, kind: "url" },
    { label: "Website", value: brain.identity.links.website, kind: "url" },
  ];
  await supabase.from("ai_session_fields").insert(
    identityFields.map((f) => ({
      session_id: sessionId,
      user_id: args.userId,
      label: f.label,
      value: f.value,
      kind: f.kind,
      filled: !!f.value,
      needs_user: !f.value && (f.label === "Email" || f.label === "Full name"),
    })),
  );

  // ---- Hand off to browser driver ----
  await setStep(supabase, sessionId, "launching_browser");
  const driver = getDriver();
  const workerConfigured = driver.kind !== "noop";

  const resumeVersion = pick.resume;
  // Guard against null/undefined content — JSON.stringify(undefined) returns
  // undefined, and .slice() on that throws "Cannot read properties of
  // undefined (reading 'slice')" which surfaces as an opaque toast.
  const rawResumeText = resumeVersion?.content != null
    ? JSON.stringify(resumeVersion.content) ?? ""
    : brain.identity.professionalSummary ?? "";
  const resumeText = (rawResumeText ?? "").slice(0, 20000);

  try {
    const { browserSessionId } = await driver.start({
      sessionId,
      webhookUrl: `${args.siteOrigin.replace(/\/+$/, "")}${WORKER_WEBHOOK_PATH}`,
      webhookSecret: process.env.AUTO_APPLY_WORKER_SECRET!,
      jobUrl: (job.url as string) ?? (job.application_url as string) ?? "",
      applicationUrl: (job.application_url as string | null) ?? null,
      jobTitle: (job.title as string) ?? "",
      companyName: (company?.name as string) ?? "",
      requireApproval: true,
      profile: {
        fullName: brain.identity.fullName,
        email: brain.identity.email,
        phone: brain.identity.phone,
        location: brain.identity.location,
        linkedin: brain.identity.links.linkedin,
        github: brain.identity.links.github,
        portfolio: brain.identity.links.portfolio,
        website: brain.identity.links.website,
      },
      resume: {
        fileName: (resumeVersion?.name as string) ?? "resume.pdf",
        downloadUrl: (resumeVersion?.file_url as string | null) ?? null,
        text: resumeText,
      },
      coverLetter: letter
        ? { text: String(letter.body ?? letter.content ?? "").slice(0, 8000) }
        : null,
      answers: qa.map((a) => ({ question: a.question, answer: a.answer })),
      formHints: identityFields
        .filter((f) => f.value)
        .map((f) => ({ label: f.label, value: String(f.value) })),
    });
    await supabase
      .from("ai_application_sessions")
      .update({ browser_session_id: browserSessionId })
      .eq("id", sessionId);
    await emit(
      supabase,
      sessionId,
      args.userId,
      "launching_browser",
      "info",
      workerConfigured ? "Browser worker acknowledged the session." : "No browser worker configured — running in preview mode.",
      { workerConfigured, browserSessionId },
    );
  } catch (e) {
    await supabase
      .from("ai_application_sessions")
      .update({ status: "failed", error: String((e as Error).message).slice(0, 400), finished_at: new Date().toISOString() })
      .eq("id", sessionId);
    await emit(supabase, sessionId, args.userId, "launching_browser", "error", `Worker rejected the session: ${(e as Error).message}`);
    return { sessionId, workerConfigured };
  }

  // ---- Noop path: mark awaiting_approval so the UI shows the human gate. ----
  if (!workerConfigured) {
    await setStep(supabase, sessionId, "awaiting_approval");
    await supabase
      .from("ai_application_sessions")
      .update({ approval_required_at: new Date().toISOString() })
      .eq("id", sessionId);
    await emit(
      supabase,
      sessionId,
      args.userId,
      "awaiting_approval",
      "approval",
      "Preview mode: review the plan below. Configure AUTO_APPLY_WORKER_URL to run a real browser session.",
    );
  }

  return { sessionId, workerConfigured };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function emit(
  supabase: unknown,
  sessionId: string,
  userId: string,
  step: AutoApplyStep | string,
  kind: "info" | "warning" | "error" | "approval",
  message: string,
  data?: Record<string, unknown>,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("ai_session_events").insert({
    session_id: sessionId,
    user_id: userId,
    step,
    kind,
    message: message.slice(0, 1200),
    data: data ?? {},
  });
}

async function setStep(supabase: unknown, sessionId: string, step: AutoApplyStep) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("ai_application_sessions")
    .update({ current_step: step, progress: stepProgress(step) })
    .eq("id", sessionId);
}

function normalizeKeywords(job: Record<string, unknown>): string[] {
  const raw = (job.keywords as string[] | null) ?? (job.required_skills as string[] | null) ?? [];
  return raw.map((k) => String(k).toLowerCase().trim()).filter(Boolean);
}
