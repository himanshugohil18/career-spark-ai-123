import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

/** Public, unauthenticated read of a shared profile by handle. */
export const getPublicProfile = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        handle: z
          .string()
          .min(3)
          .max(40)
          .regex(/^[a-z0-9-]+$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabasePublic = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: profile } = await supabasePublic
      .from("profiles")
      .select(
        "full_name, current_title, professional_summary, location, avatar_url, linkedin_url, github_url, portfolio_url, website_url, years_of_experience",
      )
      .ilike("public_handle", data.handle)
      .eq("is_public", true)
      .maybeSingle();
    if (!profile) return null;
    return profile;
  });

/** Owner-side: update sharing settings (handle + on/off switch). */
export const updateSharingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        isPublic: z.boolean(),
        handle: z
          .string()
          .min(3)
          .max(40)
          .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only")
          .nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.isPublic && !data.handle) throw new Error("Pick a public handle before enabling sharing.");
    if (data.handle) {
      const { data: clash } = await context.supabase
        .from("profiles")
        .select("user_id")
        .ilike("public_handle", data.handle)
        .maybeSingle();
      if (clash && clash.user_id !== context.userId) throw new Error("That handle is taken. Try another.");
    }
    const { error } = await context.supabase
      .from("profiles")
      .update({ is_public: data.isPublic, public_handle: data.handle })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, url: data.handle ? `/p/${data.handle}` : null };
  });
