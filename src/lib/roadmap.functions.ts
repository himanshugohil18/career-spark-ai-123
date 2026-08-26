import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCareerBrainSnapshotFor } from "./career-brain-logic.server";
import { generateRoadmapItems, generateProjectRecommendations } from "./intelligence/roadmap.server";

export const getRoadmap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const roadmap = await supabase
      .from("career_roadmaps")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!roadmap.data) return { roadmap: null, items: [], projects: [] };
    const [items, projects] = await Promise.all([
      supabase
        .from("career_roadmap_items")
        .select("*")
        .eq("roadmap_id", roadmap.data.id)
        .order("phase", { ascending: true })
        .order("sort_order", { ascending: true }),
      supabase
        .from("project_recommendations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    return { roadmap: roadmap.data, items: items.data ?? [], projects: projects.data ?? [] };
  });

export const createRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        targetRole: z.string().min(2),
        targetLocation: z.string().optional(),
        targetSalary: z.string().optional(),
        targetTimeline: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const brain = await getCareerBrainSnapshotFor(supabase, userId);

    // Archive previous active roadmaps
    await supabase
      .from("career_roadmaps")
      .update({ status: "archived" })
      .eq("user_id", userId)
      .eq("status", "active");

    const created = await supabase
      .from("career_roadmaps")
      .insert({
        user_id: userId,
        title: `${brain.identity.currentTitle ?? "Current"} → ${data.targetRole}`,
        present_role: brain.identity.currentTitle,
        target_role: data.targetRole,
        target_location: data.targetLocation ?? null,
        target_salary: data.targetSalary ?? null,
        target_timeline: data.targetTimeline ?? null,
        ai_model: "google/gemini-3-flash-preview",
      })
      .select("id")
      .single();
    if (created.error) throw new Error(created.error.message);

    const generated = await generateRoadmapItems(
      {
        currentRole: brain.identity.currentTitle,
        targetRole: data.targetRole,
        targetLocation: data.targetLocation,
        targetSalary: data.targetSalary,
        targetTimeline: data.targetTimeline,
      },
      brain,
    );

    if (generated.length > 0) {
      const rows = generated.map((g, i) => ({
        roadmap_id: created.data.id,
        user_id: userId,
        phase: g.phase,
        phase_label: g.phaseLabel,
        title: g.title,
        description: g.description,
        item_type: g.itemType,
        skills: g.skills ?? [],
        sort_order: i,
      }));
      const ins = await supabase.from("career_roadmap_items").insert(rows);
      if (ins.error) throw new Error(ins.error.message);
    }
    return { id: created.data.id, itemCount: generated.length };
  });

export const updateRoadmapItemStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        itemId: z.string(),
        status: z.enum(["not_started", "in_progress", "completed", "skipped"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const res = await supabase
      .from("career_roadmap_items")
      .update({ status: data.status })
      .eq("id", data.itemId)
      .eq("user_id", userId);
    if (res.error) throw new Error(res.error.message);
    // Recompute roadmap progress
    const item = await supabase
      .from("career_roadmap_items")
      .select("roadmap_id")
      .eq("id", data.itemId)
      .single();
    if (item.data) {
      const siblings = await supabase
        .from("career_roadmap_items")
        .select("status")
        .eq("roadmap_id", item.data.roadmap_id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const all = (siblings.data ?? []) as any[];
      const done = all.filter((s) => s.status === "completed").length;
      await supabase
        .from("career_roadmaps")
        .update({ progress: all.length === 0 ? 0 : Math.round((done / all.length) * 100) })
        .eq("id", item.data.roadmap_id);
    }
    return { ok: true };
  });

export const addRoadmapItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        roadmapId: z.string(),
        title: z.string().min(2),
        phase: z.number().int().min(1),
        itemType: z.string().optional(),
        description: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const res = await supabase.from("career_roadmap_items").insert({
      roadmap_id: data.roadmapId,
      user_id: userId,
      phase: data.phase,
      title: data.title,
      item_type: data.itemType ?? "skill",
      description: data.description ?? null,
      sort_order: 999,
    });
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });

export const generateProjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const brain = await getCareerBrainSnapshotFor(supabase, userId);
    const targetRole =
      brain.identity.preferences.preferredRole ?? brain.identity.currentTitle ?? "Software Engineer";

    // Gather top missing skills from recent gap analyses + top matches
    const gaps = await supabase
      .from("gap_analysis")
      .select("missing")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    const missing = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const g of (gaps.data ?? []) as any[]) {
      for (const m of Array.isArray(g.missing) ? g.missing : []) {
        const name = m?.skill ?? m?.name;
        if (name) missing.add(String(name));
      }
    }

    const generated = await generateProjectRecommendations(targetRole, [...missing], brain);
    // Replace stale AI suggestions, keep ones the user started
    await supabase
      .from("project_recommendations")
      .delete()
      .eq("user_id", userId)
      .eq("status", "suggested");
    if (generated.length > 0) {
      const rows = generated.map((p) => ({
        user_id: userId,
        name: p.name,
        difficulty: p.difficulty,
        description: p.description,
        why_recommended: p.whyRecommended,
        architecture_overview: p.architectureOverview,
        skills_covered: p.skillsCovered ?? [],
        tech_stack: p.techStack ?? [],
        learning_goals: p.learningGoals ?? [],
        checklist: (p.checklist ?? []).map((c) => ({ label: c, done: false })),
        source: "ai",
      }));
      const ins = await supabase.from("project_recommendations").insert(rows);
      if (ins.error) throw new Error(ins.error.message);
    }
    return { count: generated.length };
  });

export const updateProjectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string(),
        status: z.enum(["suggested", "planned", "in_progress", "completed"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const res = await supabase
      .from("project_recommendations")
      .update({ status: data.status })
      .eq("id", data.projectId)
      .eq("user_id", userId);
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });
