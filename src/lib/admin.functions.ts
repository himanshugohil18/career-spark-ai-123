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

    // Source user stats + recent signups from auth so BOTH Google and
    // email/password accounts show up, even without a profiles row.
    const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUsers = authList?.users ?? [];
    const profileById = new Map((recentUsers.data ?? []).map((p: any) => [p.user_id, p]));

    const recentSignups = [...authUsers]
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
      .slice(0, 10)
      .map((a) => {
        const p: any = profileById.get(a.id) ?? {};
        return {
          user_id: a.id,
          email: a.email ?? p.email ?? "—",
          full_name:
            (p.full_name as string | null) ??
            ((a.user_metadata?.full_name as string | undefined) ||
              (a.user_metadata?.name as string | undefined) ||
              null),
          created_at: a.created_at ?? p.created_at ?? null,
          provider: (a.app_metadata?.provider as string) || "email",
          last_sign_in_at: a.last_sign_in_at ?? null,
        };
      });

    const authCount = authUsers.length;
    const countSince = (since: string) =>
      authUsers.filter((u) => (u.created_at ?? "") >= since).length;

    const sumAmt = (rows: { amount: number }[] | null) =>
      (rows ?? []).reduce((a, r) => a + (r.amount || 0), 0);

    const aiTotalN = aiTotal.count ?? 0;
    const aiFailN = aiFailed.count ?? 0;

    return {
      counts: {
        users: authCount || (usersC.count ?? 0),
        newToday: authCount ? countSince(today) : (newToday.count ?? 0),
        newWeek: authCount ? countSince(weekAgo) : (newWeek.count ?? 0),
        newMonth: authCount ? countSince(monthAgo) : (newMonth.count ?? 0),

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
      recentUsers: recentSignups,
    };
  });

/* -------------------- USERS -------------------- */

export const getUsersList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string; page?: number; pageSize?: number; provider?: string }) => ({
    search: (d?.search ?? "").trim().toLowerCase(),
    page: Math.max(0, d?.page ?? 0),
    pageSize: Math.min(100, d?.pageSize ?? 25),
    provider: (d?.provider ?? "all").toLowerCase(),
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

    // All sign-in methods available per account (an account can have several).
    const methodsOf = (u: any): string[] => {
      const ids: string[] = (u.identities ?? []).map((i: any) => String(i.provider));
      const primary = (u.app_metadata?.provider as string) || "email";
      const all = new Set<string>([...ids, primary].filter(Boolean));
      return [...all];
    };

    // provider breakdown (counts every method an account can use)
    const providers: Record<string, number> = {};
    for (const u of authUsers) {
      for (const p of methodsOf(u)) providers[p] = (providers[p] ?? 0) + 1;
    }

    // Source the list from auth users so BOTH Google and email/password
    // accounts appear even if a profiles row was never created.
    const { data: profileRows } = await supabaseAdmin
      .from("profiles")
      .select("user_id, email, full_name, avatar_url, preferred_role, current_title, created_at");
    const profileMap = new Map((profileRows ?? []).map((p: any) => [p.user_id, p]));

    // Latest recorded login event per user (captures the method actually used).
    const { data: loginRows } = await supabaseAdmin
      .from("login_events")
      .select("user_id, provider, created_at, event_type")
      .order("created_at", { ascending: false })
      .limit(2000);
    const lastLogin = new Map<string, any>();
    for (const r of loginRows ?? []) {
      if (!lastLogin.has(r.user_id)) lastLogin.set(r.user_id, r);
    }

    const merged = authUsers.map((a) => {
      const p: any = profileMap.get(a.id) ?? {};
      const methods = methodsOf(a);
      const evt = lastLogin.get(a.id);
      const lastMethod =
        (evt?.provider as string | undefined) ||
        ((a.app_metadata?.provider as string) || "email");
      return {
        user_id: a.id,
        email: (a.email ?? p.email ?? "") as string,
        full_name:
          (p.full_name as string | null) ??
          ((a.user_metadata?.full_name as string | undefined) ||
            (a.user_metadata?.name as string | undefined) ||
            null),
        avatar_url:
          (p.avatar_url as string | null) ??
          ((a.user_metadata?.avatar_url as string | undefined) ?? null),
        preferred_role: (p.preferred_role as string | null) ?? null,
        current_title: (p.current_title as string | null) ?? null,
        created_at: (a.created_at as string) ?? (p.created_at as string) ?? null,
        provider: (a.app_metadata?.provider as string) || "email",
        methods,
        is_manual: methods.includes("email"),
        is_google: methods.includes("google"),
        last_method: lastMethod,
        last_sign_in_at: a.last_sign_in_at ?? evt?.created_at ?? null,
        email_confirmed_at: (a as any).email_confirmed_at ?? null,
      };
    });

    const googleUsers = merged.filter((u) => u.is_google).length;
    const manualUsers = merged.filter((u) => u.is_manual).length;

    const byProvider =
      data.provider === "google"
        ? merged.filter((u) => u.is_google)
        : data.provider === "manual" || data.provider === "email"
          ? merged.filter((u) => u.is_manual)
          : merged;

    const filtered = data.search
      ? byProvider.filter((u) =>
          [u.email, u.full_name, u.preferred_role, u.current_title, ...u.methods]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(data.search)),
        )
      : byProvider;

    filtered.sort((a, b) => {
      const x = a.last_sign_in_at ?? a.created_at ?? "";
      const y = b.last_sign_in_at ?? b.created_at ?? "";
      return y.localeCompare(x);
    });


    const count = filtered.length;
    const from = data.page * data.pageSize;
    const pageRows = filtered.slice(from, from + data.pageSize);

    // enrich per-user counts (subscription plan, applications, ai gens)
    const ids = pageRows.map((r) => r.user_id);
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

    const enriched = pageRows.map((r) => ({
      ...r,
      plan: planMap.get(r.user_id) ?? "free",
      applications: wsCount.get(r.user_id) ?? 0,
      ai_generations: aiCount.get(r.user_id) ?? 0,
    }));


    return {
      totals: {
        users: authUsers.length,
        activeToday,
        activeWeek,
        activeMonth,
        googleUsers,
        manualUsers,
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

    // Fall back to auth users when a profile row is missing or has no email,
    // otherwise paying customers show up as "—" in the admin table.
    const missing = uids.filter((id) => !pmap.get(id)?.email);
    if (missing.length) {
      const found = await Promise.all(
        missing.map(async (id) => {
          try {
            const { data } = await supabaseAdmin.auth.admin.getUserById(id as string);
            const u = data?.user;
            if (!u) return null;
            const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
            return {
              user_id: id,
              email: u.email ?? null,
              full_name:
                (pmap.get(id)?.full_name as string | undefined) ??
                (meta.full_name as string | undefined) ??
                (meta.name as string | undefined) ??
                null,
            };
          } catch {
            return null;
          }
        }),
      );
      for (const r of found) if (r) pmap.set(r.user_id, r);
    }

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

/* -------------------- JOB PROVIDER MONITORING -------------------- */

export const getProviderMonitoring = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const dayAgo = new Date(Date.now() - 86400_000).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

    const sources = await supabaseAdmin.from("job_sources").select("*").order("tier").order("id");

    // PostgREST caps a single response, so page through the catalogue.
    const { count: jobCount } = await supabaseAdmin
      .from("jobs")
      .select("*", { count: "exact", head: true });
    const pageSize = 1000;
    const pages = Math.min(40, Math.ceil((jobCount ?? 0) / pageSize));
    const chunks = await Promise.all(
      Array.from({ length: pages }, (_, i) =>
        supabaseAdmin
          .from("jobs")
          .select("provider, is_active, created_at, application_url, country_code, geo_region")
          .order("id")
          .range(i * pageSize, i * pageSize + pageSize - 1),
      ),
    );
    const jobRows = { data: chunks.flatMap((c) => c.data ?? []) };

    type Agg = {
      provider: string;
      total: number;
      active: number;
      last24h: number;
      last7d: number;
      withApplyUrl: number;
      india: number;
    };
    const agg = new Map<string, Agg>();
    const regions: Record<string, number> = {};
    const countries: Record<string, number> = {};

    for (const r of (jobRows.data ?? []) as any[]) {
      const key = r.provider ?? "unknown";
      const a =
        agg.get(key) ??
        { provider: key, total: 0, active: 0, last24h: 0, last7d: 0, withApplyUrl: 0, india: 0 };
      a.total++;
      if (r.is_active) a.active++;
      if (r.created_at >= dayAgo) a.last24h++;
      if (r.created_at >= weekAgo) a.last7d++;
      if (r.application_url) a.withApplyUrl++;
      if (r.country_code === "IN") a.india++;
      agg.set(key, a);

      if (r.is_active) {
        const reg = r.geo_region ?? "unknown";
        regions[reg] = (regions[reg] ?? 0) + 1;
        const c = r.country_code ?? "—";
        countries[c] = (countries[c] ?? 0) + 1;
      }
    }

    const providers = ((sources.data ?? []) as any[]).map((s) => {
      const a = agg.get(s.id);
      return {
        id: s.id,
        name: s.display_name,
        tier: s.tier,
        sourceType: s.source_type,
        enabled: s.enabled,
        health: s.health_status,
        lastRunAt: s.last_run_at,
        lastSuccessAt: s.last_success_at,
        lastAttemptAt: s.last_attempt_at,
        consecutiveFailures: s.consecutive_failures,
        failureCount: s.failure_count,
        lastFetchedCount: s.last_fetched_count,
        avgResponseMs: s.avg_response_ms,
        lastError: s.last_error,
        disabledReason: s.disabled_reason,
        totalJobs: a?.total ?? 0,
        activeJobs: a?.active ?? 0,
        jobs24h: a?.last24h ?? 0,
        jobs7d: a?.last7d ?? 0,
        indiaJobs: a?.india ?? 0,
        applyUrlCoverage: a && a.total ? Math.round((a.withApplyUrl / a.total) * 100) : 0,
      };
    });

    const topCountries = Object.entries(countries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([code, count]) => ({ code, count }));

    return {
      providers,
      regions: Object.entries(regions)
        .sort((a, b) => b[1] - a[1])
        .map(([region, count]) => ({ region, count })),
      topCountries,
      summary: {
        totalProviders: providers.length,
        enabled: providers.filter((p) => p.enabled).length,
        healthy: providers.filter((p) => p.health === "healthy").length,
        degraded: providers.filter((p) => p.health === "degraded").length,
        failing: providers.filter((p) => p.health === "failing" || p.consecutiveFailures >= 3).length,
        jobs24h: providers.reduce((n, p) => n + p.jobs24h, 0),
      },
    };
  });

/* -------------------- ERROR MONITORING -------------------- */

export const getErrorMonitoring = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const dayAgo = new Date(Date.now() - 86400_000).toISOString();

    const [aiFail, sessFail, payFail, emailFail, staleJobs, providerFail] = await Promise.all([
      supabaseAdmin
        .from("ai_generation_history")
        .select("id, kind, error, created_at")
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(25),
      supabaseAdmin
        .from("ai_application_sessions")
        .select("id, status, current_step, error, started_at")
        .eq("status", "failed")
        .order("started_at", { ascending: false })
        .limit(25),
      supabaseAdmin
        .from("payments")
        .select("id, plan, amount, status, created_at")
        .neq("status", "captured")
        .order("created_at", { ascending: false })
        .limit(25),
      supabaseAdmin
        .from("email_logs")
        .select("id, template, status, error, created_at")
        .neq("status", "sent")
        .order("created_at", { ascending: false })
        .limit(25),
      supabaseAdmin.from("jobs").select("*", { count: "exact", head: true }).eq("is_active", false),
      supabaseAdmin
        .from("job_sources")
        .select("id, display_name, health_status, consecutive_failures, last_error, last_attempt_at")
        .gt("consecutive_failures", 0)
        .order("consecutive_failures", { ascending: false })
        .limit(25),
    ]);

    const aiFail24 = ((aiFail.data ?? []) as any[]).filter((r) => r.created_at >= dayAgo).length;

    return {
      counts: {
        aiFailed: (aiFail.data ?? []).length,
        aiFailed24h: aiFail24,
        sessionsFailed: (sessFail.data ?? []).length,
        paymentsNotCaptured: (payFail.data ?? []).length,
        emailsFailed: (emailFail.data ?? []).length,
        inactiveJobs: staleJobs.count ?? 0,
        failingProviders: (providerFail.data ?? []).length,
      },
      aiFailures: aiFail.data ?? [],
      sessionFailures: sessFail.data ?? [],
      paymentFailures: payFail.data ?? [],
      emailFailures: emailFail.data ?? [],
      providerFailures: providerFail.data ?? [],
    };
  });
