import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  OUTREACH_KINDS,
  OUTREACH_TONES,
  generateOutreach,
  loadOutreachJob,
} from "@/lib/outreach/generate.server";

export const listOutreachMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const r = await supabase
      .from("outreach_messages")
      .select("id, kind, tone, subject, body, recipient, job_id, ai_model, sent_at, created_at, jobs(title, companies(name))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(60);
    if (r.error) throw new Error(`Could not load messages: ${r.error.message}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (r.data ?? []).map((row: any) => ({
      id: String(row.id),
      kind: String(row.kind),
      tone: String(row.tone),
      subject: (row.subject as string | null) ?? null,
      body: String(row.body ?? ""),
      recipient: (row.recipient as string | null) ?? null,
      jobId: (row.job_id as string | null) ?? null,
      jobTitle: (row.jobs?.title as string | null) ?? null,
      companyName: (row.jobs?.companies?.name as string | null) ?? null,
      aiModel: (row.ai_model as string | null) ?? null,
      sentAt: (row.sent_at as string | null) ?? null,
      createdAt: String(row.created_at),
    }));
  });

export const createOutreachMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        kind: z.enum(OUTREACH_KINDS),
        tone: z.enum(OUTREACH_TONES).default("professional"),
        jobId: z.string().uuid().optional(),
        recipient: z.string().trim().max(160).optional(),
        extraContext: z.string().trim().max(1200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const job = data.jobId ? await loadOutreachJob(supabase, data.jobId) : null;
    const result = await generateOutreach({
      supabase,
      userId,
      kind: data.kind,
      tone: data.tone,
      recipient: data.recipient ?? null,
      job,
      extraContext: data.extraContext ?? null,
    });
    const ins = await supabase
      .from("outreach_messages")
      .insert({
        user_id: userId,
        job_id: data.jobId ?? null,
        kind: data.kind,
        tone: data.tone,
        subject: result.subject,
        body: result.body,
        recipient: data.recipient ?? null,
        ai_model: result.model,
      } as never)
      .select("id")
      .single();
    if (ins.error) throw new Error(`Could not save message: ${ins.error.message}`);
    return {
      id: ins.data.id as string,
      subject: result.subject,
      body: result.body,
    };
  });

export const updateOutreachMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        subject: z.string().max(200).nullish(),
        body: z.string().max(20_000).optional(),
        recipient: z.string().max(160).nullish(),
        markSent: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.subject !== undefined) patch.subject = data.subject;
    if (data.body !== undefined) patch.body = data.body;
    if (data.recipient !== undefined) patch.recipient = data.recipient;
    if (data.markSent !== undefined) patch.sent_at = data.markSent ? new Date().toISOString() : null;
    const up = await supabase
      .from("outreach_messages")
      .update(patch as never)
      .eq("id", data.id)
      .eq("user_id", userId);
    if (up.error) throw new Error(`Could not update message: ${up.error.message}`);
    return { ok: true };
  });

export const deleteOutreachMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const del = await supabase
      .from("outreach_messages")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (del.error) throw new Error(`Could not delete message: ${del.error.message}`);
    return { ok: true };
  });
