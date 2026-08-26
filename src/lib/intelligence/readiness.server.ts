/**
 * Career Readiness Score — deterministic, real-data scoring engine.
 * Every category is computed from actual CareerOS tables. Where data is
 * missing the category scores low with an explanation, never a fake number.
 */

import type { CareerBrainSnapshot } from "../career-brain.service";

export type ReadinessCategory = {
  key: string;
  label: string;
  score: number; // 0-100
  weight: number; // 0-1, sums to 1
  explanation: string;
  recommendation: string | null;
  source: string;
};

export type HighestImpactAction = {
  title: string;
  detail: string;
  estimatedImpact: number; // projected points, clearly an estimate
  link: string;
};

export type CareerReadiness = {
  overall: number;
  categories: ReadinessCategory[];
  highestImpactAction: HighestImpactAction | null;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function computeCareerReadiness(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  brain: CareerBrainSnapshot,
): Promise<CareerReadiness> {
  const [matches, applications, interviewPacks, mockInterviews, roadmapItems] = await Promise.all([
    supabase
      .from("job_matches")
      .select("overall_score")
      .eq("user_id", userId)
      .order("overall_score", { ascending: false })
      .limit(5),
    supabase
      .from("application_workspaces")
      .select("id, status, current_stage, created_at")
      .eq("user_id", userId),
    supabase.from("interview_sessions").select("id, completed_questions, total_questions, created_at").eq("user_id", userId),
    supabase.from("interview_sim_sessions").select("id, status, answered_questions, planned_questions, created_at").eq("user_id", userId),
    supabase.from("career_roadmap_items").select("id, status").eq("user_id", userId),
  ]);

  // --- Profile completeness (from brain metadata, already computed) ---
  const completeness = brain.metadata.completenessScore ?? 0;
  const profileCat: ReadinessCategory = {
    key: "profile",
    label: "Profile Completeness",
    score: clamp(completeness),
    weight: 0.12,
    explanation:
      completeness >= 80
        ? "Your profile links, preferences and summary are well filled in."
        : "Your profile is missing links, preferences, or a professional summary.",
    recommendation:
      completeness >= 80 ? null : "Complete the missing profile fields in your Career Brain profile.",
    source: "profiles",
  };

  // --- Resume quality ---
  const hasResume = Boolean(brain.metadata.resumeId);
  const confidence = brain.metadata.overallConfidence;
  const resumeScore = !hasResume ? 0 : confidence != null ? clamp(confidence) : 55;
  const resumeCat: ReadinessCategory = {
    key: "resume",
    label: "Resume Quality",
    score: resumeScore,
    weight: 0.16,
    explanation: !hasResume
      ? "No active resume found. Your resume is the foundation of every match."
      : confidence != null
        ? `Your active resume parsed with ${clamp(confidence)}% extraction confidence.`
        : "Your resume is active. Run an ATS analysis against a job to measure quality precisely.",
    recommendation: !hasResume
      ? "Upload and approve your resume to unlock matching and analysis."
      : "Open Resume Studio and tailor a version for your target role.",
    source: "resume_versions",
  };

  // --- Skills ---
  const skillCount = brain.skills.length;
  const verified = brain.skills.filter((s) => s.userVerified).length;
  const avgConfidence =
    skillCount > 0
      ? brain.skills.reduce((sum, s) => sum + (s.confidence ?? 60), 0) / skillCount
      : 0;
  const skillsScore =
    skillCount === 0 ? 0 : clamp(Math.min(100, skillCount * 7) * 0.6 + avgConfidence * 0.3 + Math.min(verified * 4, 10));
  const skillsCat: ReadinessCategory = {
    key: "skills",
    label: "Skills",
    score: skillsScore,
    weight: 0.16,
    explanation:
      skillCount === 0
        ? "No skills detected yet. Skills are extracted from your approved resume."
        : `${skillCount} skills on record (${verified} verified by you).`,
    recommendation:
      skillCount === 0
        ? "Approve your resume so CareerOS can extract your skills."
        : "Review and verify your extracted skills, and close gaps from job analyses.",
    source: "skills",
  };

  // --- Projects ---
  const projectCount = brain.projects?.length ?? 0;
  const projectsScore = clamp(projectCount * 25);
  const projectsCat: ReadinessCategory = {
    key: "projects",
    label: "Projects",
    score: projectsScore,
    weight: 0.12,
    explanation:
      projectCount === 0
        ? "No projects on record. Projects are the strongest proof of skill depth."
        : `${projectCount} project${projectCount === 1 ? "" : "s"} demonstrate your applied experience.`,
    recommendation:
      projectCount >= 3
        ? null
        : "Build a project that covers your top missing skill — see Project Recommendations.",
    source: "projects",
  };

  // --- Market alignment (top job matches) ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchScores = (matches.data ?? []).map((m: any) => Number(m.overall_score ?? 0));
  const marketScore =
    matchScores.length === 0
      ? 0
      : clamp(matchScores.reduce((a: number, b: number) => a + b, 0) / matchScores.length);
  const marketCat: ReadinessCategory = {
    key: "market",
    label: "Market Alignment",
    score: marketScore,
    weight: 0.16,
    explanation:
      matchScores.length === 0
        ? "No job matches computed yet, so market alignment cannot be measured."
        : `Your top ${matchScores.length} job match${matchScores.length === 1 ? "" : "es"} average ${marketScore}%.`,
    recommendation:
      matchScores.length === 0
        ? "Set your preferred role and run job matching to measure market fit."
        : marketScore < 70
          ? "Review what's missing in your top matches and close the largest skill gap."
          : null,
    source: "job_matches",
  };

  // --- Application activity ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apps = (applications.data ?? []) as any[];
  const appScore = clamp(apps.length * 20);
  const activityCat: ReadinessCategory = {
    key: "activity",
    label: "Application Activity",
    score: appScore,
    weight: 0.12,
    explanation:
      apps.length === 0
        ? "No applications tracked yet. Applying is the only activity that produces offers."
        : `${apps.length} application${apps.length === 1 ? "" : "s"} in your workspace.`,
    recommendation:
      apps.length === 0
        ? "Save a strong match and start your first application workspace."
        : apps.length < 5
          ? "Apply to more high-match roles to improve your response odds."
          : null,
    source: "application_workspaces",
  };

  // --- Interview readiness ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessions = [...((interviewPacks.data ?? []) as any[]), ...((mockInterviews.data ?? []) as any[])];
  const completedSessions = sessions.filter((s) => {
    if (typeof s.status === "string") return s.status === "completed";
    return Number(s.completed_questions ?? 0) >= Number(s.total_questions ?? 1);
  }).length;
  const interviewScore = clamp(sessions.length * 18 + completedSessions * 12);
  const interviewCat: ReadinessCategory = {
    key: "interview",
    label: "Interview Readiness",
    score: interviewScore,
    weight: 0.08,
    explanation:
      sessions.length === 0
        ? "No interview practice sessions yet."
        : `${sessions.length} interview session${sessions.length === 1 ? "" : "s"} started, with ${completedSessions} completed.`,
    recommendation:
      sessions.length === 0
        ? "Run an AI interview simulation for your target role."
        : sessions.length < 3
          ? "Practice a technical and a behavioral round before your next interview."
          : null,
    source: "interview_sessions + interview_sim_sessions",
  };

  // --- Learning progress (roadmap completion) ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (roadmapItems.data ?? []) as any[];
  const done = items.filter((i) => i.status === "completed").length;
  const learningScore = items.length === 0 ? 0 : clamp((done / items.length) * 100);
  const learningCat: ReadinessCategory = {
    key: "learning",
    label: "Learning Progress",
    score: learningScore,
    weight: 0.08,
    explanation:
      items.length === 0
        ? "No career roadmap yet. A roadmap turns skill gaps into a plan."
        : `${done} of ${items.length} roadmap items completed.`,
    recommendation:
      items.length === 0
        ? "Generate your Career Roadmap toward your target role."
        : done < items.length
          ? "Complete your next in-progress roadmap item."
          : null,
    source: "career_roadmap_items",
  };

  const categories = [
    profileCat,
    resumeCat,
    skillsCat,
    projectsCat,
    marketCat,
    activityCat,
    interviewCat,
    learningCat,
  ];
  const overall = clamp(categories.reduce((sum, c) => sum + c.score * c.weight, 0));

  // Highest impact = lowest scoring category with a recommendation, weighted.
  const sorted = [...categories]
    .filter((c) => c.recommendation)
    .sort((a, b) => a.score * a.weight - b.score * b.weight);
  const weakest = sorted[0];
  const linkByKey: Record<string, string> = {
    profile: "/profile",
    resume: "/resumes",
    skills: "/me",
    projects: "/roadmap",
    market: "/jobs",
    activity: "/jobs",
    interview: "/interview",
    learning: "/roadmap",
  };
  const highestImpactAction: HighestImpactAction | null = weakest
    ? {
        title: weakest.recommendation!,
        detail: `${weakest.label} is currently your weakest area at ${weakest.score}/100.`,
        estimatedImpact: Math.max(1, Math.round(((100 - weakest.score) * weakest.weight) / 4)),
        link: linkByKey[weakest.key] ?? "/dashboard",
      }
    : null;

  return { overall, categories, highestImpactAction };
}
