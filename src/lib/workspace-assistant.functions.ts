/**
 * Phase 4.2 — AI Assistant server functions:
 * resume optimizer + versions, cover letters, screening answers, interview prep,
 * application packages. All persistence + caching lives here.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { strToU8, zipSync } from "fflate";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCareerBrainSnapshotFor } from "./career-brain.service";
import type { WorkspaceJob } from "./workspace/analysis.server";
import {
  generateOptimizedResume,
  generateCoverLetter,
  generateScreeningAnswers,
  generateInterviewPack,
  standardScreeningQuestions,
  type CoverLetterStyle,
  type ScreeningKind,
} from "./workspace/assistant.server";

const COVER_STYLES = ["professional", "executive", "concise", "enthusiastic", "startup", "enterprise"] as const;
const SCREENING_KINDS = [
  "about_you","why_company","why_hire","challenge","achievement","goals",
  "why_leaving","strengths","weaknesses","custom_short","custom_paragraph","custom_essay",
  "portfolio","project","technical",
] as const;

function throwDb(error: unknown, label: string): never {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message)
      : "unknown database error";
  throw new Error(`${label}: ${message}`);
}

function uniqueStrings(values: unknown[]): string[] {
  const seen = new Set<string>();
  for (const value of values.flatMap((v) => Array.isArray(v) ? v : [v])) {
    if (typeof value !== "string") continue;
    const cleaned = value.trim();
    if (cleaned.length > 1) seen.add(cleaned);
  }
  return Array.from(seen).slice(0, 80);
}

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const JOB_SELECT = "id, title, description, location, remote_status, employment_type, experience_level, responsibilities, requirements, required_skills, preferred_skills, benefits, application_url, company_id, company:companies(id,name,industry,size,remote_policy,tech_stack,description,website)";

function textValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function linesFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(textValue).filter(Boolean);
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function safeFilePart(value: unknown, fallback: string): string {
  const cleaned = textValue(value)
    .replace(/[^a-z0-9._ -]+/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return cleaned || fallback;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.slice(i, i + 0x8000));
  }
  return btoa(binary);
}

function normalizePdfText(value: string): string {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/•/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ");
}

function escapePdfText(value: string): string {
  return normalizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, width = 92): string[] {
  const lines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) { lines.push(""); continue; }
    const words = normalizePdfText(raw).split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      if (!line) line = word;
      else if (`${line} ${word}`.length <= width) line += ` ${word}`;
      else { lines.push(line); line = word; }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function createDocx(text: string): Uint8Array {
  const body = text.split(/\r?\n/).map((line) => {
    if (!line.trim()) return "<w:p/>";
    return `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r></w:p>`;
  }).join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  return zipSync({
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rels),
    "word/document.xml": strToU8(documentXml),
  });
}

function createPdf(text: string): Uint8Array {
  const wrapped = wrapText(text);
  const pages: string[][] = [];
  for (let i = 0; i < wrapped.length; i += 48) pages.push(wrapped.slice(i, i + 48));
  if (!pages.length) pages.push(["Application Package"]);

  const fontObj = 3 + pages.length * 2;
  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`;

  pages.forEach((pageLines, index) => {
    const pageObj = 3 + index * 2;
    const contentObj = pageObj + 1;
    const content = `BT\n/F1 10 Tf\n50 760 Td\n14 TL\n${pageLines.map((line) => `(${escapePdfText(line)}) Tj\nT*`).join("\n")}\nET`;
    objects[pageObj] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObj} 0 R >> >> /Contents ${contentObj} 0 R >>`;
    objects[contentObj] = `<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`;
  });
  objects[fontObj] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 1; i <= fontObj; i += 1) {
    offsets[i] = new TextEncoder().encode(pdf).length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${fontObj + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= fontObj; i += 1) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${fontObj + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function formatOptimizedResume(row: any): string {
  const c = row?.optimized_content ?? {};
  const sections: string[] = [
    `RESUME VERSION: ${row?.version_name ?? "Optimized Resume"}`,
    `ATS Score: ${row?.ats_score ?? "-"}/100`,
    `Readiness Score: ${row?.readiness_score ?? "-"}/100`,
    "",
  ];
  if (c.professional_summary) sections.push("PROFESSIONAL SUMMARY", textValue(c.professional_summary), "");
  if (Array.isArray(c.skills) && c.skills.length) {
    sections.push("SKILLS");
    for (const skill of c.skills) sections.push(`${skill?.category ?? "Skills"}: ${linesFrom(skill?.items).join(", ")}`);
    sections.push("");
  }
  if (Array.isArray(c.experience) && c.experience.length) {
    sections.push("EXPERIENCE");
    for (const exp of c.experience) {
      sections.push(`${exp?.role ?? "Role"} · ${exp?.company ?? "Company"}${exp?.dates ? ` · ${exp.dates}` : ""}`);
      for (const bullet of linesFrom(exp?.bullets)) sections.push(`- ${bullet}`);
      sections.push("");
    }
  }
  if (Array.isArray(c.projects) && c.projects.length) {
    sections.push("PROJECTS");
    for (const project of c.projects) {
      sections.push(`${project?.name ?? "Project"}`);
      if (project?.description) sections.push(textValue(project.description));
      const tech = linesFrom(project?.technologies);
      if (tech.length) sections.push(`Technologies: ${tech.join(", ")}`);
      sections.push("");
    }
  }
  if (Array.isArray(c.education) && c.education.length) {
    sections.push("EDUCATION");
    for (const edu of c.education) sections.push(`${edu?.degree ?? "Degree"}${edu?.field ? `, ${edu.field}` : ""} · ${edu?.institution ?? "Institution"}`);
    sections.push("");
  }
  if (Array.isArray(c.certifications) && c.certifications.length) {
    sections.push("CERTIFICATIONS");
    for (const cert of c.certifications) sections.push(`${cert?.name ?? "Certification"}${cert?.issuer ? ` · ${cert.issuer}` : ""}`);
    sections.push("");
  }
  return sections.join("\n");
}

function formatCoverLetter(row: any): string {
  return [`COVER LETTER (${row?.style ?? "professional"})`, "", row?.greeting, "", row?.body, "", row?.closing]
    .map(textValue)
    .join("\n")
    .trim();
}

function formatScreening(rows: any[]): string {
  return ["SCREENING ANSWERS", "", ...rows.flatMap((row, index) => [
    `${index + 1}. ${row.question}`,
    row.answer,
    "",
  ])].map(textValue).join("\n").trim();
}

function formatInterview(session: any, questions: any[]): string {
  return ["INTERVIEW PREP", session?.focus ? `Focus: ${session.focus}` : "Focus: General", "", ...questions.flatMap((q, index) => [
    `${index + 1}. [${q.category ?? "general"} · ${q.difficulty ?? "medium"}] ${q.question}`,
    `Suggested answer: ${q.suggested_answer ?? ""}`,
    linesFrom(q.key_points).length ? `Key points: ${linesFrom(q.key_points).join(", ")}` : "",
    linesFrom(q.follow_ups).length ? `Follow-ups: ${linesFrom(q.follow_ups).join(" | ")}` : "",
    "",
  ])].map(textValue).join("\n").trim();
}

async function loadWorkspaceContext(supabase: any, userId: string, workspaceId: string) {
  const ws = await supabase
    .from("application_workspaces")
    .select("*")
    .eq("id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (ws.error) throwDb(ws.error, "Could not load application workspace");
  if (!ws.data) throw new Error("Workspace not found");
  if (!ws.data.job_id) throw new Error("Workspace is missing a linked job_id");

  const job = await supabase
    .from("jobs")
    .select(JOB_SELECT)
    .eq("id", ws.data.job_id)
    .maybeSingle();
  if (job.error) throwDb(job.error, `Could not load selected job ${ws.data.job_id}`);
  let jobData = job.data;
  if (!jobData) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const adminJob = await supabaseAdmin.from("jobs").select(JOB_SELECT).eq("id", ws.data.job_id).maybeSingle();
    if (adminJob.error) throwDb(adminJob.error, `Could not load selected job ${ws.data.job_id}`);
    jobData = adminJob.data;
  }
  if (!jobData) throw new Error(`Selected job not found for workspace (${ws.data.job_id})`);

  const resumeQuery = supabase
    .from("resumes")
    .select("id, version, file_name, raw_text, parsed_json, status, overall_confidence, ai_model")
    .eq("user_id", userId);
  const resume = ws.data.resume_id
    ? await resumeQuery.eq("id", ws.data.resume_id).maybeSingle()
    : await resumeQuery.eq("is_active", true).order("version", { ascending: false }).limit(1).maybeSingle();
  if (resume.error) throwDb(resume.error, "Could not load uploaded resume");
  if (!resume.data) throw new Error("Uploaded resume not found for this workspace");

  const brain = await getCareerBrainSnapshotFor(supabase, userId);
  if (!brain.ready) throw new Error("Career Brain not ready — approve your resume first.");

  const normalizedJob = {
    ...(jobData as Record<string, unknown>),
    keywords: uniqueStrings([
      (jobData as any).required_skills,
      (jobData as any).preferred_skills,
      (jobData as any).requirements,
      (jobData as any).responsibilities,
    ]),
  } as WorkspaceJob & { company_id: string | null };

  return { ws: ws.data, job: normalizedJob, brain, resume: resume.data };
}

async function logGeneration(
  supabase: any, userId: string, workspaceId: string,
  kind: string, targetId: string | null, aiModel: string, inputHash: string,
  status: "success" | "error", error?: string, metadata: Record<string, unknown> = {},
) {
  await supabase.from("ai_generation_history").insert({
    user_id: userId, workspace_id: workspaceId, kind, target_id: targetId,
    ai_model: aiModel, input_hash: inputHash, status, error: error ?? null, metadata,
  });
}

async function logTimeline(
  supabase: any, workspaceId: string, userId: string,
  event_type: string, title: string, description?: string,
) {
  await supabase.from("application_timeline").insert({
    workspace_id: workspaceId, user_id: userId, event_type, title,
    description: description ?? null, payload: {},
  });
}

// ---------- Resume Optimizer ----------

export const generateResumeVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      workspaceId: z.string().uuid(),
      versionName: z.string().max(120).optional(),
      generationReason: z.string().max(200).optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { ws, job, brain, resume: sourceResume } = await loadWorkspaceContext(supabase, userId, data.workspaceId);

    const ats = await supabase.from("ats_analysis").select("missing_keywords").eq("workspace_id", data.workspaceId).maybeSingle();
    if (ats.error) throwDb(ats.error, "Could not load ATS analysis");
    const missing = (ats.data?.missing_keywords as string[] | null) ?? [];

    try {
      const { resume, model, inputHash } = await generateOptimizedResume({
        job, brain, sourceResume, atsMissingKeywords: missing,
      });

      // Deactivate previous active version
      const deactivate = await supabase.from("resume_versions")
        .update({ is_active: false })
        .eq("workspace_id", data.workspaceId)
        .eq("user_id", userId)
        .eq("is_active", true);
      if (deactivate.error) throwDb(deactivate.error, "Could not deactivate previous resume version");

      const baseResume = await supabase.from("resumes").select("id").eq("id", sourceResume.id).eq("user_id", userId).maybeSingle();
      if (baseResume.error) throwDb(baseResume.error, "Could not verify base resume");

      const ins = await supabase.from("resume_versions").insert({
        user_id: userId,
        workspace_id: data.workspaceId,
        base_resume_id: baseResume.data?.id ?? null,
        job_id: ws.job_id,
        company_id: ws.company_id,
        career_brain_version: ws.career_brain_version,
        version_name: data.versionName ?? resume.version_name ?? `Optimized for ${job.title}`,
        target_company: (job.company as any)?.name ?? null,
        target_job_title: job.title,
        generation_reason: data.generationReason ?? "AI-optimized for this job",
        optimized_content: resume,
        diff: resume.diff ?? {},
        ats_score: resume.ats_score ?? null,
        readiness_score: resume.readiness_score ?? null,
        keywords_added: resume.keywords_added ?? [],
        is_active: true,
        ai_model: model,
        input_hash: inputHash,
      }).select("id").single();
      if (ins.error) throw new Error(ins.error.message);

      await logGeneration(supabase, userId, data.workspaceId, "resume_optimization", ins.data.id, model, inputHash, "success");
      await logTimeline(supabase, data.workspaceId, userId, "resume_optimized", "Optimized resume generated", data.versionName ?? undefined);
      const updateWs = await supabase.from("application_workspaces")
        .update({ current_stage: "resume_optimization", progress_percent: 70 })
        .eq("id", data.workspaceId);
      if (updateWs.error) throwDb(updateWs.error, "Could not update workspace after resume generation");

      return { versionId: ins.data.id as string };
    } catch (err) {
      await logGeneration(supabase, userId, data.workspaceId, "resume_optimization", null, "google/gemini-3-flash-preview", "-", "error",
        err instanceof Error ? err.message : "unknown");
      throw err;
    }
  });

export const listResumeVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const rows = await supabase.from("resume_versions")
      .select("id, version_name, target_company, target_job_title, generation_reason, ats_score, readiness_score, keywords_added, is_active, ai_model, created_at")
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return rows.data ?? [];
  });

export const getResumeVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const r = await supabase.from("resume_versions").select("*")
      .eq("id", data.versionId).eq("user_id", userId).maybeSingle();
    if (!r.data) throw new Error("Version not found");
    return r.data;
  });

export const setActiveResumeVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versionId: z.string().uuid(), workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("resume_versions").update({ is_active: false })
      .eq("workspace_id", data.workspaceId).eq("user_id", userId);
    await supabase.from("resume_versions").update({ is_active: true })
      .eq("id", data.versionId).eq("user_id", userId);
    return { ok: true };
  });

// ---------- Cover Letter ----------

export const generateCoverLetterFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    workspaceId: z.string().uuid(),
    style: z.enum(COVER_STYLES),
    resumeVersionId: z.string().uuid().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { ws, job, brain, resume: sourceResume } = await loadWorkspaceContext(supabase, userId, data.workspaceId);
    const intel = ws.company_id
      ? (await supabase.from("company_intelligence").select("*").eq("company_id", ws.company_id).maybeSingle()).data
      : null;

    try {
      const { letter, model, inputHash } = await generateCoverLetter({
        job, brain, sourceResume, style: data.style as CoverLetterStyle, companyIntel: intel,
      });

      const deactivate = await supabase.from("cover_letters").update({ is_active: false })
        .eq("workspace_id", data.workspaceId).eq("user_id", userId).eq("is_active", true);
      if (deactivate.error) throwDb(deactivate.error, "Could not deactivate previous cover letter");

      const ins = await supabase.from("cover_letters").insert({
        user_id: userId,
        workspace_id: data.workspaceId,
        job_id: ws.job_id,
        company_id: ws.company_id,
        resume_version_id: data.resumeVersionId ?? null,
        style: data.style,
        greeting: letter.greeting,
        body: letter.body,
        closing: letter.closing,
        highlights: letter.highlights ?? [],
        tone_notes: letter.tone_notes ?? null,
        ai_model: model,
        input_hash: inputHash,
        is_active: true,
      }).select("id").single();
      if (ins.error) throw new Error(ins.error.message);

      await logGeneration(supabase, userId, data.workspaceId, "cover_letter", ins.data.id, model, inputHash, "success");
      await logTimeline(supabase, data.workspaceId, userId, "cover_letter_generated", `Cover letter drafted (${data.style})`);
      const updateWs = await supabase.from("application_workspaces")
        .update({ current_stage: "ready_for_cover_letter", progress_percent: 80 })
        .eq("id", data.workspaceId);
      if (updateWs.error) throwDb(updateWs.error, "Could not update workspace after cover letter generation");

      return { letterId: ins.data.id as string };
    } catch (err) {
      await logGeneration(supabase, userId, data.workspaceId, "cover_letter", null, "google/gemini-3-flash-preview", "-", "error",
        err instanceof Error ? err.message : "unknown");
      throw err;
    }
  });

export const listCoverLetters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const r = await supabase.from("cover_letters")
      .select("id, style, greeting, body, closing, highlights, tone_notes, is_active, ai_model, created_at")
      .eq("workspace_id", data.workspaceId).eq("user_id", userId)
      .order("created_at", { ascending: false });
    return r.data ?? [];
  });

export const updateCoverLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    letterId: z.string().uuid(),
    greeting: z.string().max(400).optional(),
    body: z.string().max(20_000).optional(),
    closing: z.string().max(400).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.greeting !== undefined) patch.greeting = data.greeting;
    if (data.body !== undefined) patch.body = data.body;
    if (data.closing !== undefined) patch.closing = data.closing;
    await (supabase.from("cover_letters") as any).update(patch).eq("id", data.letterId).eq("user_id", userId);
    return { ok: true };
  });

// ---------- Screening Answers ----------

export const generateStandardScreening = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { ws, job, brain, resume: sourceResume } = await loadWorkspaceContext(supabase, userId, data.workspaceId);
    const questions = standardScreeningQuestions();

    try {
      const { answers, model, inputHash } = await generateScreeningAnswers({ job, brain, sourceResume, questions });

      const rows = answers.map((a) => ({
        user_id: userId,
        workspace_id: data.workspaceId,
        job_id: ws.job_id,
        kind: a.kind,
        question: a.question,
        answer: a.answer,
        key_points: a.key_points ?? [],
        edited: false,
        ai_model: model,
        input_hash: inputHash,
      }));
      if (!rows.length) throw new Error("AI returned no screening answers");

      // Only replace non-edited generated answers after the new AI output has been validated.
      const del = await supabase.from("screening_answers").delete()
        .eq("workspace_id", data.workspaceId).eq("user_id", userId).eq("edited", false);
      if (del.error) throwDb(del.error, "Could not clear old screening answers");

      if (rows.length) {
        const ins = await supabase.from("screening_answers").insert(rows);
        if (ins.error) throwDb(ins.error, "Could not save screening answers");
      }

      await logGeneration(supabase, userId, data.workspaceId, "screening_answer", null, model, inputHash, "success",
        undefined, { count: rows.length });
      await logTimeline(supabase, data.workspaceId, userId, "screening_generated", `${rows.length} screening answers drafted`);

      return { count: rows.length };
    } catch (err) {
      await logGeneration(supabase, userId, data.workspaceId, "screening_answer", null, "google/gemini-3-flash-preview", "-", "error",
        err instanceof Error ? err.message : "unknown");
      throw err;
    }
  });

export const answerCustomQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    workspaceId: z.string().uuid(),
    question: z.string().min(3).max(1000),
    kind: z.enum(SCREENING_KINDS).default("custom_paragraph"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { ws, job, brain, resume: sourceResume } = await loadWorkspaceContext(supabase, userId, data.workspaceId);

    const { answers, model, inputHash } = await generateScreeningAnswers({
      job, brain, sourceResume,
      questions: [{ kind: data.kind as ScreeningKind, question: data.question }],
    });
    const a = answers[0];
    if (!a) throw new Error("AI returned no answer");

    const ins = await supabase.from("screening_answers").insert({
      user_id: userId,
      workspace_id: data.workspaceId,
      job_id: ws.job_id,
      kind: data.kind,
      question: data.question,
      answer: a.answer,
      key_points: a.key_points ?? [],
      edited: false,
      ai_model: model,
      input_hash: inputHash,
    }).select("id").single();
    if (ins.error) throwDb(ins.error, "Could not save custom screening answer");

    await logGeneration(supabase, userId, data.workspaceId, "custom_question", ins.data?.id ?? null, model, inputHash, "success");
    return { id: ins.data?.id, answer: a.answer };
  });

export const listScreeningAnswers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const r = await supabase.from("screening_answers")
      .select("*").eq("workspace_id", data.workspaceId).eq("user_id", userId)
      .order("created_at", { ascending: true });
    return r.data ?? [];
  });

export const updateScreeningAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    answer: z.string().max(6000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("screening_answers")
      .update({ answer: data.answer, edited: true, updated_at: new Date().toISOString() })
      .eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

// ---------- Interview Prep ----------

export const generateInterviewSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    workspaceId: z.string().uuid(),
    focus: z.string().max(200).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { ws, job, brain, resume: sourceResume } = await loadWorkspaceContext(supabase, userId, data.workspaceId);

    try {
      const { questions, model, inputHash } = await generateInterviewPack({
        job, brain, sourceResume, focus: data.focus ?? null,
      });

      const session = await supabase.from("interview_sessions").insert({
        user_id: userId,
        workspace_id: data.workspaceId,
        job_id: ws.job_id,
        company_id: ws.company_id,
        focus: data.focus ?? null,
        ai_model: model,
        input_hash: inputHash,
        total_questions: questions.length,
      }).select("id").single();
      if (session.error) throw new Error(session.error.message);

      const rows = questions.map((q, idx) => ({
        user_id: userId,
        session_id: session.data.id,
        workspace_id: data.workspaceId,
        category: q.category,
        difficulty: q.difficulty,
        question: q.question,
        suggested_answer: q.suggested_answer,
        key_points: q.key_points ?? [],
        common_mistakes: q.common_mistakes ?? [],
        confidence_tips: q.confidence_tips ?? [],
        follow_ups: q.follow_ups ?? [],
        ordering: idx,
      }));
      if (rows.length) {
        const insQuestions = await supabase.from("interview_questions").insert(rows);
        if (insQuestions.error) throwDb(insQuestions.error, "Could not save interview questions");
      }

      await logGeneration(supabase, userId, data.workspaceId, "interview_session", session.data.id, model, inputHash, "success",
        undefined, { count: rows.length });
      await logTimeline(supabase, data.workspaceId, userId, "interview_prep_generated", `Interview pack: ${rows.length} questions`);
      const updateWs = await supabase.from("application_workspaces")
        .update({ current_stage: "ready_for_interview", progress_percent: 90 })
        .eq("id", data.workspaceId);
      if (updateWs.error) throwDb(updateWs.error, "Could not update workspace after interview generation");

      return { sessionId: session.data.id as string, count: rows.length };
    } catch (err) {
      await logGeneration(supabase, userId, data.workspaceId, "interview_session", null, "google/gemini-3-flash-preview", "-", "error",
        err instanceof Error ? err.message : "unknown");
      throw err;
    }
  });

export const listInterviewSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const s = await supabase.from("interview_sessions")
      .select("*")
      .eq("workspace_id", data.workspaceId).eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!s.data?.length) return [];
    const qs = await supabase.from("interview_questions")
      .select("*")
      .in("session_id", s.data.map((x: any) => x.id))
      .order("ordering", { ascending: true });
    const bySession = new Map<string, any[]>();
    for (const q of qs.data ?? []) {
      const arr = bySession.get(q.session_id) ?? [];
      arr.push(q); bySession.set(q.session_id, arr);
    }
    return s.data.map((sess: any) => ({ ...sess, questions: bySession.get(sess.id) ?? [] }));
  });

export const markQuestionPracticed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    practiced: z.boolean(),
    user_notes: z.string().max(4000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("interview_questions").update({
      practiced: data.practiced,
      user_notes: data.user_notes ?? null,
      updated_at: new Date().toISOString(),
    }).eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

// ---------- Application Package ----------

export const buildApplicationPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { ws } = await loadWorkspaceContext(supabase, userId, data.workspaceId);

    try {
      const [rv, cl, ss, sc, rd, ats] = await Promise.all([
        supabase.from("resume_versions").select("id").eq("workspace_id", data.workspaceId).eq("user_id", userId).eq("is_active", true).maybeSingle(),
        supabase.from("cover_letters").select("id").eq("workspace_id", data.workspaceId).eq("user_id", userId).eq("is_active", true).maybeSingle(),
        supabase.from("interview_sessions").select("id").eq("workspace_id", data.workspaceId).eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("screening_answers").select("id").eq("workspace_id", data.workspaceId).eq("user_id", userId),
        supabase.from("application_readiness").select("overall_score").eq("workspace_id", data.workspaceId).eq("user_id", userId).maybeSingle(),
        supabase.from("ats_analysis").select("overall_score").eq("workspace_id", data.workspaceId).eq("user_id", userId).maybeSingle(),
      ]);
      if (rv.error) throwDb(rv.error, "Could not load active resume version");
      if (cl.error) throwDb(cl.error, "Could not load active cover letter");
      if (ss.error) throwDb(ss.error, "Could not load interview session");
      if (sc.error) throwDb(sc.error, "Could not load screening answers");
      if (rd.error) throwDb(rd.error, "Could not load readiness score");
      if (ats.error) throwDb(ats.error, "Could not load ATS score");

      if (!rv.data) throw new Error("Cannot build package before an optimized resume is generated.");
      if (!cl.data) throw new Error("Cannot build package before a cover letter is generated.");
      if (!ss.data) throw new Error("Cannot build package before interview prep is generated.");

      const screeningIds = (sc.data ?? []).map((x: any) => x.id);
      if (!screeningIds.length) throw new Error("Cannot build package before screening answers are generated.");
      const inputHash = await sha256(JSON.stringify({
        workspaceId: data.workspaceId,
        resumeVersionId: rv.data.id,
        coverLetterId: cl.data.id,
        interviewSessionId: ss.data.id,
        screeningIds,
      }));

      const ins = await supabase.from("application_packages").insert({
        user_id: userId,
        workspace_id: data.workspaceId,
        resume_version_id: rv.data.id,
        cover_letter_id: cl.data.id,
        interview_session_id: ss.data.id,
        screening_answer_ids: screeningIds,
        readiness_score: rd.data?.overall_score ?? null,
        ats_score: ats.data?.overall_score ?? null,
        summary: {
          has_resume: !!rv.data,
          has_cover_letter: !!cl.data,
          has_interview_prep: !!ss.data,
          screening_count: screeningIds.length,
        },
        status: "ready",
      }).select("id").single();
      if (ins.error) throwDb(ins.error, "Could not save application package");

      const updateWs = await supabase.from("application_workspaces")
        .update({ current_stage: "application_ready", progress_percent: 100, status: "ready" })
        .eq("id", data.workspaceId)
        .eq("user_id", userId);
      if (updateWs.error) throwDb(updateWs.error, "Could not update workspace after package build");

      await logGeneration(supabase, userId, data.workspaceId, "application_package", ins.data.id, "system", inputHash, "success", undefined, {
        has_resume: true,
        has_cover_letter: true,
        has_interview_prep: true,
        screening_count: screeningIds.length,
      });
      await logTimeline(supabase, data.workspaceId, userId, "application_package_ready", "Application package assembled");
      void ws;
      return { packageId: ins.data.id as string };
    } catch (err) {
      await logGeneration(supabase, userId, data.workspaceId, "application_package", null, "system", "-", "error",
        err instanceof Error ? err.message : "unknown");
      throw err;
    }
  });

export const exportApplicationPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    workspaceId: z.string().uuid(),
    format: z.enum(["txt", "pdf", "docx"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { ws, job } = await loadWorkspaceContext(supabase, userId, data.workspaceId);
    const [rv, cl, screening, sessions, latestPackage] = await Promise.all([
      supabase.from("resume_versions").select("*")
        .eq("workspace_id", data.workspaceId).eq("user_id", userId).eq("is_active", true).maybeSingle(),
      supabase.from("cover_letters").select("*")
        .eq("workspace_id", data.workspaceId).eq("user_id", userId).eq("is_active", true).maybeSingle(),
      supabase.from("screening_answers").select("*")
        .eq("workspace_id", data.workspaceId).eq("user_id", userId).order("created_at", { ascending: true }),
      supabase.from("interview_sessions").select("*")
        .eq("workspace_id", data.workspaceId).eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("application_packages").select("id")
        .eq("workspace_id", data.workspaceId).eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (rv.error) throwDb(rv.error, "Could not load active resume version for export");
    if (cl.error) throwDb(cl.error, "Could not load active cover letter for export");
    if (screening.error) throwDb(screening.error, "Could not load screening answers for export");
    if (sessions.error) throwDb(sessions.error, "Could not load interview prep for export");
    if (latestPackage.error) throwDb(latestPackage.error, "Could not load application package for export");

    const questions = sessions.data?.id
      ? await supabase.from("interview_questions").select("*")
          .eq("session_id", sessions.data.id).eq("user_id", userId).order("ordering", { ascending: true })
      : { data: [], error: null };
    if (questions.error) throwDb(questions.error, "Could not load interview questions for export");

    if (!rv.data && !cl.data && !(screening.data ?? []).length && !sessions.data) {
      throw new Error("No generated application materials are available to export yet.");
    }

    const companyName = textValue((job.company as any)?.name) || textValue(ws.company_id) || "Company";
    const roleName = textValue(job.title) || "Role";
    const title = `${companyName} · ${roleName}`;
    const pieces = [
      `APPLICATION PACKAGE\n${title}\nGenerated by CareerOS\nPackage ID: ${latestPackage.data?.id ?? "pending"}\n`,
      rv.data ? formatOptimizedResume(rv.data) : "",
      cl.data ? formatCoverLetter(cl.data) : "",
      (screening.data ?? []).length ? formatScreening(screening.data ?? []) : "",
      sessions.data ? formatInterview(sessions.data, questions.data ?? []) : "",
    ].filter(Boolean);
    const content = pieces.join("\n\n---\n\n");
    const baseName = safeFilePart(`${companyName}-${roleName}-application-package`, "application-package");

    if (data.format === "txt") {
      return {
        fileName: `${baseName}.txt`,
        mimeType: "text/plain;charset=utf-8",
        base64: bytesToBase64(new TextEncoder().encode(content)),
      };
    }
    if (data.format === "docx") {
      return {
        fileName: `${baseName}.docx`,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        base64: bytesToBase64(createDocx(content)),
      };
    }
    return {
      fileName: `${baseName}.pdf`,
      mimeType: "application/pdf",
      base64: bytesToBase64(createPdf(content)),
    };
  });

// ---------- Assistant snapshot (used by the UI tabs) ----------

export const getAssistantSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [versions, letters, screening, sessions, packages] = await Promise.all([
      supabase.from("resume_versions")
        .select("id, version_name, ats_score, readiness_score, keywords_added, is_active, created_at, ai_model")
        .eq("workspace_id", data.workspaceId).eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("cover_letters")
        .select("id, style, greeting, body, closing, highlights, is_active, created_at")
        .eq("workspace_id", data.workspaceId).eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("screening_answers")
        .select("id, kind, question, answer, key_points, edited, created_at")
        .eq("workspace_id", data.workspaceId).eq("user_id", userId)
        .order("created_at", { ascending: true }),
      supabase.from("interview_sessions")
        .select("id, focus, total_questions, ai_model, created_at")
        .eq("workspace_id", data.workspaceId).eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("application_packages")
        .select("id, status, readiness_score, ats_score, created_at")
        .eq("workspace_id", data.workspaceId).eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);
    return {
      versions: versions.data ?? [],
      letters: letters.data ?? [],
      screening: screening.data ?? [],
      sessions: sessions.data ?? [],
      packages: packages.data ?? [],
    };
  });
