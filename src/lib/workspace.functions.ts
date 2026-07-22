/**
 * Application Workspace server functions.
 *
 * openWorkspace: idempotent — returns existing workspace for (user,job) or creates one.
 * getWorkspace: full workspace payload (job, company, analyses, timeline, notes).
 * listWorkspaces: dashboard summary.
 * refreshAnalysis: runs the combined AI analysis + company intel; caches result.
 * addNote / deleteNote / updateNotes: workspace notes CRUD.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCareerBrainSnapshotFor } from "./career-brain.service";
import {
  runCombinedAnalysis,
  runCompanyIntel,
  type WorkspaceJob,
} from "./workspace/analysis.server";

const STAGE_ORDER = [
  "workspace_created",
  "company_analysis",
  "job_analysis",
  "resume_analysis",
  "ats_analysis",
  "gap_analysis",
  "resume_optimization",
  "ready_for_cover_letter",
  "ready_for_interview",
  "application_ready",
] as const;
type Stage = (typeof STAGE_ORDER)[number];

function progressFor(stage: Stage) {
  const idx = STAGE_ORDER.indexOf(stage);
  return Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
}

async function logTimeline(
  supabase: any,
  workspaceId: string,
  userId: string,
  event_type: string,
  title: string,
  extras: { stage?: Stage; description?: string; payload?: Record<string, unknown> } = {},
) {
  await supabase.from("application_timeline").insert({
    workspace_id: workspaceId,
    user_id: userId,
    event_type,
    stage: extras.stage ?? null,
    title,
    description: extras.description ?? null,
    payload: extras.payload ?? {},
  });
}

// ---------- open / create ----------

export const openWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const existing = await supabase
      .from("application_workspaces")
      .select("id")
      .eq("user_id", userId)
      .eq("job_id", data.jobId)
      .maybeSingle();

    if (existing.data?.id) {
      await supabase
        .from("application_workspaces")
        .update({ last_opened_at: new Date().toISOString() })
        .eq("id", existing.data.id);
      return { workspaceId: existing.data.id, created: false };
    }

    const job = await supabase
      .from("jobs")
      .select("id, company_id")
      .eq("id", data.jobId)
      .maybeSingle();
    if (!job.data) throw new Error("Job not found");

    const [resume, brain, match] = await Promise.all([
      supabase.from("resumes").select("id, version").eq("user_id", userId).eq("is_active", true).maybeSingle(),
      supabase.from("career_brain").select("version").eq("user_id", userId).maybeSingle(),
      supabase.from("job_matches").select("id").eq("user_id", userId).eq("job_id", data.jobId).maybeSingle(),
    ]);

    const insert = await supabase
      .from("application_workspaces")
      .insert({
        user_id: userId,
        job_id: data.jobId,
        company_id: job.data.company_id,
        resume_id: resume.data?.id ?? null,
        resume_version: resume.data?.version ?? null,
        career_brain_version: (brain.data?.version as number | null) ?? null,
        match_id: match.data?.id ?? null,
        status: "created",
        current_stage: "workspace_created",
        progress_percent: progressFor("workspace_created"),
      })
      .select("id")
      .single();

    if (insert.error) throw new Error(insert.error.message);

    await logTimeline(supabase, insert.data.id, userId, "workspace_created", "Application Workspace created", {
      stage: "workspace_created",
    });

    return { workspaceId: insert.data.id as string, created: true };
  });

// ---------- get ----------

export const getWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ws = await supabase
      .from("application_workspaces")
      .select("*")
      .eq("id", data.workspaceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!ws.data) return null;

    const [job, company, analysis, ats, gap, readiness, notes, timeline, companyIntel] = await Promise.all([
      supabase
        .from("jobs")
        .select("*, company:companies(id,name,slug,logo_url,industry,size,remote_policy,tech_stack,description,website)")
        .eq("id", ws.data.job_id)
        .maybeSingle(),
      ws.data.company_id
        ? supabase.from("companies").select("*").eq("id", ws.data.company_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("application_analysis").select("*").eq("workspace_id", ws.data.id).maybeSingle(),
      supabase.from("ats_analysis").select("*").eq("workspace_id", ws.data.id).maybeSingle(),
      supabase.from("gap_analysis").select("*").eq("workspace_id", ws.data.id).maybeSingle(),
      supabase.from("application_readiness").select("*").eq("workspace_id", ws.data.id).maybeSingle(),
      supabase.from("application_notes").select("*").eq("workspace_id", ws.data.id).order("created_at", { ascending: false }),
      supabase.from("application_timeline").select("*").eq("workspace_id", ws.data.id).order("created_at", { ascending: false }).limit(50),
      ws.data.company_id
        ? supabase.from("company_intelligence").select("*").eq("company_id", ws.data.company_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const match = ws.data.match_id
      ? (await supabase.from("job_matches").select("*").eq("id", ws.data.match_id).maybeSingle()).data
      : null;

    return {
      workspace: ws.data,
      job: job.data,
      company: company.data,
      match,
      analysis: analysis.data,
      ats: ats.data,
      gap: gap.data,
      readiness: readiness.data,
      companyIntel: companyIntel.data,
      notes: notes.data ?? [],
      timeline: timeline.data ?? [],
    };
  });

// ---------- list ----------

export const listWorkspaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const rows = await supabase
      .from("application_workspaces")
      .select("id, job_id, company_id, current_stage, progress_percent, readiness_score, resume_version, status, last_opened_at, updated_at, job:jobs(title,location,remote_status), company:companies(name,logo_url), ats:ats_analysis(overall_score)")
      .eq("user_id", userId)
      .order("last_opened_at", { ascending: false })
      .limit(50);
    // Flatten ats join to a plain ats_score field for the UI.
    return (rows.data ?? []).map((w: any) => ({
      ...w,
      ats_score: Array.isArray(w.ats) ? (w.ats[0]?.overall_score ?? null) : (w.ats?.overall_score ?? null),
    }));
  });

// ---------- refresh analysis ----------

export const refreshWorkspaceAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ workspaceId: z.string().uuid(), force: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const ws = await supabase
      .from("application_workspaces")
      .select("*")
      .eq("id", data.workspaceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!ws.data) throw new Error("Workspace not found");

    const [job, brain, existingAnalysis] = await Promise.all([
      supabase
        .from("jobs")
        .select("id, title, description, location, remote_status, employment_type, experience_level, required_skills, preferred_skills, company:companies(id,name,industry,size,remote_policy,tech_stack,description,website)")
        .eq("id", ws.data.job_id)
        .maybeSingle(),
      getCareerBrainSnapshotFor(supabase, userId),
      supabase.from("application_analysis").select("input_hash").eq("workspace_id", data.workspaceId).maybeSingle(),
    ]);
    if (!job.data) throw new Error("Job not found");
    if (!brain.ready) throw new Error("Career Brain not ready — approve your resume first.");

    // Combined analysis (job intel + resume + ATS + gap + readiness in one call)
    const { analysis, model, inputHash } = await runCombinedAnalysis(job.data as WorkspaceJob, brain);

    if (!data.force && existingAnalysis.data?.input_hash === inputHash) {
      // Nothing changed, skip.
      return { skipped: true };
    }

    const nowIso = new Date().toISOString();

    // Persist analyses
    await supabase.from("application_analysis").upsert(
      {
        workspace_id: data.workspaceId,
        user_id: userId,
        job_intelligence: analysis.jobIntelligence,
        resume_analysis: analysis.resumeAnalysis,
        ai_model: model,
        input_hash: inputHash,
        updated_at: nowIso,
      },
      { onConflict: "workspace_id" },
    );
    await supabase.from("ats_analysis").upsert(
      {
        workspace_id: data.workspaceId,
        user_id: userId,
        overall_score: analysis.atsAnalysis.overall_score,
        keyword_coverage: analysis.atsAnalysis.keyword_coverage,
        keyword_density: analysis.atsAnalysis.keyword_density,
        formatting_score: analysis.atsAnalysis.formatting_score,
        matched_keywords: analysis.atsAnalysis.matched_keywords ?? [],
        missing_keywords: analysis.atsAnalysis.missing_keywords ?? [],
        required_skills_coverage: analysis.atsAnalysis.required_skills_coverage,
        preferred_skills_coverage: analysis.atsAnalysis.preferred_skills_coverage,
        technology_coverage: analysis.atsAnalysis.technology_coverage,
        section_completeness: analysis.atsAnalysis.section_completeness,
        suggestions: analysis.atsAnalysis.suggestions ?? [],
        ai_model: model,
        updated_at: nowIso,
      },
      { onConflict: "workspace_id" },
    );
    await supabase.from("gap_analysis").upsert(
      {
        workspace_id: data.workspaceId,
        user_id: userId,
        mastered_skills: analysis.gapAnalysis.mastered ?? [],
        partial_skills: analysis.gapAnalysis.partial ?? [],
        missing_skills: analysis.gapAnalysis.missing ?? [],
        high_priority: analysis.gapAnalysis.high_priority ?? [],
        recommended_next: analysis.gapAnalysis.recommended_next ?? [],
        ai_model: model,
        updated_at: nowIso,
      },
      { onConflict: "workspace_id" },
    );
    await supabase.from("application_readiness").upsert(
      {
        workspace_id: data.workspaceId,
        user_id: userId,
        overall_score: analysis.readiness.overall_score,
        resume_quality: analysis.readiness.resume_quality,
        ats_compatibility: analysis.readiness.ats_compatibility,
        skill_match: analysis.readiness.skill_match,
        technology_match: analysis.readiness.technology_match,
        project_match: analysis.readiness.project_match,
        experience_match: analysis.readiness.experience_match,
        brain_alignment: analysis.readiness.brain_alignment,
        company_alignment: analysis.readiness.company_alignment,
        competitiveness: analysis.readiness.competitiveness,
        strengths: analysis.readiness.strengths ?? [],
        weaknesses: analysis.readiness.weaknesses ?? [],
        top_improvements: analysis.readiness.top_improvements ?? [],
        recommendations: analysis.readiness.recommendations ?? [],
        ai_model: model,
        updated_at: nowIso,
      },
      { onConflict: "workspace_id" },
    );

    // Progress workspace to gap_analysis stage; overall readiness score cached.
    await supabase
      .from("application_workspaces")
      .update({
        current_stage: "gap_analysis",
        progress_percent: progressFor("gap_analysis"),
        readiness_score: analysis.readiness.overall_score,
        status: "analyzed",
      })
      .eq("id", data.workspaceId);

    await logTimeline(supabase, data.workspaceId, userId, "analysis_completed", "AI analysis complete", {
      stage: "gap_analysis",
      description: `Readiness ${analysis.readiness.overall_score} · ATS ${analysis.atsAnalysis.overall_score}`,
      payload: { model },
    });

    // Company intelligence (per company; shared cache; skip if fresh <30d)
    if (ws.data.company_id && job.data.company) {
      const cached = await supabase
        .from("company_intelligence")
        .select("refreshed_at")
        .eq("company_id", ws.data.company_id)
        .maybeSingle();
      const stale =
        !cached.data ||
        Date.now() - new Date(cached.data.refreshed_at as string).getTime() > 30 * 24 * 3600 * 1000;
      if (stale) {
        try {
          const { intel, model: cmodel } = await runCompanyIntel({
            name: job.data.company.name ?? "Unknown",
            industry: job.data.company.industry,
            size: job.data.company.size,
            remote_policy: job.data.company.remote_policy,
            tech_stack: (Array.isArray(job.data.company.tech_stack) ? (job.data.company.tech_stack as string[]) : []),
            description: (job.data.company as any).description ?? null,
            website: (job.data.company as any).website ?? null,
            headquarters: null,
          });
          await supabase.from("company_intelligence").upsert(
            {
              company_id: ws.data.company_id,
              overview: intel.overview,
              industry: intel.industry,
              size: intel.size,
              engineering_culture: intel.engineering_culture,
              products: intel.products ?? [],
              tech_stack: intel.tech_stack ?? [],
              remote_policy: intel.remote_policy,
              hiring_style: intel.hiring_style,
              values: intel.values ?? [],
              funding_stage: intel.funding_stage,
              headquarters: intel.headquarters,
              website: intel.website,
              ai_model: cmodel,
              refreshed_at: nowIso,
              updated_at: nowIso,
            },
            { onConflict: "company_id" },
          );
          await logTimeline(supabase, data.workspaceId, userId, "company_intel_refreshed", "Company intelligence refreshed", {
            stage: "company_analysis",
          });
        } catch (err) {
          // Non-fatal — analysis is the primary output.
          await logTimeline(supabase, data.workspaceId, userId, "company_intel_failed", "Company intelligence unavailable", {
            description: err instanceof Error ? err.message : "unknown",
          });
        }
      }
    }

    return { skipped: false, readiness: analysis.readiness.overall_score };
  });

// ---------- notes ----------

const NoteSchema = z.object({
  workspaceId: z.string().uuid(),
  kind: z.enum(["interview", "recruiter", "link", "salary", "reminder", "general"]).default("general"),
  title: z.string().max(200).optional(),
  body: z.string().max(8000).optional(),
  remind_at: z.string().datetime().optional(),
});

export const addWorkspaceNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => NoteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Ownership check
    const ws = await supabase
      .from("application_workspaces")
      .select("id")
      .eq("id", data.workspaceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!ws.data) throw new Error("Workspace not found");
    const ins = await supabase
      .from("application_notes")
      .insert({
        workspace_id: data.workspaceId,
        user_id: userId,
        kind: data.kind,
        title: data.title ?? null,
        body: data.body ?? null,
        remind_at: data.remind_at ?? null,
      })
      .select("*")
      .single();
    if (ins.error) throw new Error(ins.error.message);
    await logTimeline(supabase, data.workspaceId, userId, "note_added", `Note added${data.title ? `: ${data.title}` : ""}`);
    return ins.data;
  });

export const deleteWorkspaceNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ noteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("application_notes").delete().eq("id", data.noteId).eq("user_id", userId);
    return { ok: true };
  });
