/**
 * Aggregators for Coach / Learning / Analytics / Interview / Settings pages.
 * All data is derived from the user's Career Brain + persisted matches +
 * workspaces + gap analyses. No lorem ipsum, no fabricated content — every
 * card resolves to real rows or is skipped.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCareerBrainSnapshot, type CareerBrainSnapshot } from "./career-brain.service";
import { familiesFromBrain } from "./jobs/role-synonyms";

// ---------- Coach ----------

export type CoachAdvice = {
  kind: "next_action" | "resume" | "career_health" | "skill" | "salary" | "market" | "trend";
  title: string;
  body: string;
  cta?: { label: string; href: string };
};

export const getCoachBriefing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const brain = (await getCareerBrainSnapshot()) as CareerBrainSnapshot;
    if (!brain.ready) {
      return {
        ready: false,
        advice: [] as CoachAdvice[],
        families: [] as { id: string; label: string }[],
      };
    }

    const [{ data: matches }, { data: highMatches }, { data: workspaces }, { data: gaps }] = await Promise.all([
      context.supabase
        .from("job_matches")
        .select("overall_score, missing_skills, job:jobs(id,title,salary_min,salary_max,salary_currency,company:companies(name))")
        .eq("user_id", context.userId)
        .order("overall_score", { ascending: false })
        .limit(50),
      context.supabase
        .from("job_matches")
        .select("id")
        .eq("user_id", context.userId)
        .gte("overall_score", 80),
      context.supabase
        .from("application_workspaces")
        .select("id, readiness_score, current_stage")
        .eq("user_id", context.userId),
      context.supabase
        .from("gap_analysis")
        .select("high_priority, recommended_next")
        .eq("user_id", context.userId)
        .limit(20),
    ]);

    const families = familiesFromBrain({
      preferredRole: brain.identity.preferences.preferredRole,
      currentTitle: brain.identity.currentTitle,
      skills: brain.skills.map((s) => s.name),
      projectTechs: (brain.projects ?? []).flatMap((p: any) => p?.technologies ?? []),
    });

    const advice: CoachAdvice[] = [];

    // Next action
    if ((workspaces?.length ?? 0) === 0 && (highMatches?.length ?? 0) > 0) {
      advice.push({
        kind: "next_action",
        title: "Turn a top match into an application",
        body: `You have ${highMatches!.length} strong matches. Open one and choose "Prepare Application" — CareerOS will run ATS, gap and readiness analysis in one shot.`,
        cta: { label: "Open top matches", href: "/jobs" },
      });
    }

    // Career Health
    const health = (brain.health as any)?.score ?? null;
    if (health != null && health < 70) {
      advice.push({
        kind: "career_health",
        title: `Career Health is ${health}/100 — a few edits will move the needle`,
        body: "Adding certifications, quantifying project impact, and setting a preferred role usually adds 10–20 points.",
        cta: { label: "Open Career Brain", href: "/profile" },
      });
    }

    // Skill signal — most-cited missing skill
    const skillFreq = new Map<string, number>();
    for (const m of matches ?? []) {
      if (Number(m.overall_score ?? 0) < 65) continue;
      for (const ms of (m.missing_skills ?? []) as any[]) {
        if (ms.priority !== "high") continue;
        skillFreq.set(ms.skill, (skillFreq.get(ms.skill) ?? 0) + 1);
      }
    }
    const topMissing = Array.from(skillFreq.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topMissing) {
      advice.push({
        kind: "skill",
        title: `Learning ${topMissing[0]} unlocks ${topMissing[1]} strong roles`,
        body: `${topMissing[0]} is the single most-requested missing skill across your top matches. It's the highest-leverage thing to learn this month.`,
        cta: { label: "See learning path", href: "/learning" },
      });
    }

    // Salary — compare expected vs top matches
    const preferred = brain.identity.preferences.expectedSalary;
    const withSalary = (matches ?? []).filter((m: any) => m.job?.salary_max);
    if (withSalary.length >= 3) {
      const avgMax = Math.round(
        withSalary.reduce((s: number, m: any) => s + Number(m.job.salary_max ?? 0), 0) / withSalary.length,
      );
      if (preferred) {
        const expected = Number(String(preferred).replace(/[^\d.]/g, "")) || 0;
        const target = expected < 1000 ? expected * 1000 : expected;
        const delta = avgMax - target;
        advice.push({
          kind: "salary",
          title: `Market ceiling for your matches is ~$${Math.round(avgMax / 1000)}k`,
          body: delta >= 0
            ? `Your expected salary of $${Math.round(target / 1000)}k sits below the ceiling — you may be leaving $${Math.round(delta / 1000)}k on the table.`
            : `Your expected salary of $${Math.round(target / 1000)}k is above the current ceiling by $${Math.round(-delta / 1000)}k. Consider widening the role family or targeting senior bands.`,
        });
      } else {
        advice.push({
          kind: "salary",
          title: `Set an expected salary — market ceiling is ~$${Math.round(avgMax / 1000)}k`,
          body: "Your top matches average this ceiling. Anchor your negotiations to it.",
          cta: { label: "Set in profile", href: "/profile" },
        });
      }
    }

    // Market trend by family
    if (families.length) {
      advice.push({
        kind: "market",
        title: `${families[0].label} demand is your primary signal`,
        body: `Your Career Brain leans strongest into ${families.slice(0, 3).map((f) => f.label).join(" · ")}. CareerOS is ranking every new job against this trajectory.`,
      });
    }

    // Trend — active workspaces
    if ((workspaces?.length ?? 0) > 0) {
      const avgReady = Math.round(
        (workspaces ?? []).reduce((s: number, w: any) => s + Number(w.readiness_score ?? 0), 0) /
          workspaces!.length,
      );
      advice.push({
        kind: "trend",
        title: `${workspaces!.length} applications in flight · avg readiness ${avgReady}`,
        body: avgReady >= 75
          ? "You're in strong shape across the board. Focus this week on interview prep."
          : "Run the AI Optimizer on your lowest-readiness workspace to lift the average.",
        cta: { label: "Open applications", href: "/applications" },
      });
    }

    // Gap recommendations
    const gapNext = (gaps ?? []).flatMap((g: any) => g.recommended_next ?? []).slice(0, 3);
    if (gapNext.length) {
      advice.push({
        kind: "resume",
        title: "Your gap analysis recommends",
        body: gapNext.map((g: any) => (typeof g === "string" ? g : g.skill ?? g.action ?? "")).filter(Boolean).join(" · "),
      });
    }

    return {
      ready: true,
      advice,
      families: families.map((f) => ({ id: f.id, label: f.label })),
    };
  });

// ---------- Learning ----------

export const getLearningPaths = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const brain = (await getCareerBrainSnapshot()) as CareerBrainSnapshot;
    if (!brain.ready) return { ready: false, paths: [] as any[], families: [] as any[] };

    const [{ data: matches }, { data: gaps }] = await Promise.all([
      context.supabase
        .from("job_matches")
        .select("overall_score, missing_skills, job:jobs(id,title,required_skills)")
        .eq("user_id", context.userId)
        .order("overall_score", { ascending: false })
        .limit(60),
      context.supabase
        .from("gap_analysis")
        .select("missing_skills, high_priority, recommended_next")
        .eq("user_id", context.userId),
    ]);

    // Aggregate missing skills across matches and gap analyses
    const bucket = new Map<string, { skill: string; jobsAffected: number; sampleTitles: Set<string>; priority: number }>();
    const bump = (name: string, priority: number, title?: string) => {
      const key = name.trim();
      if (!key) return;
      const cur = bucket.get(key) ?? { skill: key, jobsAffected: 0, sampleTitles: new Set<string>(), priority: 0 };
      cur.jobsAffected += 1;
      cur.priority = Math.max(cur.priority, priority);
      if (title) cur.sampleTitles.add(title);
      bucket.set(key, cur);
    };

    for (const m of (matches ?? []) as any[]) {
      for (const ms of (m.missing_skills ?? []) as any[]) {
        const p = ms.priority === "high" ? 3 : ms.priority === "medium" ? 2 : 1;
        bump(ms.skill, p, m.job?.title);
      }
    }
    for (const g of (gaps ?? []) as any[]) {
      for (const s of g.high_priority ?? []) bump(typeof s === "string" ? s : s.skill ?? "", 3);
      for (const s of g.missing_skills ?? []) bump(typeof s === "string" ? s : s.skill ?? "", 2);
    }

    const families = familiesFromBrain({
      preferredRole: brain.identity.preferences.preferredRole,
      currentTitle: brain.identity.currentTitle,
      skills: brain.skills.map((s) => s.name),
      projectTechs: (brain.projects ?? []).flatMap((p: any) => p?.technologies ?? []),
    });

    const paths = Array.from(bucket.values())
      .sort((a, b) => b.priority - a.priority || b.jobsAffected - a.jobsAffected)
      .slice(0, 12)
      .map((b) => ({
        skill: b.skill,
        jobsAffected: b.jobsAffected,
        priority: b.priority === 3 ? "high" : b.priority === 2 ? "medium" : "low",
        sampleTitles: Array.from(b.sampleTitles).slice(0, 3),
        estimatedWeeks: b.priority === 3 ? 4 : b.priority === 2 ? 2 : 1,
        resourceQuery: encodeURIComponent(`${b.skill} tutorial ${families[0]?.label ?? ""}`),
      }));

    return {
      ready: true,
      paths,
      families: families.map((f) => ({ id: f.id, label: f.label })),
      targetRole: brain.identity.preferences.preferredRole ?? brain.identity.currentTitle ?? null,
    };
  });

// ---------- Analytics ----------

export const getCareerAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const brain = (await getCareerBrainSnapshot()) as CareerBrainSnapshot;

    const [{ data: matches }, { count: savedCount }, { count: viewedCount }, { data: workspaces }, { count: notifCount }] = await Promise.all([
      context.supabase.from("job_matches").select("overall_score, computed_at, job:jobs(company:companies(name,industry))").eq("user_id", context.userId),
      context.supabase.from("saved_jobs").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
      context.supabase.from("viewed_jobs").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
      context.supabase.from("application_workspaces").select("id, readiness_score, current_stage, created_at").eq("user_id", context.userId),
      context.supabase.from("job_notifications").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
    ]);

    const scores = (matches ?? []).map((m: any) => Number(m.overall_score ?? 0));
    const buckets = { under50: 0, "50to69": 0, "70to84": 0, "85plus": 0 };
    for (const s of scores) {
      if (s >= 85) buckets["85plus"]++;
      else if (s >= 70) buckets["70to84"]++;
      else if (s >= 50) buckets["50to69"]++;
      else buckets.under50++;
    }

    const industryCounts = new Map<string, number>();
    for (const m of (matches ?? []) as any[]) {
      const ind = m.job?.company?.industry;
      if (!ind) continue;
      industryCounts.set(ind, (industryCounts.get(ind) ?? 0) + 1);
    }
    const topIndustries = Array.from(industryCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const avgReadiness = (workspaces?.length ?? 0)
      ? Math.round(workspaces!.reduce((s: number, w: any) => s + Number(w.readiness_score ?? 0), 0) / workspaces!.length)
      : 0;

    return {
      ready: brain.ready,
      totals: {
        matches: scores.length,
        saved: savedCount ?? 0,
        viewed: viewedCount ?? 0,
        workspaces: workspaces?.length ?? 0,
        notifications: notifCount ?? 0,
      },
      averageMatchScore: scores.length ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : 0,
      distribution: buckets,
      topIndustries,
      averageReadiness: avgReadiness,
      careerHealth: (brain.health as any)?.score ?? null,
      brainVersion: brain.metadata.brainVersion,
      lastMatchAt: (matches ?? [])
        .map((m: any) => m.computed_at)
        .filter(Boolean)
        .sort()
        .pop() ?? null,
    };
  });

// ---------- Interview Hub ----------

export const getInterviewHub = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: sessions }, { data: questions }, { data: workspaces }] = await Promise.all([
      context.supabase
        .from("interview_sessions")
        .select("id, workspace_id, focus, total_questions, completed_questions, created_at, workspace:application_workspaces(id, job:jobs(title, company:companies(name)))")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("interview_questions")
        .select("id, session_id, category, question, difficulty, practiced")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(200),
      context.supabase
        .from("application_workspaces")
        .select("id, current_stage, readiness_score, job:jobs(title,company:companies(name))")
        .eq("user_id", context.userId)
        .order("last_opened_at", { ascending: false })
        .limit(20),
    ]);


    const byCategory: Record<string, { total: number; practiced: number }> = {};
    for (const q of (questions ?? []) as any[]) {
      const cat = q.category ?? "general";
      const cur = byCategory[cat] ?? { total: 0, practiced: 0 };
      cur.total += 1;
      if (q.practiced) cur.practiced += 1;
      byCategory[cat] = cur;
    }

    const totalQ = (questions ?? []).length;
    const totalPracticed = (questions ?? []).filter((q: any) => q.practiced).length;

    return {
      sessions: sessions ?? [],
      questions: (questions ?? []).slice(0, 40),
      byCategory,
      totals: { totalQ, totalPracticed },
      workspaces: workspaces ?? [],
    };
  });

// ---------- Agent Activity (live states on the dashboard) ----------

export const getAgentActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const brain = (await getCareerBrainSnapshot()) as CareerBrainSnapshot;

    const [
      { count: matchCount },
      { count: highMatchCount },
      { count: workspaceCount },
      { count: readyWorkspaceCount },
      { count: interviewSessionCount },
      { count: practicedQuestionCount },
      { count: gapCount },
      { count: notificationCount },
    ] = await Promise.all([
      context.supabase.from("job_matches").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
      context.supabase.from("job_matches").select("id", { count: "exact", head: true }).eq("user_id", context.userId).gte("overall_score", 80),
      context.supabase.from("application_workspaces").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
      context.supabase.from("application_workspaces").select("id", { count: "exact", head: true }).eq("user_id", context.userId).gte("readiness_score", 75),
      context.supabase.from("interview_sessions").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
      context.supabase.from("interview_questions").select("id", { count: "exact", head: true }).eq("user_id", context.userId).eq("practiced", true),
      context.supabase.from("gap_analysis").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
      context.supabase.from("job_notifications").select("id", { count: "exact", head: true }).eq("user_id", context.userId).is("read_at", null),
    ]);

    return {
      ready: brain.ready,
      brainVersion: brain.metadata.brainVersion ?? null,
      matchCount: matchCount ?? 0,
      highMatchCount: highMatchCount ?? 0,
      workspaceCount: workspaceCount ?? 0,
      readyWorkspaceCount: readyWorkspaceCount ?? 0,
      interviewSessionCount: interviewSessionCount ?? 0,
      practicedQuestionCount: practicedQuestionCount ?? 0,
      gapCount: gapCount ?? 0,
      unreadNotifications: notificationCount ?? 0,
      skillCount: brain.skills.length,
      projectCount: (brain.projects ?? []).length,
    };
  });

// ---------- Interview progress ----------

export const toggleQuestionPracticed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), practiced: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("interview_questions")
      .update({ practiced: data.practiced })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    // Recompute practiced_count on the parent session
    const { data: q } = await context.supabase
      .from("interview_questions")
      .select("session_id")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (q?.session_id) {
      const { count } = await context.supabase
        .from("interview_questions")
        .select("id", { count: "exact", head: true })
        .eq("session_id", q.session_id)
        .eq("user_id", context.userId)
        .eq("practiced", true);
      await context.supabase
        .from("interview_sessions")
        .update({ completed_questions: count ?? 0 })
        .eq("id", q.session_id)
        .eq("user_id", context.userId);
    }

    return { ok: true };
  });

// ---------- Settings ----------

export const updateProfilePrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      preferred_role: z.string().max(120).optional().nullable(),
      preferred_location: z.string().max(120).optional().nullable(),
      expected_salary: z.string().max(60).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        preferred_role: data.preferred_role,
        preferred_location: data.preferred_location,
        expected_salary: data.expected_salary,
      })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


