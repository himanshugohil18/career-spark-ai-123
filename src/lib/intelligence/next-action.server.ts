/**
 * Next Best Action engine — ranks what the user should do next from real
 * data: top unapplied matches, stale applications, skill gaps, upcoming
 * interviews and the active roadmap. Never fabricates actions.
 */

export type NextAction = {
  kind: "apply" | "follow_up" | "skill_gap" | "interview" | "roadmap" | "resume";
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
  link: string;
};

const DAY = 24 * 60 * 60 * 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getNextBestActions(supabase: any, userId: string): Promise<NextAction[]> {
  const staleBefore = new Date(Date.now() - 7 * DAY).toISOString();

  const [topMatches, staleApps, gaps, interviews, roadmapNext, brain] = await Promise.all([
    supabase
      .from("job_matches")
      .select("overall_score, job:jobs(id, title, company:companies(name))")
      .eq("user_id", userId)
      .order("overall_score", { ascending: false })
      .limit(10),
    supabase
      .from("application_workspaces")
      .select("id, current_stage, status, updated_at, job:jobs(title, company:companies(name))")
      .eq("user_id", userId)
      .lt("updated_at", staleBefore)
      .limit(5),
    supabase
      .from("gap_analysis")
      .select("missing, high_priority, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("interview_sessions")
      .select("id, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("career_roadmap_items")
      .select("id, title, item_type, status, phase")
      .eq("user_id", userId)
      .in("status", ["in_progress", "not_started"])
      .order("phase", { ascending: true })
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from("career_brain").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);

  const actions: NextAction[] = [];

  if (!brain.data) {
    actions.push({
      kind: "resume",
      priority: "high",
      title: "Upload your resume",
      detail: "Your Career Brain is empty. Everything in CareerOS starts from your resume.",
      link: "/resumes",
    });
    return actions;
  }

  // Top unapplied match
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matches = (topMatches.data ?? []) as any[];
  const best = matches.find((m) => Number(m.overall_score ?? 0) >= 70 && m.job?.id);
  if (best) {
    const company = best.job?.company?.name ? ` at ${best.job.company.name}` : "";
    actions.push({
      kind: "apply",
      priority: Number(best.overall_score) >= 85 ? "high" : "medium",
      title: `Apply to ${best.job.title}${company}`,
      detail: `Match score ${Math.round(Number(best.overall_score))}% — one of your strongest current matches.`,
      link: `/jobs/${best.job.id}`,
    });
  }

  // Stale applications → follow-up
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stale = ((staleApps.data ?? []) as any[]).filter((a) =>
    ["applied", "assessment"].includes(a.current_stage ?? a.status ?? ""),
  );
  if (stale.length > 0) {
    const first = stale[0];
    const company = first.job?.company?.name ?? first.job?.title ?? "a company";
    actions.push({
      kind: "follow_up",
      priority: "high",
      title: `Follow up with ${company}`,
      detail: `You applied over 7 days ago and have not recorded a response.${
        stale.length > 1 ? ` ${stale.length - 1} more application${stale.length > 2 ? "s" : ""} also need follow-up.` : ""
      }`,
      link: `/applications/${first.id}`,
    });
  }

  // Largest skill gap
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gap = gaps.data as any;
  const highPriority = Array.isArray(gap?.high_priority) ? gap.high_priority : [];
  const missing = Array.isArray(gap?.missing) ? gap.missing : [];
  const topGap = highPriority[0]?.skill ?? missing.find((m: { impact?: string }) => m.impact === "high")?.skill ?? missing[0]?.skill;
  if (topGap) {
    actions.push({
      kind: "skill_gap",
      priority: "medium",
      title: `Learn ${topGap}`,
      detail: "This is currently your highest-impact skill gap across analyzed jobs.",
      link: "/learning",
    });
  }

  // Interview practice
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inProgressInterview = ((interviews.data ?? []) as any[]).find((s) =>
    ["in_progress", "active", "started"].includes(s.status ?? ""),
  );
  if (inProgressInterview) {
    actions.push({
      kind: "interview",
      priority: "medium",
      title: "Finish your interview practice session",
      detail: "You have an unfinished AI interview session.",
      link: "/interview",
    });
  }

  // Next roadmap item
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roadmapItem = roadmapNext.data as any;
  if (roadmapItem) {
    actions.push({
      kind: "roadmap",
      priority: "low",
      title: `Continue roadmap: ${roadmapItem.title}`,
      detail: `Phase ${roadmapItem.phase} of your career roadmap.`,
      link: "/roadmap",
    });
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return actions.sort((a, b) => rank[a.priority] - rank[b.priority]).slice(0, 5);
}
