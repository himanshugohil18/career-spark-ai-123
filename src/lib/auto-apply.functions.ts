import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { stepProgress } from "./auto-apply/driver";

// ---- Start ---------------------------------------------------------------

export const startAutoApply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { startAutoApplySession } = await import("./auto-apply/orchestrator.server");
    // Never derive the worker callback origin from the incoming request
    // (Host header is client-controllable and the worker secret is sent to it).
    const configured = process.env.APP_URL ?? "";
    let origin = "https://careerosai.site";
    try {
      if (configured) origin = new URL(configured).origin;
    } catch {
      /* fall back to the canonical production origin */
    }
    return startAutoApplySession({
      supabase: context.supabase,
      userId: context.userId,
      workspaceId: data.workspaceId,
      siteOrigin: origin,
    });
  });


// ---- Read ----------------------------------------------------------------

export const getAutoApplySession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ sessionId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [sess, ev, shots, ans, fields] = await Promise.all([
      supabase
        .from("ai_application_sessions")
        .select("*, jobs(id, title, company_name, application_url), companies(id, name, logo_url), resume_versions(id, name, version), cover_letters(id, title, style)")
        .eq("id", data.sessionId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("ai_session_events")
        .select("*")
        .eq("session_id", data.sessionId)
        .order("created_at", { ascending: true }),
      supabase
        .from("ai_session_screenshots")
        .select("*")
        .eq("session_id", data.sessionId)
        .order("created_at", { ascending: true }),
      supabase
        .from("ai_session_answers")
        .select("*")
        .eq("session_id", data.sessionId)
        .order("created_at", { ascending: true }),
      supabase
        .from("ai_session_fields")
        .select("*")
        .eq("session_id", data.sessionId)
        .order("created_at", { ascending: true }),
    ]);
    return {
      session: sess.data,
      events: ev.data ?? [],
      screenshots: shots.data ?? [],
      answers: ans.data ?? [],
      fields: fields.data ?? [],
    };
  });

export const listAutoApplySessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("ai_application_sessions")
      .select("*, jobs(id, title, company_name), companies(id, name, logo_url)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const listAutoApplyForWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("ai_application_sessions")
      .select("*")
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return rows ?? [];
  });

// ---- Approval gate -------------------------------------------------------

export const approveAndSubmit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ sessionId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sess } = await supabase
      .from("ai_application_sessions")
      .select("id, browser_session_id, status")
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!sess) throw new Error("Session not found.");
    if (sess.status === "completed") return { ok: true, already: true };

    const now = new Date().toISOString();
    await supabase
      .from("ai_application_sessions")
      .update({ status: "submitting", current_step: "submitting", progress: stepProgress("submitting"), approved_at: now })
      .eq("id", data.sessionId);
    await supabase.from("ai_session_events").insert({
      session_id: data.sessionId,
      user_id: userId,
      step: "submitting",
      kind: "info",
      message: "User approved. Submitting application.",
    });

    const { getDriver } = await import("./auto-apply/driver");
    const driver = getDriver();
    if (driver.kind === "noop") {
      // Preview mode — mark completed so the timeline closes cleanly.
      await supabase
        .from("ai_application_sessions")
        .update({ status: "completed", current_step: "completed", progress: 100, finished_at: now })
        .eq("id", data.sessionId);
      await supabase.from("ai_session_events").insert({
        session_id: data.sessionId,
        user_id: userId,
        step: "completed",
        kind: "info",
        message: "Preview mode: submission simulated. Configure a real worker to actually submit.",
      });
      return { ok: true, preview: true };
    }
    if (sess.browser_session_id) await driver.submit(sess.browser_session_id);
    return { ok: true };
  });

export const cancelAutoApply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ sessionId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sess } = await supabase
      .from("ai_application_sessions")
      .select("browser_session_id")
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    const now = new Date().toISOString();
    await supabase
      .from("ai_application_sessions")
      .update({ status: "cancelled", cancelled_at: now, finished_at: now })
      .eq("id", data.sessionId);
    await supabase.from("ai_session_events").insert({
      session_id: data.sessionId,
      user_id: userId,
      step: "cancelled",
      kind: "warning",
      message: "User cancelled the session.",
    });
    if (sess?.browser_session_id) {
      const { getDriver } = await import("./auto-apply/driver");
      const driver = getDriver();
      if (driver.kind !== "noop") await driver.cancel(sess.browser_session_id).catch(() => {});
    }
    return { ok: true };
  });

// ---- Field recovery ------------------------------------------------------

export const provideFieldValue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ fieldId: z.string().uuid(), value: z.string().min(1).max(2000) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("ai_session_fields")
      .update({ value: data.value, filled: true, needs_user: false })
      .eq("id", data.fieldId)
      .eq("user_id", context.userId);
    return { ok: true };
  });

// ---- Dashboard aggregate -------------------------------------------------

export const getAgentDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("ai_application_sessions")
      .select("id, status, started_at, finished_at, current_step, jobs(title, company_name), companies(name)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const running = rows.filter((r) => r.status === "running").length;
    const queued = rows.filter((r) => r.status === "queued").length;
    const awaiting = rows.filter((r) => r.status === "awaiting_approval" || r.status === "awaiting_input").length;
    const completedToday = rows.filter(
      (r) => r.status === "completed" && r.finished_at && new Date(r.finished_at as string) >= todayStart,
    ).length;
    const failed = rows.filter((r) => r.status === "failed").length;

    const completedWithTime = rows.filter(
      (r) => r.status === "completed" && r.started_at && r.finished_at,
    );
    const avgMs = completedWithTime.length
      ? completedWithTime.reduce(
          (acc, r) =>
            acc + (new Date(r.finished_at as string).getTime() - new Date(r.started_at as string).getTime()),
          0,
        ) / completedWithTime.length
      : 0;

    const recent = rows.slice(0, 6).map((r) => ({
      id: String(r.id ?? ""),
      status: String(r.status ?? ""),
      current_step: String(r.current_step ?? ""),
      title: String((r.jobs as Record<string, unknown> | null)?.title ?? ""),
      company: String(
        (r.companies as Record<string, unknown> | null)?.name ??
          (r.jobs as Record<string, unknown> | null)?.company_name ??
          "",
      ),
    }));

    return {
      running,
      queued,
      awaiting,
      completedToday,
      failed,
      avgMinutes: avgMs ? Math.round(avgMs / 60000) : 0,
      recent,
    };
  });
