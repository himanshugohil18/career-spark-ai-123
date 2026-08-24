import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { answerCareerQuestion, buildGrounding } from "@/lib/career-chat/chat.server";

export const listCareerChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const r = await supabase
      .from("career_chat_messages")
      .select("id, role, content, ai_model, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (r.error) throw new Error(`Could not load chat: ${r.error.message}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (r.data ?? []).map((row: any) => ({
      id: String(row.id),
      role: row.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: String(row.content ?? ""),
      aiModel: (row.ai_model as string | null) ?? null,
      createdAt: String(row.created_at),
    }));
  });

export const sendCareerChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        message: z.string().trim().min(2).max(2000),
        jobId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const priorRows = await supabase
      .from("career_chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(200);
    const history = (priorRows.data ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((row: any) => ({
        role: row.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: String(row.content ?? ""),
      }))
      .filter((m: { content: string }) => m.content.length > 0);

    const grounding = await buildGrounding(supabase, userId);

    const userInsert = await supabase
      .from("career_chat_messages")
      .insert({
        user_id: userId,
        role: "user",
        content: data.message,
        job_id: data.jobId ?? null,
      } as never)
      .select("id, created_at")
      .single();
    if (userInsert.error) throw new Error(`Could not save message: ${userInsert.error.message}`);

    const { answer, model } = await answerCareerQuestion({
      grounding,
      history,
      question: data.message,
    });

    const assistantInsert = await supabase
      .from("career_chat_messages")
      .insert({
        user_id: userId,
        role: "assistant",
        content: answer,
        job_id: data.jobId ?? null,
        ai_model: model,
        grounding: {
          brainReady: grounding.brainReady,
          matches: grounding.topMatches.length,
          pipeline: grounding.pipeline.length,
          resumes: grounding.resumes.length,
        } as never,
      } as never)
      .select("id, created_at")
      .single();
    if (assistantInsert.error) throw new Error(`Could not save reply: ${assistantInsert.error.message}`);

    return {
      user: {
        id: String(userInsert.data.id),
        role: "user" as const,
        content: data.message,
        createdAt: String(userInsert.data.created_at),
      },
      assistant: {
        id: String(assistantInsert.data.id),
        role: "assistant" as const,
        content: answer,
        aiModel: model,
        createdAt: String(assistantInsert.data.created_at),
      },
    };
  });

export const clearCareerChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const del = await supabase.from("career_chat_messages").delete().eq("user_id", userId);
    if (del.error) throw new Error(`Could not clear chat: ${del.error.message}`);
    return { ok: true };
  });
