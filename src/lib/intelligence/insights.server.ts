/**
 * Career Insights — computed from real aggregates only. Every insight cites
 * the data it came from. When there isn't enough data, we say so.
 */

export type CareerInsight = {
  icon: "skill" | "match" | "resume" | "application";
  text: string;
};

export type InsightsResult = {
  insights: CareerInsight[];
  insufficientData: boolean;
  guidance: string | null;
};

const norm = (s: string) => s.toLowerCase().trim();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function computeCareerInsights(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  userSkills: string[],
): Promise<InsightsResult> {
  const [matches, apps, gaps] = await Promise.all([
    supabase
      .from("job_matches")
      .select("overall_score, job:jobs(title, required_skills, preferred_skills)")
      .eq("user_id", userId)
      .order("overall_score", { ascending: false })
      .limit(10),
    supabase
      .from("application_workspaces")
      .select("id, current_stage, status")
      .eq("user_id", userId),
    supabase
      .from("gap_analysis")
      .select("missing, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const insights: CareerInsight[] = [];
  const owned = new Set(userSkills.map(norm));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchRows = (matches.data ?? []) as any[];

  // Insight 1: which of the user's skills appears most in strong matches
  if (matchRows.length >= 3) {
    const freq = new Map<string, number>();
    for (const m of matchRows) {
      const skills = [...(m.job?.required_skills ?? []), ...(m.job?.preferred_skills ?? [])];
      for (const s of skills) {
        const n = norm(String(s));
        if (owned.has(n)) freq.set(String(s), (freq.get(String(s)) ?? 0) + 1);
      }
    }
    const top = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2) {
      const pct = Math.round((top[1] / matchRows.length) * 100);
      insights.push({
        icon: "skill",
        text: `Your ${top[0]} skill appears in ${pct}% of your strongest job matches.`,
      });
    }
  }

  // Insight 2: biggest recurring gap across matches
  if (matchRows.length >= 3) {
    const miss = new Map<string, number>();
    for (const m of matchRows) {
      const skills = [...(m.job?.required_skills ?? []), ...(m.job?.preferred_skills ?? [])];
      for (const s of skills) {
        const n = norm(String(s));
        if (n && !owned.has(n)) miss.set(String(s), (miss.get(String(s)) ?? 0) + 1);
      }
    }
    const top = [...miss.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2) {
      insights.push({
        icon: "skill",
        text: `${top[0]} is currently the largest skill gap across your top matches (missing in ${top[1]} of them).`,
      });
    }
  }

  // Insight 3: high-match prioritization
  const high = matchRows.filter((m) => Number(m.overall_score ?? 0) >= 85).length;
  if (high > 0) {
    insights.push({
      icon: "match",
      text: `You have ${high} job${high === 1 ? "" : "s"} matching above 85% — prioritize ${high === 1 ? "it" : "them"} this week.`,
    });
  }

  // Insight 4: application funnel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appRows = (apps.data ?? []) as any[];
  if (appRows.length >= 3) {
    const responded = appRows.filter((a) =>
      ["assessment", "interview", "offer", "rejected"].includes(a.current_stage ?? a.status ?? ""),
    ).length;
    const rate = Math.round((responded / appRows.length) * 100);
    insights.push({
      icon: "application",
      text: `Your current response rate is ${rate}% across ${appRows.length} applications.`,
    });
  }

  // Insight 5: recurring gap from AI analyses
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gapRows = (gaps.data ?? []) as any[];
  if (gapRows.length >= 2) {
    const freq = new Map<string, number>();
    for (const g of gapRows) {
      for (const m of Array.isArray(g.missing) ? g.missing : []) {
        const name = m?.skill ?? m?.name;
        if (name) freq.set(String(name), (freq.get(String(name)) ?? 0) + 1);
      }
    }
    const top = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2) {
      insights.push({
        icon: "skill",
        text: `${top[0]} has appeared as a gap in ${top[1]} of your recent job analyses — closing it compounds.`,
      });
    }
  }

  const insufficientData = insights.length === 0;
  return {
    insights,
    insufficientData,
    guidance: insufficientData
      ? "CareerOS needs more of your data to generate insights. Approve a resume, set your preferred role, and save or analyze a few jobs."
      : null,
  };
}
