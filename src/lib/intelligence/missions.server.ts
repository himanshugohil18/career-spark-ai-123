/**
 * Daily Career Missions — derived from the Next Best Action engine, persisted
 * per day, and completion is verified against real activity (applications
 * created, interview answers, roadmap items completed). Never self-marks.
 */

import type { NextAction } from "./next-action.server";

export type Mission = {
  id: string;
  title: string;
  kind: string;
  targetCount: number;
  completedCount: number;
  status: "pending" | "completed";
  link: string | null;
};

function missionFor(action: NextAction): { title: string; kind: string; link: string } | null {
  switch (action.kind) {
    case "apply":
      return { title: `Apply to 1 strong match`, kind: "apply", link: "/jobs" };
    case "skill_gap":
      return { title: action.title.replace("Learn ", "Start learning "), kind: "learning", link: "/learning" };
    case "interview":
      return { title: "Practice interview questions", kind: "interview", link: "/interview" };
    case "follow_up":
      return { title: action.title, kind: "follow_up", link: action.link };
    case "roadmap":
      return { title: "Complete 1 roadmap item", kind: "roadmap", link: "/roadmap" };
    default:
      return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTodayMissions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  actions: NextAction[],
): Promise<Mission[]> {
  const today = new Date().toISOString().slice(0, 10);

  const existing = await supabase
    .from("career_missions")
    .select("*")
    .eq("user_id", userId)
    .eq("mission_date", today);

  let rows = (existing.data ?? []) as Array<Record<string, unknown>>;

  if (rows.length === 0 && actions.length > 0) {
    const seeds = actions
      .map(missionFor)
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .slice(0, 3)
      .map((m) => ({
        user_id: userId,
        mission_date: today,
        title: m.title,
        kind: m.kind,
        target_count: 1,
        completed_count: 0,
        status: "pending",
        link: m.link,
      }));
    if (seeds.length > 0) {
      const inserted = await supabase.from("career_missions").upsert(seeds, {
        onConflict: "user_id,mission_date,title",
      }).select("*");
      rows = (inserted.data ?? []) as Array<Record<string, unknown>>;
    }
  }

  // Verify completion against real activity today
  const startOfDay = `${today}T00:00:00.000Z`;
  const [appsToday, interviewsToday, roadmapToday] = await Promise.all([
    supabase
      .from("application_workspaces")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startOfDay),
    supabase
      .from("interview_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startOfDay),
    supabase
      .from("career_roadmap_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("updated_at", startOfDay),
  ]);

  const realCounts: Record<string, number> = {
    apply: appsToday.count ?? 0,
    interview: interviewsToday.count ?? 0,
    roadmap: roadmapToday.count ?? 0,
  };

  const missions: Mission[] = [];
  for (const r of rows) {
    const kind = String(r.kind);
    const verified = realCounts[kind];
    const completedCount =
      verified != null ? Math.min(Number(r.target_count ?? 1), verified) : Number(r.completed_count ?? 0);
    const target = Number(r.target_count ?? 1);
    const status = completedCount >= target ? "completed" : "pending";
    if (status !== r.status || completedCount !== r.completed_count) {
      await supabase
        .from("career_missions")
        .update({ completed_count: completedCount, status })
        .eq("id", r.id);
    }
    missions.push({
      id: String(r.id),
      title: String(r.title),
      kind,
      targetCount: target,
      completedCount,
      status: status as Mission["status"],
      link: (r.link as string | null) ?? null,
    });
  }
  return missions;
}
