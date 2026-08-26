/**
 * Salary & market analytics — server-only.
 * Aggregates the live jobs dataset into percentile bands, remote split,
 * top locations, experience-level pay, and visa-sponsorship signals.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type Ctx = { supabase: SupabaseClient<any>; userId: string };

function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export async function getSalaryAnalytics(c: Ctx) {
  const { data: profile } = await c.supabase
    .from("profiles")
    .select("preferred_role, current_title, expected_salary, location")
    .eq("user_id", c.userId)
    .maybeSingle();

  const role = profile?.preferred_role || profile?.current_title || null;

  // Pull a broad sample of active jobs with salary data.
  let query = c.supabase
    .from("jobs")
    .select("title, location, location_country, remote_status, experience_level, salary_min, salary_max, salary_currency, description")
    .eq("is_active", true)
    .not("salary_max", "is", null)
    .order("posted_at", { ascending: false })
    .limit(2000);

  const { data: allJobs } = await query;

  const jobs = (allJobs ?? []) as any[];
  const roleJobs = role
    ? jobs.filter((j) => {
        const t = `${j.title}`.toLowerCase();
        return role
          .toLowerCase()
          .split(/[^a-z0-9+#]+/i)
          .filter((w: string) => w.length > 2)
          .some((w: string) => t.includes(w));
      })
    : [];

  const sample = roleJobs.length >= 8 ? roleJobs : jobs;

  const maxima = sample.map((j) => Number(j.salary_max)).filter((n) => n > 0).sort((a, b) => a - b);
  const minima = sample.map((j) => Number(j.salary_min)).filter((n) => n > 0).sort((a, b) => a - b);
  const currency = sample.find((j) => j.salary_currency)?.salary_currency ?? "USD";

  const remoteCount = sample.filter((j) => j.remote_status === "remote").length;
  const hybridCount = sample.filter((j) => j.remote_status === "hybrid").length;

  const countryMap = new Map<string, { count: number; total: number }>();
  for (const j of sample) {
    const key = j.location_country || j.location || "Unknown";
    const cur = countryMap.get(key) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(j.salary_max ?? 0);
    countryMap.set(key, cur);
  }
  const topLocations = [...countryMap.entries()]
    .map(([location, v]) => ({ location, count: v.count, avgMax: Math.round(v.total / v.count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const levelMap = new Map<string, { count: number; total: number }>();
  for (const j of sample) {
    const key = j.experience_level && j.experience_level !== "unknown" ? j.experience_level : null;
    if (!key) continue;
    const cur = levelMap.get(key) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(j.salary_max ?? 0);
    levelMap.set(key, cur);
  }
  const levelOrder = ["intern", "entry", "junior", "mid", "senior", "staff", "principal", "lead", "executive"];
  const byLevel = [...levelMap.entries()]
    .map(([level, v]) => ({ level, count: v.count, avgMax: Math.round(v.total / v.count) }))
    .sort((a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level));

  const visaJobs = sample.filter((j) => /visa|sponsorship|relocation/i.test(j.description ?? ""));
  const relocationJobs = sample.filter((j) => /relocation (assistance|package|support)/i.test(j.description ?? ""));

  // Expected salary positioning
  let positioning: { expected: number; percentileOfMarket: number; verdict: string } | null = null;
  const expectedNum = profile?.expected_salary
    ? Number(String(profile.expected_salary).replace(/[^0-9.]/g, "")) *
      (/k/i.test(String(profile.expected_salary)) ? 1000 : 1)
    : NaN;
  if (Number.isFinite(expectedNum) && expectedNum > 0 && maxima.length >= 5) {
    const below = maxima.filter((m) => m < expectedNum).length;
    const pct = Math.round((below / maxima.length) * 100);
    positioning = {
      expected: expectedNum,
      percentileOfMarket: pct,
      verdict:
        pct <= 25
          ? "Your expectation is below most of the market — you may be underpricing yourself."
          : pct <= 60
            ? "Your expectation sits comfortably within the market band."
            : pct <= 85
              ? "Your expectation is above the typical band — target senior titles or higher-paying markets."
              : "Your expectation is above nearly all current postings — widen the role family or location scope.",
    };
  }

  return {
    role,
    matchedOnRole: roleJobs.length >= 8,
    sampleSize: sample.length,
    currency,
    bands: {
      p25: percentile(maxima, 25),
      median: percentile(maxima, 50),
      p75: percentile(maxima, 75),
      p90: percentile(maxima, 90),
      minMedian: percentile(minima, 50),
    },
    remote: {
      remote: remoteCount,
      hybrid: hybridCount,
      onsite: Math.max(0, sample.length - remoteCount - hybridCount),
      remotePct: sample.length ? Math.round((remoteCount / sample.length) * 100) : 0,
    },
    topLocations,
    byLevel,
    visa: {
      sponsorshipCount: visaJobs.length,
      relocationCount: relocationJobs.length,
      sponsorshipPct: sample.length ? Math.round((visaJobs.length / sample.length) * 100) : 0,
    },
    positioning,
  };
}
