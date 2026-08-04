import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to realtime changes across the tables that feed multiple
 * modules (Career Brain, Jobs, Interview, Coach, Learning, Analytics)
 * and invalidates the corresponding query keys so every open view
 * refreshes automatically — no manual reload needed.
 */
export function useCrossModuleSync() {
  const qc = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id ?? null;
      if (!userId) return;
      if (cancelled) return;

      const invalidate = (keys: string[]) => {
        for (const k of keys) void qc.invalidateQueries({ queryKey: [k] });
      };

      channel = supabase
        .channel(`cross-module-${userId}-${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "job_matches", filter: `user_id=eq.${userId}` },
          () => invalidate(["jobs-feed", "job-sections", "career-analytics", "coach-briefing", "learning-paths"]),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "saved_jobs", filter: `user_id=eq.${userId}` },
          () => invalidate(["saved-jobs", "jobs-feed", "job-sections", "career-analytics"]),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "application_workspaces", filter: `user_id=eq.${userId}` },
          () => invalidate(["career-analytics", "agent-activity", "interview-hub", "coach-briefing"]),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "interview_questions", filter: `user_id=eq.${userId}` },
          () => invalidate(["interview-hub", "career-analytics", "coach-briefing"]),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "interview_sessions", filter: `user_id=eq.${userId}` },
          () => invalidate(["interview-hub", "career-analytics"]),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "career_brain", filter: `user_id=eq.${userId}` },
          () => qc.invalidateQueries(),
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [qc]);
}
