import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  STUDIO_SELECT,
  atsReport,
  buildDocFromBrain,
  defaultOrder,
  jobKeywords,
  loadJobContext,
  tailorDocForJob,
} from "@/lib/resume-studio/studio.server";
import {
  emptyDoc,
  normalizeDoc,
  normalizeSectionOrder,
  isTemplateId,
} from "@/lib/resume-studio/document";

export const listStudioResumes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const r = await supabase
      .from("resume_versions")
      .select(STUDIO_SELECT)
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false });
    if (r.error) throw new Error(`Could not load resumes: ${r.error.message}`);
    return r.data ?? [];
  });

export const getStudioResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const r = await supabase
      .from("resume_versions")
      .select(STUDIO_SELECT)
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (r.error) throw new Error(`Could not load resume: ${r.error.message}`);
    if (!r.data) throw new Error("Resume not found.");
    const row = r.data as Record<string, any>;
    const doc = normalizeDoc(row.optimized_content);
    const order = defaultOrder(row.section_order);
    return {
      meta: {
        id: String(row.id),
        name: String(row.version_name ?? ""),
        template: String(row.template ?? "ats_classic"),
        origin: String(row.origin ?? "scratch"),
        isDefault: Boolean(row.is_default),
        targetCompany: (row.target_company as string | null) ?? null,
        targetJobTitle: (row.target_job_title as string | null) ?? null,
        atsScore: (row.ats_score as number | null) ?? null,
        keywordsAdded: (row.keywords_added as string[] | null) ?? [],
        aiModel: (row.ai_model as string | null) ?? null,
        updatedAt: String(row.updated_at ?? ""),
      },
      doc,
      order,
      ats: atsReport(doc, order),
    };
  });


export const createStudioResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(120),
        mode: z.enum(["profile", "blank"]).default("profile"),
        template: z.string().default("ats_classic"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const doc =
      data.mode === "blank" ? emptyDoc() : (await buildDocFromBrain(supabase, userId)).doc;
    const order = defaultOrder();
    const report = atsReport(doc, order);
    const existing = await supabase
      .from("resume_versions")
      .select("id")
      .eq("user_id", userId)
      .limit(1);
    const ins = await supabase
      .from("resume_versions")
      .insert({
        user_id: userId,
        version_name: data.name,
        optimized_content: doc as unknown as Record<string, unknown>,
        section_order: order,
        template: isTemplateId(data.template) ? data.template : "ats_classic",
        origin: data.mode === "blank" ? "scratch" : "profile",
        is_default: (existing.data ?? []).length === 0,
        ats_score: report.score,
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(`Could not create resume: ${ins.error.message}`);
    return { id: ins.data.id as string };
  });

export const saveStudioResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(120).optional(),
        template: z.string().optional(),
        sectionOrder: z.array(z.string()).optional(),
        content: z.unknown().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) patch.version_name = data.name;
    if (data.template !== undefined && isTemplateId(data.template)) patch.template = data.template;
    let order = data.sectionOrder ? normalizeSectionOrder(data.sectionOrder) : undefined;
    if (order) patch.section_order = order;
    if (data.content !== undefined) {
      const doc = normalizeDoc(data.content);
      patch.optimized_content = doc as unknown as Record<string, unknown>;
      if (!order) {
        const current = await supabase
          .from("resume_versions")
          .select("section_order")
          .eq("id", data.id)
          .eq("user_id", userId)
          .maybeSingle();
        order = defaultOrder(current.data?.section_order);
      }
      patch.ats_score = atsReport(doc, order).score;
    }
    const up = await supabase
      .from("resume_versions")
      .update(patch as never)
      .eq("id", data.id)
      .eq("user_id", userId);
    if (up.error) throw new Error(`Could not save resume: ${up.error.message}`);
    return { ok: true, atsScore: (patch.ats_score as number | undefined) ?? null };
  });

export const duplicateStudioResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const src = await supabase
      .from("resume_versions")
      .select(STUDIO_SELECT)
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!src.data) throw new Error("Resume not found.");
    const row = src.data as Record<string, any>;
    const ins = await supabase
      .from("resume_versions")
      .insert({
        user_id: userId,
        version_name: `${row.version_name} (copy)`,
        optimized_content: row.optimized_content ?? {},
        section_order: row.section_order ?? [],
        template: row.template ?? "ats_classic",
        origin: row.origin ?? "scratch",
        target_company: row.target_company,
        target_job_title: row.target_job_title,
        ats_score: row.ats_score,
        keywords_added: row.keywords_added ?? [],
        is_default: false,
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(`Could not duplicate: ${ins.error.message}`);
    return { id: ins.data.id as string };
  });

export const deleteStudioResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const del = await supabase
      .from("resume_versions")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (del.error) throw new Error(`Could not delete: ${del.error.message}`);
    return { ok: true };
  });

export const setDefaultStudioResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("resume_versions")
      .update({ is_default: false } as never)
      .eq("user_id", userId)
      .eq("is_default", true);
    const up = await supabase
      .from("resume_versions")
      .update({ is_default: true } as never)
      .eq("id", data.id)
      .eq("user_id", userId);
    if (up.error) throw new Error(`Could not set default: ${up.error.message}`);
    return { ok: true };
  });

export const refreshStudioFromBrain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { doc } = await buildDocFromBrain(supabase, userId);
    const current = await supabase
      .from("resume_versions")
      .select("section_order")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    const order = defaultOrder(current.data?.section_order);
    const up = await supabase
      .from("resume_versions")
      .update({
        optimized_content: doc as unknown as Record<string, unknown>,
        ats_score: atsReport(doc, order).score,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", data.id)
      .eq("user_id", userId);
    if (up.error) throw new Error(`Could not refresh: ${up.error.message}`);
    return { ok: true };
  });

export const scoreStudioResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), jobId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const r = await supabase
      .from("resume_versions")
      .select("optimized_content, section_order")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!r.data) throw new Error("Resume not found.");
    const doc = normalizeDoc((r.data as Record<string, unknown>).optimized_content);
    const order = defaultOrder((r.data as Record<string, unknown>).section_order);
    const keywords = data.jobId ? jobKeywords(await loadJobContext(supabase, data.jobId)) : [];
    return atsReport(doc, order, keywords);
  });

export const tailorStudioResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        jobId: z.string().uuid(),
        sourceId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const job = await loadJobContext(supabase, data.jobId);

    let baseDoc;
    let order = defaultOrder();
    let template = "ats_classic";
    if (data.sourceId) {
      const src = await supabase
        .from("resume_versions")
        .select("optimized_content, section_order, template")
        .eq("id", data.sourceId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!src.data) throw new Error("Source resume not found.");
      const row = src.data as Record<string, any>;
      baseDoc = normalizeDoc(row.optimized_content);
      order = defaultOrder(row.section_order);
      template = row.template ?? template;
    } else {
      baseDoc = (await buildDocFromBrain(supabase, userId)).doc;
    }

    const tailored = await tailorDocForJob(baseDoc, order, job);
    const report = atsReport(tailored.doc, order, jobKeywords(job));
    const name = `${job.title}${job.companyName ? ` — ${job.companyName}` : ""}`.slice(0, 120);

    const ins = await supabase
      .from("resume_versions")
      .insert({
        user_id: userId,
        job_id: job.id,
        version_name: name,
        target_company: job.companyName,
        target_job_title: job.title,
        generation_reason: "job_tailored",
        optimized_content: tailored.doc as unknown as Record<string, unknown>,
        section_order: order,
        template,
        origin: "optimized",
        ats_score: report.score,
        keywords_added: tailored.keywords,
        ai_model: tailored.model,
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(`Could not save tailored resume: ${ins.error.message}`);

    return {
      id: ins.data.id as string,
      atsScore: report.score,
      missingKeywords: report.missingKeywords,
      notes: tailored.notes,
    };
  });
