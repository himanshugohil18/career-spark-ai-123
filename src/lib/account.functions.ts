import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Recent login history for the current user. */
export const listLoginEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("login_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const LoginEventInput = z.object({
  event_type: z.string().max(40).default("sign_in"),
  provider: z.string().max(40).nullable().optional(),
  user_agent: z.string().max(500).nullable().optional(),
});

export const recordLoginEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => LoginEventInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("login_events").insert({
      user_id: userId,
      event_type: data.event_type,
      provider: data.provider ?? null,
      user_agent: data.user_agent ?? null,
    });
    return { ok: true };
  });

/** Sign out of ALL devices (revoke all refresh tokens for this user). */
export const signOutEverywhere = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.signOut(userId, "global");
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("login_events").insert({
      user_id: userId,
      event_type: "sign_out_everywhere",
    });
    return { ok: true };
  });

/** Signed URL for the user's own private avatar. */
export const getAvatarUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ path: z.string().min(1).max(300) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: signed, error } = await supabase.storage
      .from("avatars")
      .createSignedUrl(data.path, 60 * 60);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
