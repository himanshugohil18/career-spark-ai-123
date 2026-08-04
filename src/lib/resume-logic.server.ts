import { z } from "zod";
import { callLovableAI, extractJson } from "./ai-gateway.server";
import {
  AI_MODEL,
  ParsedResumeSchema,
  type ParsedResume,
  SYSTEM_PROMPT,
  USER_PROMPT,
  SKILL_CATEGORY_LABELS,
} from "./resume-schema";
import { repairParsedResume } from "./resume-repair.server";
import type { Json } from "@/integrations/supabase/types";

export const ProcessResumeInput = z.object({
  resumeId: z.string().uuid(),
  extractedText: z.string().optional(),
});

async function bytesToBase64(bytes: Uint8Array): Promise<string> {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)) as number[],
    );
  }
  return typeof btoa !== "undefined"
    ? btoa(binary)
    : Buffer.from(binary, "binary").toString("base64");
}

/**
 * Run Gemini against the stored resume file and cache the parsed JSON.
 * Does NOT touch normalized tables — the user must approve on the review
 * screen before the Career Brain becomes active.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runParse(
  supabase: any,
  resumeId: string,
  extractedText: string | undefined,
): Promise<ParsedResume> {
  const { data: resume, error: resumeErr } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", resumeId)
    .eq("user_id", arguments[3] ?? "")
    .single();
  if (resumeErr || !resume) throw new Error("Resume not found");

  await supabase
    .from("resumes")
    .update({ status: "processing", error_message: null })
    .eq("id", resumeId);

  const content: Array<
    | { type: "text"; text: string }
    | { type: "file"; file: { filename: string; file_data: string } }
  > = [{ type: "text", text: USER_PROMPT }];

  const usableText = (extractedText ?? resume.raw_text ?? "").trim();
  const isPdf = resume.mime_type === "application/pdf";

  // Always attach the PDF binary when available — the model uses visual
  // layout (columns, icons, headings) to disambiguate sections.
  if (isPdf) {
    const { data: file, error: dlErr } = await supabase.storage
      .from("resumes")
      .download(resume.file_path);
    if (dlErr || !file) throw new Error("Could not download resume file");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const base64 = await bytesToBase64(bytes);
    content.push({
      type: "file",
      file: {
        filename: resume.file_name,
        file_data: `data:application/pdf;base64,${base64}`,
      },
    });
  }

  // Attach verbatim extracted text as the AUTHORITATIVE source for URLs,
  // emails, phones, and dates. When both are present the prompt tells the
  // model to prefer this text for any field it could copy verbatim.
  if (usableText.length > 0) {
    content.push({
      type: "text",
      text: `\n\nVERBATIM RESUME TEXT (authoritative for URLs, emails, phone numbers, and dates — copy characters exactly from here):\n${usableText.slice(0, 80_000)}`,
    });
  } else if (!isPdf) {
    throw new Error("Unable to extract resume text. Please re-upload the file.");
  }


  const raw = await callLovableAI({
    model: AI_MODEL,
    responseFormat: "json_object",
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content },
    ],
  });

  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(extractJson(raw));
  } catch {
    throw new Error("AI returned invalid JSON. Please retry.");
  }
  const parsedStrict = ParsedResumeSchema.parse(parsedUnknown);
  // Prefer whatever we already have as plain text; fall back to the model's
  // own extraction of the PDF/DOCX so the repair pass has something to scan.
  const rawTextForRepair =
    (usableText && usableText.length > 40 ? usableText : parsedStrict.rawText) ||
    resume.raw_text ||
    "";
  const repaired = repairParsedResume(parsedStrict, rawTextForRepair);
  // Strip rawText from what we persist — it's large and duplicates raw_text.
  const parsed: ParsedResume = { ...repaired, rawText: null };

  await supabase
    .from("resumes")
    .update({
      status: "parsed",
      parsed_json: parsed as unknown as Json,
      raw_text: rawTextForRepair || resume.raw_text,
      parsed_at: new Date().toISOString(),
      overall_confidence: parsed.overallConfidence,
      ai_model: AI_MODEL,
      error_message: null,
    })
    .eq("id", resumeId);

  return parsed;
}

export async function processResumeFor(
  data: z.infer<typeof ProcessResumeInput>,
  context: { supabase: any; userId: string },
) {
    const { supabase } = context;
    try {
      const parsed = await runParse(supabase, data.resumeId, data.extractedText);
      return { ok: true, resumeId: data.resumeId, overallConfidence: parsed.overallConfidence };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await supabase
        .from("resumes")
        .update({ status: "failed", error_message: message })
        .eq("id", data.resumeId);
      throw new Error(message);
    }
}

/** Retry the parse for an existing resume — no re-upload required. */
export async function retryParseFor(
  data: { resumeId: string },
  context: { supabase: any; userId: string },
) {
    const { supabase } = context;
    try {
      const parsed = await runParse(supabase, data.resumeId, undefined);
      return { ok: true, overallConfidence: parsed.overallConfidence };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await supabase
        .from("resumes")
        .update({ status: "failed", error_message: message })
        .eq("id", data.resumeId);
      throw new Error(message);
    }
}

/** Load a parsed but not-yet-approved resume for the review screen. */
export async function getParsedResumeFor(
  data: { resumeId: string },
  context: { supabase: any; userId: string },
) {
    const { supabase } = context;
    const { data: resume, error } = await supabase
      .from("resumes")
      .select("*")
      .eq("id", data.resumeId)
      .eq("user_id", context.userId)
      .single();
    if (error || !resume) throw new Error("Resume not found");
    return {
      resumeId: resume.id,
      fileName: resume.file_name,
      version: resume.version,
      status: resume.status,
      overallConfidence: resume.overall_confidence,
      aiModel: resume.ai_model,
      errorMessage: resume.error_message,
      approvedAt: resume.approved_at,
      parsed: (resume.parsed_json as unknown as ParsedResume | null) ?? null,
    };
}

/**
 * Persist the user-approved parse into the normalized tables and generate
 * the Career Brain. This is the only path that makes the Brain active.
 *
 * Every row is written with its `confidence`, `ai_original` (snapshot of
 * the raw AI extraction for provenance), and `user_verified=false`. Later
 * edits via updateEntity flip `user_verified` to true.
 */
export const ApproveInput = z.object({
  resumeId: z.string().uuid(),
  edited: ParsedResumeSchema,
});

/**
 * Shared writer: given an edited/approved parse, wipe & repopulate every
 * normalized table for the user, then rebuild career_brain / _dna / _health.
 * The active resume is the single source of truth — this is the only path
 * that mutates the derived tables.
 */
async function applyApprovedResume(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  resumeId: string,
  edited: ParsedResume,
  aiOriginal: ParsedResume | null,
): Promise<{
  brainVersion: number;
  counts: { projects: number; skills: number; experiences: number; education: number };
  completeness: number;
}> {
  await Promise.all([
    supabase.from("work_experiences").delete().eq("user_id", userId),
    supabase.from("projects").delete().eq("user_id", userId),
    supabase.from("education").delete().eq("user_id", userId),
    supabase.from("certifications").delete().eq("user_id", userId),
    supabase.from("languages").delete().eq("user_id", userId),
    supabase.from("achievements").delete().eq("user_id", userId),
    supabase.from("skills").delete().eq("user_id", userId),
  ]);

  const p = edited.personal;
  const profilePatch: Record<string, unknown> = {
    user_id: userId,
    onboarding_completed: true,
  };
  if (p.fullName) profilePatch.full_name = p.fullName;
  if (p.email) profilePatch.email = p.email;
  if (p.phone) profilePatch.phone = p.phone;
  if (p.location) profilePatch.location = p.location;
  if (p.linkedin) profilePatch.linkedin_url = p.linkedin;
  if (p.github) profilePatch.github_url = p.github;
  if (p.portfolio) profilePatch.portfolio_url = p.portfolio;
  if (p.website) profilePatch.website_url = p.website;
  if (p.professionalSummary) profilePatch.professional_summary = p.professionalSummary;
  if (p.currentTitle) profilePatch.current_title = p.currentTitle;
  if (typeof p.yearsOfExperience === "number") profilePatch.years_of_experience = p.yearsOfExperience;
  if (p.preferredRole) profilePatch.preferred_role = p.preferredRole;
  if (p.preferredLocation) profilePatch.preferred_location = p.preferredLocation;
  if (p.expectedSalary) profilePatch.expected_salary = p.expectedSalary;
  await supabase.from("profiles").upsert(profilePatch as never, { onConflict: "user_id" });

  const skillRows: Array<Record<string, unknown>> = [];
  Object.entries(edited.skills).forEach(([key, arr]) => {
    const label = SKILL_CATEGORY_LABELS[key as keyof typeof SKILL_CATEGORY_LABELS];
    arr.forEach((entry, i) => {
      const clean = entry.name.trim();
      if (!clean) return;
      skillRows.push({
        user_id: userId,
        resume_id: resumeId,
        category: label,
        name: clean,
        sort_order: i,
        confidence: entry.confidence,
        ai_original: entry as unknown as Json,
        user_verified: false,
      });
    });
  });
  if (skillRows.length) {
    await supabase.from("skills").upsert(skillRows as never, { onConflict: "user_id,category,name" });
  }

  if (edited.workExperiences.length) {
    await supabase.from("work_experiences").insert(
      edited.workExperiences.map((w, i) => ({
        user_id: userId,
        resume_id: resumeId,
        company: w.company,
        role: w.role,
        location: w.location ?? null,
        employment_type: w.employmentType ?? null,
        start_date: w.startDate ?? null,
        end_date: w.endDate ?? null,
        is_current: w.isCurrent,
        duration: w.duration ?? null,
        responsibilities: w.responsibilities,
        technologies: w.technologies,
        achievements: w.achievements,
        sort_order: i,
        confidence: w.confidence,
        ai_original: (aiOriginal?.workExperiences?.[i] ?? w) as unknown as Json,
        user_verified: false,
      })),
    );
  }

  if (edited.projects.length) {
    await supabase.from("projects").insert(
      edited.projects.map((pr, i) => ({
        user_id: userId,
        resume_id: resumeId,
        name: pr.name,
        description: pr.description ?? null,
        technologies: pr.technologies,
        github_url: pr.githubUrl ?? null,
        live_url: pr.liveUrl ?? null,
        start_date: pr.startDate ?? null,
        end_date: pr.endDate ?? null,
        duration: pr.duration ?? null,
        responsibilities: pr.responsibilities,
        achievements: pr.achievements,
        sort_order: i,
        confidence: pr.confidence,
        ai_original: (aiOriginal?.projects?.[i] ?? pr) as unknown as Json,
        user_verified: false,
      })),
    );
  }

  if (edited.education.length) {
    await supabase.from("education").insert(
      edited.education.map((e, i) => ({
        user_id: userId,
        resume_id: resumeId,
        degree: e.degree,
        institution: e.institution,
        board: e.board ?? null,
        field_of_study: e.fieldOfStudy ?? null,
        start_date: e.startDate ?? null,
        end_date: e.endDate ?? null,
        cgpa: e.cgpa ?? null,
        percentage: e.percentage ?? null,
        sort_order: i,
        confidence: e.confidence,
        ai_original: (aiOriginal?.education?.[i] ?? e) as unknown as Json,
        user_verified: false,
      })),
    );
  }

  if (edited.certifications.length) {
    await supabase.from("certifications").insert(
      edited.certifications.map((c, i) => ({
        user_id: userId,
        resume_id: resumeId,
        name: c.name,
        organization: c.organization ?? null,
        issue_date: c.issueDate ?? null,
        expiry_date: c.expiryDate ?? null,
        credential_id: c.credentialId ?? null,
        credential_url: c.credentialUrl ?? null,
        sort_order: i,
        confidence: c.confidence,
        ai_original: (aiOriginal?.certifications?.[i] ?? c) as unknown as Json,
        user_verified: false,
      })),
    );
  }

  if (edited.languages.length) {
    await supabase.from("languages").insert(
      edited.languages.map((l, i) => ({
        user_id: userId,
        resume_id: resumeId,
        name: l.name,
        proficiency: l.proficiency ?? null,
        sort_order: i,
        confidence: l.confidence,
        ai_original: (aiOriginal?.languages?.[i] ?? l) as unknown as Json,
        user_verified: false,
      })),
    );
  }

  if (edited.achievements.length) {
    await supabase.from("achievements").insert(
      edited.achievements.map((a, i) => ({
        user_id: userId,
        resume_id: resumeId,
        description: a.description,
        category: a.category ?? null,
        date: a.date ?? null,
        sort_order: i,
        confidence: a.confidence,
        ai_original: (aiOriginal?.achievements?.[i] ?? a) as unknown as Json,
        user_verified: false,
      })),
    );
  }

  const { computeCompleteness } = await import("./completeness");
  const completeness = computeCompleteness({
    profile: {
      github_url: p.github,
      linkedin_url: p.linkedin,
      portfolio_url: p.portfolio,
      preferred_role: p.preferredRole,
      preferred_location: p.preferredLocation,
      expected_salary: p.expectedSalary,
      professional_summary: p.professionalSummary,
    },
    certificationsCount: edited.certifications.length,
    projectsCount: edited.projects.length,
  });

  const cb = edited.careerBrain;
  const { data: existingBrain } = await supabase
    .from("career_brain")
    .select("version")
    .eq("user_id", userId)
    .maybeSingle();
  const nextBrainVersion = ((existingBrain?.version as number | undefined) ?? 0) + 1;

  await supabase.from("career_brain").upsert(
    {
      user_id: userId,
      version: nextBrainVersion,
      identity: {
        fullName: p.fullName,
        currentTitle: p.currentTitle,
        location: p.location,
        yearsOfExperience: p.yearsOfExperience,
      } as unknown as Json,
      strengths: cb.strengths,
      weaknesses: cb.weaknesses,
      growth_areas: cb.growthAreas,
      career_goals: cb.careerGoals,
      preferred_roles: cb.preferredRoles,
      preferred_companies: cb.preferredCompanies,
      preferred_industries: cb.preferredIndustries,
      salary_goals: cb.salaryGoals ?? p.expectedSalary ?? null,
      location_preferences: cb.locationPreferences,
      technology_interests: cb.technologyInterests,
      learning_priorities: cb.learningPriorities,
      summary: cb.summary ?? p.professionalSummary ?? null,
      last_source_resume_id: resumeId,
      ai_model: AI_MODEL,
      overall_confidence: edited.overallConfidence,
      completeness_score: completeness.score,
      last_generated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  const dna = edited.careerDna;
  await supabase.from("career_dna").upsert(
    {
      user_id: userId,
      cloud: dna.cloud,
      devops: dna.devops,
      backend: dna.backend,
      frontend: dna.frontend,
      ai: dna.ai,
      automation: dna.automation,
      leadership: dna.leadership,
      communication: dna.communication,
      architecture: dna.architecture,
      problem_solving: dna.problemSolving,
      security: dna.security,
      narrative: dna.narrative ?? null,
    },
    { onConflict: "user_id" },
  );

  const ch = edited.careerHealth;
  await supabase.from("career_health").upsert(
    {
      user_id: userId,
      score: ch.score,
      resume_quality: ch.resumeQuality,
      experience_score: ch.experienceScore,
      projects_score: ch.projectsScore,
      skills_score: ch.skillsScore,
      education_score: ch.educationScore,
      certifications_score: ch.certificationsScore,
      profile_completion: completeness.score,
      career_direction: ch.careerDirection,
      consistency: ch.consistency,
      strengths: ch.strengths,
      weaknesses: ch.weaknesses,
      recommendations: ch.recommendations,
      improvement_areas: ch.improvementAreas,
      details: {} as Json,
    },
    { onConflict: "user_id" },
  );

  await supabase
    .from("resumes")
    .update({ is_active: false })
    .eq("user_id", userId)
    .neq("id", resumeId);
  await supabase
    .from("resumes")
    .update({
      status: "approved",
      is_active: true,
      approved_at: new Date().toISOString(),
    })
    .eq("id", resumeId);

  return {
    brainVersion: nextBrainVersion,
    counts: {
      projects: edited.projects.length,
      skills: Object.values(edited.skills).reduce((n, arr) => n + (Array.isArray(arr) ? arr.length : 0), 0),
      experiences: edited.workExperiences.length,
      education: edited.education.length,
    },
    completeness: completeness.score,
  };
}

export async function approveResumeFor(
  data: z.infer<typeof ApproveInput>,
  context: { supabase: any; userId: string },
) {
    const { supabase, userId } = context;
    const { resumeId, edited } = data;

    const { data: resume, error: resumeErr } = await supabase
      .from("resumes")
      .select("parsed_json")
      .eq("id", resumeId)
      .eq("user_id", userId)
      .single();
    if (resumeErr || !resume) throw new Error("Resume not found");
    const aiOriginal = resume.parsed_json as unknown as ParsedResume | null;

    const { brainVersion, counts, completeness } = await applyApprovedResume(
      supabase,
      userId,
      resumeId,
      edited,
      aiOriginal,
    );

    // Resume-parsed email removed per product decision — users are notified
    // via the "new job matches" email once matches are computed.

    // NOTE: heavy discovery + AI matching runs on the next Dashboard/Jobs
    // visit via `ensureInitialMatches` — inline execution here would exceed
    // the Cloudflare Worker memory budget.
    return { ok: true, brainVersion, activation: null };
}


/**
 * Switch the active resume to a previously-approved version. Rehydrates
 * the Career Brain from that resume's stored parsed_json.
 */
export async function setActiveResumeFor(
  data: { resumeId: string },
  context: { supabase: any; userId: string },
) {
    const { supabase, userId } = context;
    const { data: resume, error } = await supabase
      .from("resumes")
      .select("*")
      .eq("id", data.resumeId)
      .eq("user_id", userId)
      .single();
    if (error || !resume) throw new Error("Resume not found");
    if (!resume.parsed_json) throw new Error("This resume has no parsed data. Retry parsing first.");

    // Re-run the same writer used at approval so the Career Brain / DNA /
    // Health / normalized tables all reflect this resume — the active
    // resume is always the single source of truth.
    const edited = ParsedResumeSchema.parse(resume.parsed_json);
    const aiOriginal = resume.parsed_json as unknown as ParsedResume | null;
    const { brainVersion } = await applyApprovedResume(
      supabase,
      userId,
      data.resumeId,
      edited,
      aiOriginal,
    );

    return {
      ok: true,
      brainVersion,
      needsReapprove: !resume.approved_at,
      overallConfidence: edited.overallConfidence,
    };
}

/**
 * Regenerate the Career Brain / DNA / Health from the currently active
 * resume without requiring re-upload. Useful after the user manually edits
 * normalized fields, or to migrate an older resume onto the newest schema.
 */
export async function regenerateCareerBrainFor(
  context: { supabase: any; userId: string },
) {
    const { supabase, userId } = context;
    const { data: resume, error } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    if (!resume) throw new Error("No active resume to regenerate from. Upload or activate a resume first.");
    if (!resume.parsed_json) throw new Error("Active resume has no parsed data. Retry parsing first.");

    const edited = ParsedResumeSchema.parse(resume.parsed_json);
    const aiOriginal = resume.parsed_json as unknown as ParsedResume | null;
    const { brainVersion } = await applyApprovedResume(
      supabase,
      userId,
      resume.id,
      edited,
      aiOriginal,
    );
    return { ok: true, brainVersion };
}


export async function deleteResumeFor(
  data: { resumeId: string },
  context: { supabase: any; userId: string },
) {
    const { supabase, userId } = context;
    const { data: resume } = await supabase
      .from("resumes")
      .select("file_path")
      .eq("id", data.resumeId)
      .eq("user_id", userId)
      .single();
    if (resume?.file_path) {
      await supabase.storage.from("resumes").remove([resume.file_path]);
    }
    const { error } = await supabase
      .from("resumes")
      .delete()
      .eq("id", data.resumeId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
}

/** Next version number for a user's next uploaded resume. */
export async function getNextResumeVersionFor(
  context: { supabase: any; userId: string },
) {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("resumes")
      .select("version")
      .eq("user_id", userId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { nextVersion: (data?.version ?? 0) + 1 };
}
