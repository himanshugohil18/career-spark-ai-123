import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: !!data };
  });

const iso = (d: Date) => d.toISOString();
const startOfDay = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};
const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);

/* -------------------- OVERVIEW -------------------- */

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const today = iso(startOfDay());
    const weekAgo = iso(daysAgo(7));
    const monthAgo = iso(daysAgo(30));
    const dayAgo = iso(daysAgo(1));

    const [
      usersC,
      newToday,
      newWeek,
      newMonth,
      activeSubs,
      totalRevenueRes,
      revenueTodayRes,
      revenueMonthRes,
      capturedPayments,
      failedPayments,
      jobsC,
      matchesC,
      workspacesC,
      sessions24h,
      aiTotal,
      aiFailed,
      aiToday,
      autoRunning,
      autoFailed,
      recentSessions,
      failedGens,
      recentUsers,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", today),
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", monthAgo),
      supabaseAdmin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabaseAdmin.from("payments").select("amount").eq("status", "captured"),
      supabaseAdmin.from("payments").select("amount").eq("status", "captured").gte("created_at", today),
      supabaseAdmin.from("payments").select("amount").eq("status", "captured").gte("created_at", monthAgo),
      supabaseAdmin.from("payments").select("*", { count: "exact", head: true }).eq("status", "captured"),
      supabaseAdmin.from("payments").select("*", { count: "exact", head: true }).eq("status", "failed"),
      supabaseAdmin.from("jobs").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabaseAdmin.from("job_matches").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("application_workspaces").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("ai_application_sessions").select("*", { count: "exact", head: true }).gte("started_at", dayAgo),
      supabaseAdmin.from("ai_generation_history").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("ai_generation_history").select("*", { count: "exact", head: true }).eq("status", "failed"),
      supabaseAdmin.from("ai_generation_history").select("*", { count: "exact", head: true }).gte("created_at", today),
      supabaseAdmin.from("ai_application_sessions").select("*", { count: "exact", head: true }).eq("status", "running"),
      supabaseAdmin.from("ai_application_sessions").select("*", { count: "exact", head: true }).eq("status", "failed"),
      supabaseAdmin
        .from("ai_application_sessions")
        .select("id, user_id, status, current_step, started_at, finished_at, error")
        .order("started_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("ai_generation_history")
        .select("id, user_id, kind, status, error, created_at")
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("profiles")
        .select("user_id, email, full_name, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const sumAmt = (rows: { amount: number }[] | null) =>
      (rows ?? []).reduce((a, r) => a + (r.amount || 0), 0);

    const aiTotalN = aiTotal.count ?? 0;
    const aiFailN = aiFailed.count ?? 0;

    return {
      counts: {
        users: usersC.count ?? 0,
        newToday: newToday.count ?? 0,
        newWeek: newWeek.count ?? 0,
        newMonth: newMonth.count ?? 0,
        activeSubs: activeSubs.count ?? 0,
        activeJobs: jobsC.count ?? 0,
        matches: matchesC.count ?? 0,
        workspaces: workspacesC.count ?? 0,
        sessions24h: sessions24h.count ?? 0,
        aiTotal: aiTotalN,
        aiToday: aiToday.count ?? 0,
        aiFailed: aiFailN,
        aiSuccessRate: aiTotalN > 0 ? Math.round(((aiTotalN - aiFailN) / aiTotalN) * 1000) / 10 : 100,
        autoRunning: autoRunning.count ?? 0,
        autoFailed: autoFailed.count ?? 0,
        capturedPayments: capturedPayments.count ?? 0,
        failedPayments: failedPayments.count ?? 0,
      },
      revenue: {
        totalPaise: sumAmt(totalRevenueRes.data),
        todayPaise: sumAmt(revenueTodayRes.data),
        monthPaise: sumAmt(revenueMonthRes.data),
      },
      recentSessions: recentSessions.data ?? [],
      failedGenerations: failedGens.data ?? [],
      recentUsers: recentUsers.data ?? [],
    };
  });

/* -------------------- USERS -------------------- */

export const getUsersList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string; page?: number; pageSize?: number }) => ({
    search: (d?.search ?? "").trim().toLowerCase(),
    page: Math.max(0, d?.page ?? 0),
    pageSize: Math.min(100, d?.pageSize ?? 25),
  }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const today = iso(startOfDay());
    const weekAgo = iso(daysAgo(7));
    const monthAgo = iso(daysAgo(30));

    // Auth users for provider + last_sign_in
    const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUsers = authList?.users ?? [];
    const authMap = new Map(authUsers.map((u) => [u.id, u]));

    // active-today count = users whose auth last_sign_in_at is today
    const activeToday = authUsers.filter((u) => u.last_sign_in_at && u.last_sign_in_at >= today).length;
    const activeWeek = authUsers.filter((u) => u.last_sign_in_at && u.last_sign_in_at >= weekAgo).length;
    const activeMonth = authUsers.filter((u) => u.last_sign_in_at && u.last_sign_in_at >= monthAgo).length;

    // provider breakdown
    const providers: Record<string, number> = {};
    for (const u of authUsers) {
      const p = (u.app_metadata?.provider as string) || "email";
      providers[p] = (providers[p] ?? 0) + 1;
    }

    // filter+paginate profiles server-side
    const from = data.page * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = supabaseAdmin
      .from("profiles")
      .select(
        "user_id, email, full_name, avatar_url, preferred_role, current_title, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });
    if (data.search) {
      q = q.or(
        `email.ilike.%${data.search}%,full_name.ilike.%${data.search}%,preferred_role.ilike.%${data.search}%`,
      );
    }
    const { data: rows, count } = await q.range(from, to);

    // enrich per-user counts (subscription plan, applications, ai gens)
    const ids = (rows ?? []).map((r) => r.user_id);
    const [subs, ws, ai] = await Promise.all([
      ids.length
        ? supabaseAdmin
            .from("subscriptions")
            .select("user_id, plan, status")
            .in("user_id", ids)
            .eq("status", "active")
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabaseAdmin.from("application_workspaces").select("user_id").in("user_id", ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabaseAdmin.from("ai_generation_history").select("user_id").in("user_id", ids)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const planMap = new Map((subs.data ?? []).map((s: any) => [s.user_id, s.plan]));
    const wsCount = new Map<string, number>();
    for (const w of ws.data ?? []) wsCount.set(w.user_id, (wsCount.get(w.user_id) ?? 0) + 1);
    const aiCount = new Map<string, number>();
    for (const g of ai.data ?? []) aiCount.set(g.user_id, (aiCount.get(g.user_id) ?? 0) + 1);

    const enriched = (rows ?? []).map((r) => {
      const a = authMap.get(r.user_id);
      return {
        ...r,
        provider: (a?.app_metadata?.provider as string) || "email",
        last_sign_in_at: a?.last_sign_in_at ?? null,
        plan: planMap.get(r.user_id) ?? "free",
        applications: wsCount.get(r.user_id) ?? 0,
        ai_generations: aiCount.get(r.user_id) ?? 0,
      };
    });

    return {
      totals: {
        users: authUsers.length,
        activeToday,
        activeWeek,
        activeMonth,
      },
      providers,
      rows: enriched,
      total: count ?? 0,
    };
  });

/* -------------------- BILLING -------------------- */

export const getBillingOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const today = iso(startOfDay());
    const monthAgo = iso(daysAgo(30));

    const [captured, failed, refunded, allCaptured, todayCaptured, monthCaptured, subsAll, recentPays] =
      await Promise.all([
        supabaseAdmin.from("payments").select("*", { count: "exact", head: true }).eq("status", "captured"),
        supabaseAdmin.from("payments").select("*", { count: "exact", head: true }).eq("status", "failed"),
        supabaseAdmin.from("payments").select("*", { count: "exact", head: true }).eq("status", "refunded"),
        supabaseAdmin.from("payments").select("amount").eq("status", "captured"),
        supabaseAdmin.from("payments").select("amount").eq("status", "captured").gte("created_at", today),
        supabaseAdmin.from("payments").select("amount").eq("status", "captured").gte("created_at", monthAgo),
        supabaseAdmin.from("subscriptions").select("plan, status"),
        supabaseAdmin
          .from("payments")
          .select("id, user_id, plan, amount, currency, status, order_id, payment_id, receipt, invoice_number, invoice_issued_at, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    const sum = (rows: any[] | null) => (rows ?? []).reduce((a, r) => a + (r.amount || 0), 0);

    const planCounts: Record<string, number> = { free: 0, pro: 0, enterprise: 0 };
    const statusCounts: Record<string, number> = {};
    for (const s of subsAll.data ?? []) {
      statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1;
      if (s.status === "active") planCounts[s.plan] = (planCounts[s.plan] ?? 0) + 1;
    }

    // enrich recent payments with email
    const uids = Array.from(new Set((recentPays.data ?? []).map((p: any) => p.user_id)));
    const { data: profs } = uids.length
      ? await supabaseAdmin.from("profiles").select("user_id, email, full_name").in("user_id", uids)
      : { data: [] as any[] };
    const pmap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
    const recent = (recentPays.data ?? []).map((p: any) => ({
      ...p,
      email: pmap.get(p.user_id)?.email ?? null,
      full_name: pmap.get(p.user_id)?.full_name ?? null,
    }));

    return {
      counts: {
        captured: captured.count ?? 0,
        failed: failed.count ?? 0,
        refunded: refunded.count ?? 0,
      },
      revenue: {
        totalPaise: sum(allCaptured.data),
        todayPaise: sum(todayCaptured.data),
        monthPaise: sum(monthCaptured.data),
      },
      subscriptions: {
        planCounts,
        statusCounts,
        active: statusCounts["active"] ?? 0,
        cancelled: statusCounts["cancelled"] ?? 0,
        expired: statusCounts["expired"] ?? 0,
      },
      recentPayments: recent,
    };
  });

/* -------------------- JOBS DISCOVERY -------------------- */

export const getJobsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [totalJobs, activeJobs, sources, byProvider, dedupSample] = await Promise.all([
      supabaseAdmin.from("jobs").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("jobs").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabaseAdmin.from("job_sources").select("*").order("id"),
      supabaseAdmin.from("jobs").select("provider"),
      supabaseAdmin.from("jobs").select("fingerprint").limit(5000),
    ]);

    const perProvider: Record<string, number> = {};
    for (const r of (byProvider.data ?? []) as any[]) {
      perProvider[r.provider] = (perProvider[r.provider] ?? 0) + 1;
    }
    const seen = new Set<string>();
    let dup = 0;
    for (const r of (dedupSample.data ?? []) as any[]) {
      if (!r.fingerprint) continue;
      if (seen.has(r.fingerprint)) dup++;
      else seen.add(r.fingerprint);
    }

    return {
      totals: {
        total: totalJobs.count ?? 0,
        active: activeJobs.count ?? 0,
        duplicatesInSample: dup,
      },
      perProvider,
      sources: (sources.data ?? []) as any[],
    };
  });

/* -------------------- AI USAGE -------------------- */

export const getAiUsageOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const today = iso(startOfDay());

    const [all, todayC, failed, byKind] = await Promise.all([
      supabaseAdmin.from("ai_generation_history").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("ai_generation_history").select("*", { count: "exact", head: true }).gte("created_at", today),
      supabaseAdmin.from("ai_generation_history").select("*", { count: "exact", head: true }).eq("status", "failed"),
      supabaseAdmin.from("ai_generation_history").select("kind, status"),
    ]);

    const perKind: Record<string, { total: number; failed: number }> = {};
    for (const r of (byKind.data ?? []) as any[]) {
      perKind[r.kind] = perKind[r.kind] || { total: 0, failed: 0 };
      perKind[r.kind].total++;
      if (r.status === "failed") perKind[r.kind].failed++;
    }

    const total = all.count ?? 0;
    const failedN = failed.count ?? 0;
    return {
      totals: {
        total,
        today: todayC.count ?? 0,
        failed: failedN,
        successRate: total > 0 ? Math.round(((total - failedN) / total) * 1000) / 10 : 100,
      },
      perKind,
    };
  });

/* -------------------- AUTO APPLY MONITOR -------------------- */

export const getAutoApplyOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [all, recent] = await Promise.all([
      supabaseAdmin.from("ai_application_sessions").select("status"),
      supabaseAdmin
        .from("ai_application_sessions")
        .select("id, user_id, status, current_step, started_at, finished_at, error")
        .order("started_at", { ascending: false })
        .limit(30),
    ]);

    const perStatus: Record<string, number> = {};
    for (const r of (all.data ?? []) as any[]) {
      perStatus[r.status] = (perStatus[r.status] ?? 0) + 1;
    }

    return {
      perStatus,
      recent: recent.data ?? [],
    };
  });

/* -------------------- ANALYTICS TIMESERIES -------------------- */

export const getAnalyticsSeries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = iso(daysAgo(30));

    const [signups, ai, apps, pays, jobs] = await Promise.all([
      supabaseAdmin.from("profiles").select("created_at").gte("created_at", since),
      supabaseAdmin.from("ai_generation_history").select("created_at").gte("created_at", since),
      supabaseAdmin.from("application_workspaces").select("created_at").gte("created_at", since),
      supabaseAdmin.from("payments").select("created_at, amount, status").gte("created_at", since).eq("status", "captured"),
      supabaseAdmin.from("jobs").select("created_at").gte("created_at", since),
    ]);

    const bucket = () => {
      const out: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = daysAgo(i);
        d.setUTCHours(0, 0, 0, 0);
        out[d.toISOString().slice(0, 10)] = 0;
      }
      return out;
    };
    const fill = (rows: { created_at: string }[] | null, b: Record<string, number>) => {
      for (const r of rows ?? []) {
        const k = r.created_at.slice(0, 10);
        if (k in b) b[k]++;
      }
      return b;
    };
    const fillSum = (rows: any[] | null, b: Record<string, number>) => {
      for (const r of rows ?? []) {
        const k = r.created_at.slice(0, 10);
        if (k in b) b[k] += r.amount || 0;
      }
      return b;
    };

    const s = fill(signups.data as any, bucket());
    const a = fill(ai.data as any, bucket());
    const w = fill(apps.data as any, bucket());
    const j = fill(jobs.data as any, bucket());
    const r = fillSum(pays.data as any, bucket());

    const days = Object.keys(s);
    const series = days.map((d) => ({
      date: d.slice(5),
      signups: s[d],
      ai: a[d],
      applications: w[d],
      jobs: j[d],
      revenue: Math.round((r[d] || 0) / 100),
    }));

    return { series };
  });

/* -------------------- SYSTEM HEALTH -------------------- */

export const getSystemHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const dbT0 = Date.now();
    const ping = await supabaseAdmin.from("profiles").select("user_id", { head: true, count: "exact" });
    const dbMs = Date.now() - dbT0;

    return {
      services: [
        { name: "Database", status: ping.error ? "down" : "up", detail: `${dbMs} ms` },
        { name: "Auth", status: "up", detail: "Supabase Auth" },
        { name: "AI Gateway", status: process.env.LOVABLE_API_KEY ? "up" : "unconfigured", detail: "Lovable AI" },
        {
          name: "Razorpay",
          status: process.env.RAZORPAY_KEY_ID ? "up" : "unconfigured",
          detail: process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test") ? "TEST mode" : "LIVE",
        },
        {
          name: "Auto-apply worker",
          status: process.env.AUTO_APPLY_WORKER_SECRET ? "configured" : "unconfigured",
          detail: "webhook secret",
        },
      ],
    };
  });

/* -------------------- EXPORTS -------------------- */

export const exportAdminTable = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { table: "users" | "payments" | "subscriptions" | "applications" }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.table === "users") {
      const { data: rows } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email, full_name, preferred_role, current_title, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      return { rows: rows ?? [] };
    }
    if (data.table === "payments") {
      const { data: rows } = await supabaseAdmin
        .from("payments")
        .select("id, user_id, plan, amount, currency, status, order_id, payment_id, receipt, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      return { rows: rows ?? [] };
    }
    if (data.table === "subscriptions") {
      const { data: rows } = await supabaseAdmin
        .from("subscriptions")
        .select("id, user_id, plan, status, started_at, expires_at, cancelled_at, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      return { rows: rows ?? [] };
    }
    const { data: rows } = await supabaseAdmin
      .from("application_workspaces")
      .select("id, user_id, job_id, status, current_stage, progress_percent, readiness_score, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    return { rows: rows ?? [] };
  });
