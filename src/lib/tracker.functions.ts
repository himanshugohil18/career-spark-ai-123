import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PIPELINE_STATUSES = [
  "saved",
  "preparing",
  "applied",
  "assessment",
  "interview",
  "offer",
  "rejected",
  "closed",
] as const;

export const listTrackedApplications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const r = await supabase
      .from("saved_jobs")
      .select(
        "id, job_id, status, notes, tags, applied_at, follow_up_at, status_changed_at, resume_version_id, created_at, updated_at, jobs(title, location, remote_status, application_url, is_active, companies(name))",
      )
      .eq("user_id", userId)
      .order("status_changed_at", { ascending: false })
      .limit(300);
    if (r.error) throw new Error(`Could not load applications: ${r.error.message}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (r.data ?? []).map((row: any) => ({
      id: String(row.id),
      jobId: String(row.job_id),
      status: String(row.status),
      notes: (row.notes as string | null) ?? null,
      tags: (row.tags as string[] | null) ?? [],
      appliedAt: (row.applied_at as string | null) ?? null,
      followUpAt: (row.follow_up_at as string | null) ?? null,
      statusChangedAt: String(row.status_changed_at ?? row.updated_at ?? row.created_at),
      resumeVersionId: (row.resume_version_id as string | null) ?? null,
      jobTitle: (row.jobs?.title as string | null) ?? null,
      companyName: (row.jobs?.companies?.name as string | null) ?? null,
      location: (row.jobs?.location as string | null) ?? null,
      remoteStatus: (row.jobs?.remote_status as string | null) ?? null,
      applicationUrl: (row.jobs?.application_url as string | null) ?? null,
      jobActive: Boolean(row.jobs?.is_active),
    }));
  });

export const updateTrackedApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(PIPELINE_STATUSES).optional(),
        notes: z.string().max(4000).nullish(),
        followUpAt: z.string().nullish(),
        resumeVersionId: z.string().uuid().nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: now };
    if (data.status !== undefined) {
      patch.status = data.status;
      patch.status_changed_at = now;
      if (data.status === "applied") patch.applied_at = now;
    }
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.followUpAt !== undefined) patch.follow_up_at = data.followUpAt;
    if (data.resumeVersionId !== undefined) patch.resume_version_id = data.resumeVersionId;

    const up = await supabase
      .from("saved_jobs")
      .update(patch as never)
      .eq("id", data.id)
      .eq("user_id", userId);
    if (up.error) throw new Error(`Could not update application: ${up.error.message}`);
    return { ok: true };
  });

export const removeTrackedApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const del = await supabase.from("saved_jobs").delete().eq("id", data.id).eq("user_id", userId);
    if (del.error) throw new Error(`Could not remove application: ${del.error.message}`);
    return { ok: true };
  });
