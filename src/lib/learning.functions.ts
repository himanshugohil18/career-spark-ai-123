import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getLearningProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("learning_progress")
      .select("skill, status")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).filter((r) => r.status === "completed").map((r) => r.skill.toLowerCase());
  });

export const toggleLearningSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ skill: z.string().min(1).max(120), completed: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.completed) {
      const { error } = await context.supabase
        .from("learning_progress")
        .upsert(
          { user_id: context.userId, skill: data.skill, status: "completed" },
          { onConflict: "user_id,skill" },
        );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("learning_progress")
        .delete()
        .eq("user_id", context.userId)
        .eq("skill", data.skill);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
